import { afterEach, describe, expect, it, vi } from 'vitest';
import { AmbrogioSession, type RequestEvents, type TurnOutcome } from './ambrogio-session.js';
import { ConversationChannel, MAX_REQUEST_SAMPLES } from './conversation-channel.js';
import { startFakeSessionServer, until } from '../../../test/support/fake-session-server.js';

const identity = { clientId: 'satellite-cucina', name: 'Cucina' };
const servers: Array<Awaited<ReturnType<typeof startFakeSessionServer>>> = [];
const channels: ConversationChannel[] = [];
afterEach(async () => {
  await Promise.all(channels.splice(0).map(channel => channel.close()));
  await Promise.all(servers.splice(0).map(server => server.close()));
});

async function server(options: Parameters<typeof startFakeSessionServer>[0] = {}) {
  const started = await startFakeSessionServer(options);
  servers.push(started);
  return started;
}

function channel(url: URL, lost = vi.fn()) {
  const created = new ConversationChannel({ url, identity, lost });
  channels.push(created);
  return created;
}

function recorder() {
  const log: Array<[string, ...unknown[]]> = [];
  const events: RequestEvents = {
    accepted: conversationId => log.push(['accepted', conversationId]),
    outputStart: (stream, content) => log.push(['outputStart', stream, content]),
    outputAudio: (stream, samples) => log.push(['outputAudio', stream, [...samples]]),
    outputEnd: stream => log.push(['outputEnd', stream]),
    outcome: (outcome: TurnOutcome) => log.push(['outcome', outcome]),
    rejectedByProtocol: code => log.push(['rejectedByProtocol', code]),
  };
  return { log, events };
}

/** Wait for a condition across event-loop turns, without timers, so that fake timers stay in control. */
async function turns(check: () => boolean): Promise<void> {
  for (let turn = 0; !check(); turn++) {
    if (turn > 100_000) throw new Error('Condition not reached');
    await new Promise(resolve => setImmediate(resolve));
  }
}

const starts = (session: { messages: Array<Record<string, unknown>> }) =>
  session.messages.filter(message => message.type === 'input.start');

describe('ambrogio.v1 session and conversation channel', () => {
  it('identifies the satellite and sends an audio request: reserve first, then frames, then input.end', async () => {
    const fake = await server();
    const opened = channel(fake.url);
    await opened.ensure();
    const session = fake.sessions[0]!;
    expect(session.socket.protocol).toBe('ambrogio.v1');
    expect(session.messages[0]).toEqual({ type: 'session.hello', clientId: 'satellite-cucina', name: 'Cucina' });

    const { events } = recorder();
    opened.startRequest(new Float32Array([0.5, -0.5, 1, -1]), events);
    expect(opened.isTransmitting).toBe(true);
    expect(opened.send(new Float32Array([0.25]))).toBe(true);
    opened.endRequest();
    expect(opened.isTransmitting).toBe(false);
    await until(() => session.messages.some(message => message.type === 'input.end'), 'input.end');

    const [start] = starts(session);
    expect(start).toEqual({ type: 'input.start', requestId: expect.any(String), stream: expect.any(Number),
      content: { type: 'audio', sampleRate: 16000 }, reply: 'audio' });
    expect(session.messages.at(-1)).toEqual({ type: 'input.end', requestId: start!.requestId });
    expect(session.frames.map(frame => frame.stream)).toEqual([start!.stream, start!.stream]);
    expect([...session.frames[0]!.samples]).toEqual([16384, -16384, 32767, -32768]);
    expect([...session.frames[1]!.samples]).toEqual([8192]);
  });

  it('continues the conversation of the previous turn until a new activation starts a new one', async () => {
    const fake = await server({ onMessage(session, message) {
      if (message.type !== 'input.end') return;
      session.send({ type: 'turn.accepted', requestId: message.requestId, conversationId: 'c1',
        turnId: `t${session.messages.length}`, text: 'ciao' });
    } });
    const opened = channel(fake.url);
    await opened.ensure();
    const session = fake.sessions[0]!;
    const first = recorder();
    opened.startRequest(new Float32Array(0), first.events);
    opened.endRequest();
    await until(() => first.log.some(([kind]) => kind === 'accepted'), 'first accepted');
    expect(first.log).toContainEqual(['accepted', 'c1']);

    opened.startRequest(new Float32Array(0), recorder().events);
    opened.endRequest();
    opened.newConversation();
    opened.startRequest(new Float32Array(0), recorder().events);
    opened.endRequest();
    await until(() => starts(session).length === 3, 'three requests');
    expect(starts(session).map(start => start.conversationId)).toEqual([undefined, 'c1', undefined]);
  });

  it('caps a request at 60 seconds of audio', async () => {
    const fake = await server();
    const opened = channel(fake.url);
    await opened.ensure();
    opened.startRequest(new Float32Array(MAX_REQUEST_SAMPLES - 100), recorder().events);
    expect(opened.send(new Float32Array(99))).toBe(true);
    expect(opened.send(new Float32Array(50))).toBe(false);
    expect(opened.send(new Float32Array(50))).toBe(false);
    opened.endRequest();
    const session = fake.sessions[0]!;
    await until(() => session.messages.some(message => message.type === 'input.end'), 'input.end');
    expect(session.frames.reduce((total, frame) => total + frame.samples.length, 0)).toBe(MAX_REQUEST_SAMPLES);
  });

  // Verification: Prova del messaggio pubblico dei turni rifiutati o falliti
  it('delivers output transmissions and every turn outcome of the current request', async () => {
    const outcomes: Array<Record<string, unknown>> = [
      { type: 'turn.completed', expectsReply: true },
      { type: 'turn.failed', message: 'Non riesco a completare la risposta.' },
      { type: 'turn.interrupted' },
    ];
    let turn = 0;
    const fake = await server({ onMessage(session, message) {
      if (message.type !== 'input.end') return;
      const requestId = message.requestId;
      if (turn === 3) {
        session.send({ type: 'output.start', requestId, stream: 9, content: { type: 'text' } });
        session.send({ type: 'output.chunk', stream: 9, text: 'Un altro turno è in corso.' });
        session.send({ type: 'output.end', stream: 9 });
        session.send({ type: 'output.start', requestId, stream: 10, content: { type: 'audio', sampleRate: 22050 } });
        session.sendAudio(10, [4, 5]);
        session.sendAudio(10, [6]);
        session.send({ type: 'output.end', stream: 10 });
        session.send({ type: 'turn.rejected', requestId, reason: 'occupied', message: 'Un altro turno è in corso.' });
        return;
      }
      const turnId = `t${turn}`;
      session.send({ type: 'turn.accepted', requestId, conversationId: 'c1', turnId, text: 'ciao' });
      session.send({ type: 'output.start', requestId, turnId, stream: 5, content: { type: 'audio', sampleRate: 22050 } });
      session.sendAudio(5, [1, -2, 3]);
      session.sendAudio(77, [9]);
      session.send({ type: 'output.end', stream: 5 });
      if (turn === 1) {
        // The public message of the failure, a second audio transmission of the admitted turn.
        session.send({ type: 'output.start', requestId, turnId, stream: 6, content: { type: 'audio', sampleRate: 22050 } });
        session.sendAudio(6, [7, 8]);
        session.send({ type: 'output.end', stream: 6 });
      }
      session.send({ ...outcomes[turn]!, turnId });
    } });
    const opened = channel(fake.url);
    await opened.ensure();
    const logs: Array<ReturnType<typeof recorder>['log']> = [];
    for (turn = 0; turn < 4; turn++) {
      const { log, events } = recorder();
      logs.push(log);
      opened.startRequest(new Float32Array(0), events);
      opened.endRequest();
      await until(() => log.some(([kind]) => kind === 'outcome'), `outcome ${turn}`);
    }
    expect(logs[0]).toEqual([
      ['accepted', 'c1'],
      ['outputStart', 5, { type: 'audio', sampleRate: 22050 }],
      ['outputAudio', 5, [1, -2, 3]],
      ['outputEnd', 5],
      ['outcome', { kind: 'completed', expectsReply: true }],
    ]);
    expect(logs[1]).toEqual([
      ['accepted', 'c1'],
      ['outputStart', 5, { type: 'audio', sampleRate: 22050 }],
      ['outputAudio', 5, [1, -2, 3]],
      ['outputEnd', 5],
      ['outputStart', 6, { type: 'audio', sampleRate: 22050 }],
      ['outputAudio', 6, [7, 8]],
      ['outputEnd', 6],
      ['outcome', { kind: 'failed' }],
    ]);
    expect(logs[2]!.at(-1)).toEqual(['outcome', { kind: 'interrupted' }]);
    expect(logs[3]).toEqual([
      ['outputStart', 9, { type: 'text' }],
      ['outputEnd', 9],
      ['outputStart', 10, { type: 'audio', sampleRate: 22050 }],
      ['outputAudio', 10, [4, 5]],
      ['outputAudio', 10, [6]],
      ['outputEnd', 10],
      ['outcome', { kind: 'rejected' }],
    ]);
  });

  it('reports session.error for the request and ignores server messages of an unknown type', async () => {
    const fake = await server({ onMessage(session, message) {
      if (message.type !== 'input.end') return;
      session.send({ type: 'player.play', id: 'action-1', title: 'canzone' });
      session.send({ type: 'notice.info', text: 'ignorato' });
      session.send({ type: 'session.error', code: 'invalid_message', message: 'Invalid message.',
        requestId: message.requestId });
    } });
    const opened = channel(fake.url);
    await opened.ensure();
    const { log, events } = recorder();
    opened.startRequest(new Float32Array(0), events);
    opened.endRequest();
    await until(() => log.length > 0, 'protocol error');
    expect(log).toEqual([['rejectedByProtocol', 'invalid_message']]);
    const session = fake.sessions[0]!;
    expect(session.messages.filter(message => message.type === 'client.result')).toEqual([]);
  });

  it('ignores events of a forgotten request', async () => {
    let release!: () => void;
    const hold = new Promise<void>(resolve => { release = resolve; });
    const fake = await server({ onMessage(session, message) {
      if (message.type !== 'input.end') return;
      void hold.then(() => {
        session.send({ type: 'turn.accepted', requestId: message.requestId, conversationId: 'c9', turnId: 't9', text: 'x' });
        session.send({ type: 'turn.completed', turnId: 't9', expectsReply: false });
      });
    } });
    const opened = channel(fake.url);
    await opened.ensure();
    const { log, events } = recorder();
    opened.startRequest(new Float32Array(0), events);
    opened.endRequest();
    await until(() => fake.sessions[0]!.messages.some(message => message.type === 'input.end'), 'input.end');
    opened.forgetRequest();
    release();
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(log).toEqual([]);
    // The forgotten turn's conversation is not adopted either.
    opened.startRequest(new Float32Array(0), recorder().events);
    opened.endRequest();
    await until(() => starts(fake.sessions[0]!).length === 2, 'second request');
    expect(starts(fake.sessions[0]!)[1]!.conversationId).toBeUndefined();
  });

  it('reports a lost session and reopens it on the next ensure', async () => {
    const fake = await server();
    const lost = vi.fn();
    const opened = channel(fake.url, lost);
    await opened.ensure();
    await opened.ensure();
    expect(fake.sessions).toHaveLength(1);
    opened.startRequest(new Float32Array(0), recorder().events);
    fake.sessions[0]!.socket.close();
    await until(() => lost.mock.calls.length === 1, 'lost session');
    expect(opened.isTransmitting).toBe(false);
    expect(() => opened.startRequest(new Float32Array(0), recorder().events)).toThrow('unavailable');
    await opened.ensure();
    expect(fake.sessions).toHaveLength(2);
    expect(fake.sessions[1]!.messages[0]).toMatchObject({ type: 'session.hello' });
  });

  it('rejects ensure when the backend refuses the subprotocol or is unreachable', async () => {
    const refusing = await server({ rejectProtocol: true });
    await expect(AmbrogioSession.open(refusing.url, identity)).rejects.toThrow('unavailable');
    const closed = await server();
    const url = closed.url;
    await closed.close();
    servers.splice(servers.indexOf(closed), 1);
    await expect(channel(url).ensure()).rejects.toThrow('unavailable');
  });

  // Verification: Prova della sessione e delle conversazioni del satellite
  it('closes the socket and rejects the opening when session.ready does not arrive within 5 seconds', async () => {
    const fake = await server({ withholdReady: true });
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      let settled: 'resolved' | Error | undefined;
      AmbrogioSession.open(fake.url, identity).then(() => { settled = 'resolved'; }, (error: Error) => { settled = error; });
      await turns(() => fake.sessions[0]?.messages.some(message => message.type === 'session.hello') === true);
      const socket = fake.sessions[0]!.socket;
      await vi.advanceTimersByTimeAsync(4_999);
      expect(settled).toBeUndefined();
      expect(socket.readyState).toBe(socket.OPEN);
      await vi.advanceTimersByTimeAsync(1);
      await turns(() => settled !== undefined && socket.readyState === socket.CLOSED);
      expect(settled).toBeInstanceOf(Error);
      expect((settled as Error).message).toBe('Conversation session unavailable');
      // Nothing but the hello was sent on the session that never became ready.
      expect(fake.sessions[0]!.messages).toEqual([{ type: 'session.hello', clientId: 'satellite-cucina', name: 'Cucina' }]);
      expect(fake.sessions[0]!.frames).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not reopen after close', async () => {
    const fake = await server();
    const opened = channel(fake.url);
    await opened.ensure();
    await opened.close();
    await expect(opened.ensure()).rejects.toThrow('closed');
  });
});

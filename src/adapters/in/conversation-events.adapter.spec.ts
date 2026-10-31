import { describe, expect, it, vi } from 'vitest';
import { createConversationEventsAdapter } from './conversation-events.adapter.js';
import type { VoiceSession } from '../../application/voice-session.use-case.js';

// Collaborator types come from the adapter signature: inbound tests import only their adapter and Application.
type Options = Parameters<typeof createConversationEventsAdapter>[0];
type ConversationChannel = NonNullable<ReturnType<Options['channel']>>;
type RequestEvents = Parameters<ConversationChannel['startRequest']>[1];

/** In-memory reserve with the same contract: frames kept in order, emptied when taken. */
function reserveStub() {
  let samples: number[] = [];
  return {
    push(frames: Float32Array) { samples.push(...frames); },
    take() { const taken = Float32Array.from(samples); samples = []; return taken; },
  };
}

function fixture(status = { acceptsWakeWord: false, acceptsSpeechEnd: false, interactionActive: true }) {
  let request: RequestEvents | undefined;
  let transmitting = false;
  let idle!: () => void;
  const channel = {
    get isTransmitting() { return transmitting; },
    startRequest: vi.fn((_reserve: Float32Array, events: RequestEvents) => { request = events; transmitting = true; }),
    send: vi.fn((_frames: Float32Array) => true),
    endRequest: vi.fn(() => { transmitting = false; }),
  };
  const playback = {
    start: vi.fn(), audio: vi.fn(), end: vi.fn(),
    idle: vi.fn(() => new Promise<void>(resolve => { idle = resolve; })),
  };
  const session = { status, dispatch: vi.fn(), fail: vi.fn(async (_error: unknown) => {}) };
  const vad = { push: vi.fn() };
  const wake: Float32Array[] = [];
  const reserve = reserveStub();
  const diagnostics = { requestTiming: vi.fn() };
  const clock = { now: 0 };
  const adapter = createConversationEventsAdapter({
    getSession: () => session as unknown as VoiceSession,
    isStopping: () => false,
    channel: () => channel as unknown as ConversationChannel,
    vad: () => vad as unknown as ReturnType<Options['vad']>,
    reserve: reserve as unknown as Options['reserve'],
    playback: playback as unknown as Options['playback'],
    pushWakeFrames: frames => wake.push(frames),
    diagnostics,
    now: () => clock.now,
  });
  return { adapter, channel, playback, session, vad, wake, reserve, diagnostics, clock,
    request: () => request!, releaseIdle: () => idle(), setTransmitting: (value: boolean) => { transmitting = value; } };
}

const kinds = (dispatch: { mock: { calls: unknown[][] } }) =>
  dispatch.mock.calls.map(([event]) => event as Record<string, unknown>);

describe('conversation events adapter', () => {
  it('starts the request with the reserve on confirmed speech and ends it with the speech', () => {
    const { adapter, channel, session } = fixture();
    adapter.frames(new Float32Array([0.1, 0.2]));
    adapter.speech.confirmed();
    expect([...channel.startRequest.mock.calls[0]![0]]).toEqual([expect.closeTo(0.1), expect.closeTo(0.2)]);
    adapter.frames(new Float32Array([0.3]));
    expect(channel.send).toHaveBeenCalledOnce();
    adapter.speech.ended();
    expect(channel.endRequest).toHaveBeenCalledOnce();
    expect(kinds(session.dispatch)).toEqual([{ kind: 'speech_started' }, { kind: 'speech_ended' }]);
    // A second end without an open request changes nothing.
    adapter.speech.ended();
    expect(channel.endRequest).toHaveBeenCalledOnce();
  });

  it('ends the request when the 60 second limit is reached', () => {
    const { adapter, channel, session } = fixture();
    adapter.speech.confirmed();
    channel.send.mockReturnValueOnce(false);
    adapter.frames(new Float32Array([0.3]));
    expect(channel.endRequest).toHaveBeenCalledOnce();
    expect(kinds(session.dispatch).at(-1)).toEqual({ kind: 'speech_ended' });
  });

  it('routes frames to the wake word only while waiting for it, and always to the VAD', () => {
    const waiting = fixture({ acceptsWakeWord: true, acceptsSpeechEnd: false, interactionActive: false });
    waiting.adapter.frames(new Float32Array([1]));
    expect(waiting.wake).toHaveLength(1);
    const busy = fixture();
    busy.adapter.frames(new Float32Array([1]));
    expect(busy.wake).toHaveLength(0);
    expect(busy.vad.push).toHaveBeenCalledOnce();
  });

  // Verification: Prova di un solo turno alla volta nel satellite
  it('forwards transmissions to playback and reports the response only after it has been played', async () => {
    const { adapter, playback, session, request, releaseIdle } = fixture();
    adapter.speech.confirmed();
    adapter.speech.ended();
    const events = request();
    events.outputStart(4, { type: 'audio', sampleRate: 22_050 });
    events.outputAudio(4, Int16Array.from([1]));
    events.outputEnd(4);
    expect(playback.start).toHaveBeenCalledWith(4, { type: 'audio', sampleRate: 22_050 });
    expect(playback.audio).toHaveBeenCalledOnce();
    expect(playback.end).toHaveBeenCalledWith(4);
    events.outcome({ kind: 'completed', expectsReply: true });
    expect(kinds(session.dispatch).at(-1)).toEqual({ kind: 'assistant_message', expectsReply: true });
    await new Promise(resolve => setTimeout(resolve, 5));
    expect(kinds(session.dispatch).some(event => event.kind === 'response_played')).toBe(false);
    releaseIdle();
    await vi.waitFor(() => expect(kinds(session.dispatch).at(-1)).toEqual({ kind: 'response_played' }));
  });

  it.each(['failed', 'rejected', 'interrupted'] as const)('treats a %s turn as conclusive', kind => {
    const { adapter, session, request } = fixture();
    adapter.speech.confirmed();
    request().outcome({ kind });
    expect(kinds(session.dispatch).at(-1)).toEqual({ kind: 'assistant_message', expectsReply: false });
  });

  // Verification: Prova del messaggio pubblico dei turni rifiutati o falliti
  it.each([
    { kind: 'rejected' as const, accepted: false },
    { kind: 'failed' as const, accepted: true },
  ])('plays the public message of a $kind turn in order and returns to the wake word only after it', async ({ kind, accepted }) => {
    const { adapter, playback, session, request, releaseIdle } = fixture();
    adapter.speech.confirmed();
    adapter.speech.ended();
    const events = request();
    if (accepted) {
      events.accepted('c1');
      // The reply already under way, then the public message of the failure.
      events.outputStart(2, { type: 'audio', sampleRate: 22_050 });
      events.outputAudio(2, Int16Array.from([1, 2]));
      events.outputEnd(2);
    }
    events.outputStart(3, { type: 'audio', sampleRate: 22_050 });
    events.outputAudio(3, Int16Array.from([3]));
    events.outputAudio(3, Int16Array.from([4]));
    events.outputEnd(3);
    events.outcome({ kind });
    // Every call to the playback, in the order it happened.
    const calls = [
      ...playback.start.mock.calls.map((args, index) => [playback.start.mock.invocationCallOrder[index]!, 'start', ...args]),
      ...playback.audio.mock.calls.map((args, index) =>
        [playback.audio.mock.invocationCallOrder[index]!, 'audio', args[0], [...(args[1] as Int16Array)]]),
      ...playback.end.mock.calls.map((args, index) => [playback.end.mock.invocationCallOrder[index]!, 'end', ...args]),
    ].sort((a, b) => (a[0] as number) - (b[0] as number)).map(([, ...call]) => call);
    expect(calls).toEqual([
      ...(accepted ? [['start', 2, { type: 'audio', sampleRate: 22_050 }], ['audio', 2, [1, 2]], ['end', 2]] : []),
      ['start', 3, { type: 'audio', sampleRate: 22_050 }], ['audio', 3, [3]], ['audio', 3, [4]], ['end', 3],
    ]);
    expect(kinds(session.dispatch)).toEqual([{ kind: 'speech_started' }, { kind: 'speech_ended' },
      { kind: 'assistant_message', expectsReply: false }]);
    await new Promise(resolve => setTimeout(resolve, 5));
    expect(kinds(session.dispatch).some(event => event.kind === 'response_played')).toBe(false);
    releaseIdle();
    await vi.waitFor(() => expect(kinds(session.dispatch).at(-1)).toEqual({ kind: 'response_played' }));
    expect(session.fail).not.toHaveBeenCalled();
  });

  it('ignores events of an earlier request once a new one has started', () => {
    const { adapter, playback, session, request, setTransmitting } = fixture();
    adapter.speech.confirmed();
    const first = request();
    setTransmitting(false);
    adapter.speech.confirmed();
    first.outputStart(1, { type: 'text' });
    first.outcome({ kind: 'completed', expectsReply: true });
    expect(playback.start).not.toHaveBeenCalled();
    expect(kinds(session.dispatch).filter(event => event.kind === 'assistant_message')).toEqual([]);
  });

  it('fails the interaction on a protocol refusal, a lost session or a start failure', () => {
    const { adapter, channel, session, request } = fixture();
    adapter.speech.confirmed();
    request().rejectedByProtocol('invalid_message');
    adapter.sessionLost();
    channel.startRequest.mockImplementationOnce(() => { throw new Error('Conversation session unavailable'); });
    adapter.speech.confirmed();
    expect(session.fail).toHaveBeenCalledTimes(3);
    expect(session.fail.mock.calls.map(([error]) => (error as Error).message)).toEqual([
      'Conversation request refused by the protocol: invalid_message',
      'Conversation session closed unexpectedly',
      'Conversation session unavailable',
    ]);
  });

  it('does not treat a lost idle session as a failure', () => {
    const idle = fixture({ acceptsWakeWord: true, acceptsSpeechEnd: false, interactionActive: false });
    idle.adapter.sessionLost();
    expect(idle.session.fail).not.toHaveBeenCalled();
  });
});

describe('request timing', () => {
  // Verification: Prova dell'evento dei tempi della richiesta
  it('logs the durations of a request once its reply has been played', async () => {
    const { adapter, request, releaseIdle, diagnostics, clock, playback } = fixture();
    clock.now = 100;
    adapter.speech.confirmed();
    clock.now = 1_300;
    adapter.speech.ended();
    request().outputStart(1, { type: 'audio', sampleRate: 22_050 });
    clock.now = 3_200;
    request().outputAudio(1, new Int16Array(4));
    clock.now = 3_400;
    request().outputAudio(1, new Int16Array(4));
    request().outputEnd(1);
    request().outcome({ kind: 'completed', expectsReply: false });
    expect(diagnostics.requestTiming).not.toHaveBeenCalled();
    clock.now = 5_000;
    releaseIdle();
    await vi.waitFor(() => expect(diagnostics.requestTiming).toHaveBeenCalledOnce());
    expect(diagnostics.requestTiming).toHaveBeenCalledWith({ speechMs: 1_200, firstAudioMs: 1_900, playedMs: 3_700 });
    expect(playback.audio).toHaveBeenCalledTimes(2);
  });

  // Verification: Prova dell'evento dei tempi della richiesta
  it('leaves out the first audio of a text-only reply', async () => {
    const { adapter, request, releaseIdle, diagnostics, clock } = fixture();
    adapter.speech.confirmed();
    clock.now = 500;
    adapter.speech.ended();
    request().outputStart(1, { type: 'text' });
    request().outputEnd(1);
    request().outcome({ kind: 'rejected' });
    clock.now = 900;
    releaseIdle();
    await vi.waitFor(() => expect(diagnostics.requestTiming).toHaveBeenCalledOnce());
    expect(diagnostics.requestTiming).toHaveBeenCalledWith({ speechMs: 500, playedMs: 400 });
  });

  // Verification: Prova dell'evento dei tempi della richiesta
  it('logs nothing for an abandoned request or one replaced by a new activation', async () => {
    const { adapter, request, diagnostics } = fixture();
    adapter.speech.confirmed();
    adapter.speech.ended();
    // No outcome arrives for the first request: a new activation replaces it.
    const first = request();
    adapter.speech.confirmed();
    first.outcome({ kind: 'completed', expectsReply: false });
    adapter.speech.ended();
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(diagnostics.requestTiming).not.toHaveBeenCalled();
    // The second request receives its outcome, but its playback never ends.
    request().outcome({ kind: 'completed', expectsReply: false });
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(diagnostics.requestTiming).not.toHaveBeenCalled();
  });
});

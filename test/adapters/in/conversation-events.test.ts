import { describe, expect, it, vi } from 'vitest';
import { createConversationEventsAdapter } from '../../../src/adapters/in/conversation-events.adapter.js';
import type { VoiceSession } from '../../../src/application/voice-session.use-case.js';

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
  const adapter = createConversationEventsAdapter({
    getSession: () => session as unknown as VoiceSession,
    isStopping: () => false,
    channel: () => channel as unknown as ConversationChannel,
    vad: () => vad as unknown as ReturnType<Options['vad']>,
    reserve: reserve as unknown as Options['reserve'],
    playback: playback as unknown as Options['playback'],
    pushWakeFrames: frames => wake.push(frames),
  });
  return { adapter, channel, playback, session, vad, wake, reserve,
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

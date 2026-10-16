import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VoiceSession } from '../../src/application/voice-session.js';

describe('voice session', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function fixture() {
    const openCall = vi.fn(async () => {});
    const closeCall = vi.fn(async () => {});
    const setSpeechEnabled = vi.fn();
    const reportFailure = vi.fn(async () => {});
    const session = new VoiceSession({ openCall, closeCall, setSpeechEnabled, reportFailure }, 15_000, 60_000);
    return { session, openCall, closeCall, setSpeechEnabled, reportFailure };
  }

  async function start(session: VoiceSession) {
    session.dispatch({ kind: 'wake_detected' });
    await Promise.resolve();
    session.dispatch({ kind: 'speech_started' });
    session.dispatch({ kind: 'speech_ended' });
  }

  it('keeps the call for a requested reply and closes when the reply window expires', async () => {
    const { session, closeCall, setSpeechEnabled } = fixture();
    await start(session);
    expect(setSpeechEnabled).toHaveBeenLastCalledWith(false);
    session.dispatch({ kind: 'assistant_message', expectsReply: true });
    session.dispatch({ kind: 'response_played' });
    expect(session.state.phase).toBe('waiting_reply');
    expect(setSpeechEnabled).toHaveBeenLastCalledWith(true);
    vi.advanceTimersByTime(15_000);
    await Promise.resolve();
    expect(closeCall).toHaveBeenCalledOnce();
    expect(session.state.phase).toBe('waiting_wake_word');
  });

  it('never waits forever when the answer produces no audio', async () => {
    const { session, closeCall } = fixture();
    await start(session);
    session.dispatch({ kind: 'assistant_message', expectsReply: true });
    vi.advanceTimersByTime(59_999);
    expect(closeCall).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    await Promise.resolve();
    expect(closeCall).toHaveBeenCalledOnce();
    expect(session.state.phase).toBe('waiting_wake_word');
  });

  it('reports a failed connection and becomes ready for a new wake word', async () => {
    const { session, openCall, closeCall, reportFailure } = fixture();
    openCall.mockRejectedValueOnce(new Error('unreachable'));
    session.dispatch({ kind: 'wake_detected' });
    await vi.waitFor(() => expect(reportFailure).toHaveBeenCalledOnce());
    expect(closeCall).toHaveBeenCalledOnce();
    expect(session.state.phase).toBe('waiting_wake_word');
  });
});

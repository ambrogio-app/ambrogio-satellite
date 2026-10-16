import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { ManualDeadlines } from '../support/manual-deadlines.js';
import { VoiceSession } from '../../src/application/voice-session.use-case.js';

describe('voice session', () => {

  function fixture() {
    const openCall = vi.fn(async () => {});
    const closeCall = vi.fn(async () => {});
    const setSpeechEnabled = vi.fn();
    const reportFailure = vi.fn(async () => {});
    const deadlines = new ManualDeadlines();
    const session = new VoiceSession({ openCall, closeCall, setSpeechEnabled, reportFailure }, 15_000, 60_000, deadlines);
    return { deadlines, session, openCall, closeCall, setSpeechEnabled, reportFailure };
  }

  async function start(session: VoiceSession) {
    session.dispatch({ kind: 'wake_detected' });
    await Promise.resolve();
    session.dispatch({ kind: 'speech_started' });
    session.dispatch({ kind: 'speech_ended' });
  }

  it('keeps the call for a requested reply and closes when the reply window expires', async () => {
    const { deadlines, session, closeCall, setSpeechEnabled } = fixture();
    await start(session);
    expect(setSpeechEnabled).toHaveBeenLastCalledWith(false);
    session.dispatch({ kind: 'assistant_message', expectsReply: true });
    session.dispatch({ kind: 'response_played' });
    expect(session.status).toEqual({ acceptsWakeWord: false, acceptsSpeechEnd: false, interactionActive: true });
    expect(setSpeechEnabled).toHaveBeenLastCalledWith(true);
    deadlines.advanceBy(15_000);
    await Promise.resolve();
    expect(closeCall).toHaveBeenCalledOnce();
    expect(session.status.acceptsWakeWord).toBe(true);
  });

  it('never waits forever when the answer produces no audio', async () => {
    const { deadlines, session, closeCall } = fixture();
    await start(session);
    session.dispatch({ kind: 'assistant_message', expectsReply: true });
    deadlines.advanceBy(59_999);
    expect(closeCall).not.toHaveBeenCalled();
    deadlines.advanceBy(1);
    await Promise.resolve();
    expect(closeCall).toHaveBeenCalledOnce();
    expect(session.status.acceptsWakeWord).toBe(true);
  });

  it('reports a failed connection and becomes ready for a new wake word', async () => {
    const { session, openCall, closeCall, reportFailure } = fixture();
    openCall.mockRejectedValueOnce(new Error('unreachable'));
    session.dispatch({ kind: 'wake_detected' });
    for (let i = 0; i < 6; i++) await Promise.resolve();
    expect(reportFailure).toHaveBeenCalledOnce();
    expect(closeCall).toHaveBeenCalledOnce();
    expect(session.status.acceptsWakeWord).toBe(true);
  });
  it('passes a thrown value unchanged and reports concurrent failure notifications once', async () => {
    const { session, reportFailure } = fixture();
    const value = { toString() { throw new Error('must not stringify'); } };
    await Promise.all([session.fail(value), session.fail(value)]);
    expect(reportFailure).toHaveBeenCalledExactlyOnceWith(value);
  });
  it('cancels the old reply deadline when speech resumes and arms a fresh answer deadline', async () => {
    const { session, deadlines, closeCall } = fixture();
    await start(session);
    session.dispatch({ kind: 'assistant_message', expectsReply: true });
    session.dispatch({ kind: 'response_played' });
    deadlines.advanceBy(14_999);
    expect(closeCall).not.toHaveBeenCalled();
    session.dispatch({ kind: 'speech_started' });
    expect(deadlines.pending).toBe(0);
    deadlines.advanceBy(1);
    expect(session.status.acceptsSpeechEnd).toBe(true);
    session.dispatch({ kind: 'speech_ended' });
    expect(deadlines.pending).toBe(1);
    deadlines.advanceBy(59_999);
    expect(closeCall).not.toHaveBeenCalled();
    deadlines.advanceBy(1);
    await Promise.resolve();
    expect(closeCall).toHaveBeenCalledOnce();
    expect(deadlines.pending).toBe(0);
  });

  for (const phase of ['answer', 'reply'] as const) {
    for (const end of ['stop', 'fail'] as const) {
      it(`cancels the ${phase} deadline on ${end}`, async () => {
        const { session, deadlines, closeCall } = fixture();
        await start(session);
        if (phase === 'reply') {
          session.dispatch({ kind: 'assistant_message', expectsReply: true });
          session.dispatch({ kind: 'response_played' });
        }
        expect(deadlines.pending).toBe(1);
        if (end === 'stop') await session.stop();
        else await session.fail(new Error('device failed'));
        expect(deadlines.pending).toBe(0);
        deadlines.advanceBy(120_000);
        expect(closeCall).toHaveBeenCalledOnce();
      });
    }
  }

  it('exposes Application observations across the interaction without exposing Domain state', async () => {
    const { session, closeCall } = fixture();
    const idle = session.status;
    expect(idle).toEqual({ acceptsWakeWord: true, acceptsSpeechEnd: false, interactionActive: false });
    session.dispatch({ kind: 'wake_detected' });
    expect(session.status.interactionActive).toBe(true);
    await Promise.resolve();
    expect(session.status.acceptsSpeechEnd).toBe(false);
    session.dispatch({ kind: 'speech_started' });
    expect(session.status.acceptsSpeechEnd).toBe(true);
    session.dispatch({ kind: 'speech_ended' });
    expect(session.status).toEqual({ acceptsWakeWord: false, acceptsSpeechEnd: false, interactionActive: true });
    session.dispatch({ kind: 'assistant_message', expectsReply: false });
    session.dispatch({ kind: 'response_played' });
    expect(session.status.interactionActive).toBe(false);
    expect(closeCall).toHaveBeenCalledOnce();
    await Promise.resolve();
    expect(session.status).toEqual(idle);
    expect(session.status).not.toBe(idle);
    expectTypeOf<VoiceSession>().not.toHaveProperty('state');
    type Input = Parameters<VoiceSession['dispatch']>[0];
    expectTypeOf<Extract<Input, { kind: 'timeout' | 'call_opened' | 'call_closed' }>>().toEqualTypeOf<never>();
  });

  it('returns detached snapshots and hides interaction activity during failure cleanup', async () => {
    const { session, closeCall } = fixture();
    const snapshot = session.status;
    // Simulates a JavaScript caller bypassing TypeScript readonly.
    Object.assign(snapshot, { acceptsWakeWord: false });
    expect(session.status.acceptsWakeWord).toBe(true);
    await start(session);
    let finish!: () => void;
    closeCall.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
    const failing = session.fail(new Error('connection failed'));
    expect(session.status).toEqual({ acceptsWakeWord: false, acceptsSpeechEnd: false, interactionActive: false });
    finish(); await failing;
    expect(session.status.acceptsWakeWord).toBe(true);
    expect(snapshot.acceptsWakeWord).toBe(false);
  });

});

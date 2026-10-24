import { describe, expect, it, vi } from 'vitest';
import { ManualDeadlines } from '../../test/support/manual-deadlines.js';
import { VoiceSession } from './voice-session.use-case.js';
import type { LocalAttenuation } from './local-attenuation.port.js';

async function flush(): Promise<void> {
  for (let i = 0; i < 10; i++) await Promise.resolve();
}

describe('local attenuation during an interaction', () => {
  function fixture(attenuation?: Partial<LocalAttenuation>) {
    const log: string[] = [];
    const ports = {
      openCall: vi.fn(async () => { log.push('open'); }),
      closeCall: vi.fn(async () => { log.push('close'); }),
      setSpeechEnabled: vi.fn(),
      playReadyCue: vi.fn(async () => { log.push('cue'); }),
      reportFailure: vi.fn(async () => { log.push('failure'); }),
    };
    const local: LocalAttenuation = {
      attenuate: vi.fn(async () => { log.push('attenuate'); }),
      restore: vi.fn(async () => { log.push('restore'); }),
      ...attenuation,
    };
    const deadlines = new ManualDeadlines();
    const session = new VoiceSession(ports, 15_000, 60_000, deadlines, local);
    return { log, ports, local, deadlines, session };
  }

  async function askQuestion(session: VoiceSession) {
    session.dispatch({ kind: 'wake_detected' });
    await flush();
    session.dispatch({ kind: 'speech_started' });
    session.dispatch({ kind: 'speech_ended' });
  }

  it('lowers other local audio at the wake word, before the ready cue', async () => {
    const { log, session } = fixture();
    session.dispatch({ kind: 'wake_detected' });
    await flush();
    expect(log.indexOf('attenuate')).toBeGreaterThanOrEqual(0);
    expect(log.indexOf('attenuate')).toBeLessThan(log.indexOf('cue'));
  });

  it('waits for a slow attenuation before playing the ready cue', async () => {
    let finish!: () => void;
    const { ports, session } = fixture({ attenuate: () => new Promise<void>(resolve => { finish = resolve; }) });
    session.dispatch({ kind: 'wake_detected' });
    await flush();
    expect(ports.playReadyCue).not.toHaveBeenCalled();
    finish(); await flush();
    expect(ports.playReadyCue).toHaveBeenCalledOnce();
  });

  it('restores once when the answer ends without a requested reply', async () => {
    const { log, local, session } = fixture();
    await askQuestion(session);
    session.dispatch({ kind: 'assistant_message', expectsReply: false });
    session.dispatch({ kind: 'response_played' });
    await flush();
    expect(local.restore).toHaveBeenCalledOnce();
    expect(log.at(-1)).toBe('restore');
    expect(session.status.acceptsWakeWord).toBe(true);
  });

  it('stays lowered during a requested reply and restores when the reply window expires', async () => {
    const { deadlines, local, session } = fixture();
    await askQuestion(session);
    session.dispatch({ kind: 'assistant_message', expectsReply: true });
    session.dispatch({ kind: 'response_played' });
    await flush();
    expect(local.attenuate).toHaveBeenCalledOnce();
    expect(local.restore).not.toHaveBeenCalled();
    deadlines.advanceBy(15_000); await flush();
    expect(local.restore).toHaveBeenCalledOnce();
  });

  it('restores after the failure notice when the interaction fails', async () => {
    const { log, local, session } = fixture();
    await askQuestion(session);
    await session.fail(new Error('backend unreachable'));
    await flush();
    expect(local.restore).toHaveBeenCalledOnce();
    expect(log.indexOf('restore')).toBeGreaterThan(log.indexOf('failure'));
  });

  it('restores when no turn outcome arrives in time', async () => {
    const { deadlines, local, session } = fixture();
    await askQuestion(session);
    deadlines.advanceBy(60_000); await flush();
    expect(local.restore).toHaveBeenCalledOnce();
    expect(session.status.acceptsWakeWord).toBe(true);
  });

  it('restores during a controlled stop, even in the middle of an interaction', async () => {
    const { local, session } = fixture();
    await askQuestion(session);
    await session.stop();
    expect(local.restore).toHaveBeenCalledOnce();
  });

  it('applies a new attenuation only after the previous restore', async () => {
    let finishRestore!: () => void;
    const { log, session } = fixture({
      restore: () => new Promise<void>(resolve => { finishRestore = () => { log.push('restore'); resolve(); }; }),
    });
    await askQuestion(session);
    session.dispatch({ kind: 'assistant_message', expectsReply: false });
    session.dispatch({ kind: 'response_played' });
    await flush();
    session.dispatch({ kind: 'wake_detected' });
    await flush();
    expect(log.filter(entry => entry === 'attenuate')).toHaveLength(1);
    finishRestore(); await flush();
    expect(log.slice(-3, -1)).toEqual(['restore', 'attenuate']);
  });

  it('keeps the interaction going when an attenuation port rejects', async () => {
    const { ports, session } = fixture({ attenuate: async () => { throw new Error('unexpected'); } });
    session.dispatch({ kind: 'wake_detected' });
    await flush();
    expect(ports.playReadyCue).toHaveBeenCalledOnce();
    expect(ports.reportFailure).not.toHaveBeenCalled();
  });
});

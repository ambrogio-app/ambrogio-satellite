import { EventEmitter } from 'node:events';
import { expect, test, vi } from 'vitest';
import { Mic, Micdrop } from '@micdrop/client';
import { ManualDeadlines } from '../../support/manual-deadlines.js';
import { VoiceSession } from '../../../src/application/voice-session.use-case.js';
import { createMicdropEventsAdapter } from '../../../src/adapters/in/micdrop-events.adapter.js';

vi.mock('@micdrop/client', () => ({ Mic: new EventEmitter(), Micdrop: new EventEmitter() }));

test('translates a spoken turn and follow-up, gates wake frames and removes listeners', async () => {
  const ports = { openCall: vi.fn(async () => {}), closeCall: vi.fn(async () => {}),
    setSpeechEnabled: vi.fn(), reportFailure: vi.fn(async () => {}) };
  const session = new VoiceSession(ports, 15_000, 60_000, new ManualDeadlines());
  const pushWakeFrames = vi.fn();
  const playback = { update: vi.fn(), begin: vi.fn() };
  const adapter = createMicdropEventsAdapter({ getSession: () => session,
    isStopping: () => false, pushWakeFrames, playback });
  const mic = Mic as unknown as EventEmitter;
  const client = Micdrop as unknown as EventEmitter;
  adapter.attach();
  try {
    mic.emit('Frames', new Float32Array(2));
    expect(pushWakeFrames).toHaveBeenCalledTimes(1);
    adapter.wakeDetected();
    await Promise.resolve();
    mic.emit('Frames', new Float32Array(2));
    expect(pushWakeFrames).toHaveBeenCalledTimes(1);
    const idle = { isStarted: true, isUserSpeaking: false, isAssistantSpeaking: false };
    const speaking = { ...idle, isUserSpeaking: true };
    client.emit('StateChange', speaking, idle);
    client.emit('StateChange', idle, speaking);
    await Promise.resolve();
    expect(playback.begin).toHaveBeenCalledOnce();
    client.emit('Message', { role: 'assistant', metadata: { expectsReply: true } });
    adapter.responsePlayed();
    expect(session.state.phase).toBe('waiting_reply');
    expect(ports.openCall).toHaveBeenCalledTimes(1);
    expect(ports.setSpeechEnabled).toHaveBeenLastCalledWith(true);
  } finally {
    adapter.detach();
    await session.stop();
  }
  expect(mic.listenerCount('Frames')).toBe(0);
  for (const name of ['StateChange', 'Message', 'Error']) expect(client.listenerCount(name)).toBe(0);
});

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
    expect(session.status).toEqual({ acceptsWakeWord: false, acceptsSpeechEnd: false, interactionActive: true });
    expect(ports.openCall).toHaveBeenCalledTimes(1);
    expect(ports.setSpeechEnabled).toHaveBeenLastCalledWith(true);
  } finally {
    adapter.detach();
    await session.stop();
  }
  expect(mic.listenerCount('Frames')).toBe(0);
  for (const name of ['StateChange', 'Message', 'Error']) expect(client.listenerCount(name)).toBe(0);
});

test.each([
  [true, true], [false, false], ['true', undefined], [null, undefined], [undefined, undefined],
])('normalizes reply metadata %s into the Application contract', (value, expected) => {
  const session = new VoiceSession({ openCall: async () => {}, closeCall: async () => {},
    setSpeechEnabled() {}, reportFailure: async () => {} }, 15000, 60000, new ManualDeadlines());
  const dispatch = vi.spyOn(session, 'dispatch');
  const adapter = createMicdropEventsAdapter({ getSession: () => session,
    isStopping: () => false, pushWakeFrames() {}, playback: { update() {}, begin() {} } });
  adapter.attach();
  try {
    (Micdrop as unknown as EventEmitter).emit('Message', { role: 'assistant', metadata: { expectsReply: value } });
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({ kind: 'assistant_message', expectsReply: expected });
  } finally { adapter.detach(); }
});

test('uses Application activity to ignore idle disconnects and report an active disconnect', async () => {
  const reportFailure = vi.fn(async () => {});
  const session = new VoiceSession({ openCall: async () => {}, closeCall: async () => {},
    setSpeechEnabled() {}, reportFailure }, 15000, 60000, new ManualDeadlines());
  const adapter = createMicdropEventsAdapter({ getSession: () => session,
    isStopping: () => false, pushWakeFrames() {}, playback: { update() {}, begin() {} } });
  const client = Micdrop as unknown as EventEmitter;
  const connected = { isStarted: true, isUserSpeaking: false, isAssistantSpeaking: false };
  const disconnected = { ...connected, isStarted: false };
  adapter.attach();
  try {
    client.emit('StateChange', disconnected, connected);
    expect(reportFailure).not.toHaveBeenCalled();
    adapter.wakeDetected(); await Promise.resolve();
    client.emit('StateChange', disconnected, connected);
    for (let i = 0; i < 4; i++) await Promise.resolve();
    expect(reportFailure).toHaveBeenCalledOnce();
    expect(session.status.acceptsWakeWord).toBe(true);
  } finally { adapter.detach(); await session.stop(); }
});

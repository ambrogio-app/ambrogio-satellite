import { beforeEach, expect, test, vi } from 'vitest';
import { LifecycleError, ProjectError } from '../runtime/project-error.js';
import { createSatellite } from './satellite.js';

const f = vi.hoisted(() => ({
  stop: vi.fn(), shutdown: vi.fn(), channelClose: vi.fn(), ensure: vi.fn(),
  wakeClose: vi.fn(), wakeOpen: vi.fn(), vadOpen: vi.fn(), vadClose: vi.fn(),
  micStart: vi.fn(), micClose: vi.fn(), playbackCancel: vi.fn(), info: vi.fn(),
  wakeDetectedLog: vi.fn(), wakeRejectedLog: vi.fn(), wakeDetected: vi.fn(), restore: vi.fn(),
}));
vi.mock('../adapters/out/amixer-attenuation.adapter.js', () => ({
  AmixerAttenuation: class { restore = f.restore; attenuate = vi.fn(); },
}));
vi.mock('../adapters/out/sherpa-wake-word.js', () => ({ SherpaWakeWord: { open: f.wakeOpen } }));
vi.mock('../adapters/out/sherpa-speech-detector.js', () => ({ SherpaSpeechDetector: { open: f.vadOpen } }));
vi.mock('../adapters/out/microphone-input.js', () => ({
  MicrophoneInput: class { start = f.micStart; close = f.micClose; },
}));
vi.mock('../adapters/out/conversation-channel.js', () => ({
  ConversationChannel: class { ensure = f.ensure; close = f.channelClose; },
}));
vi.mock('../adapters/out/response-playback.js', () => ({
  ResponsePlayback: class { cancel = f.playbackCancel; },
}));
vi.mock('../adapters/in/conversation-events.adapter.js', () => ({ createConversationEventsAdapter: () => ({
  speech: {}, frames() {}, failed() {}, wakeDetected: f.wakeDetected, sessionLost() {},
}) }));
vi.mock('../adapters/out/conversation-call.adapter.js', () => ({ createConversationCallAdapter: () => ({
  shutdown: f.shutdown, closeCall: f.stop,
  openCall: vi.fn(), setSpeechEnabled: vi.fn(), playReadyCue: vi.fn(), reportFailure: vi.fn(),
}) }));

const config = {
  backend: { sessionUrl: new URL('ws://localhost/api/session'), baseUrl: new URL('http://localhost') },
  client: { clientId: 'satellite-test', name: 'test' },
  audio: { attenuation: { device: 'default', control: 'Music', level: 30 } },
  wakeWord: { text: 'Hey Siri', threshold: 0.7 }, interaction: { replyTimeoutMs: 15000 },
} as never;

/** The event catalog given by the composition root. */
const diagnostics = () => ({ info: f.info, failure: vi.fn(), wakeDetected: f.wakeDetectedLog, wakeRejected: f.wakeRejectedLog,
  attenuationFailed: vi.fn(), startupFailed: vi.fn(), shutdownTimeout: vi.fn(), configurationRejected: vi.fn() });

async function started() {
  const satellite = await createSatellite(config, diagnostics());
  await satellite.activate();
  return satellite;
}

beforeEach(() => {
  vi.resetAllMocks();
  f.wakeOpen.mockResolvedValue({ close: f.wakeClose, push() {}, reset() {}, async waitUntilIdle() {} });
  f.vadOpen.mockResolvedValue({ close: f.vadClose, push() {}, reset() {}, start() {} });
  f.ensure.mockResolvedValue(undefined);
  f.shutdown.mockResolvedValue(undefined);
  f.restore.mockResolvedValue(undefined);
});

test('passes the configured wake word, its threshold and the confirmation window to the recognizer', async () => {
  const satellite = await started();
  expect(f.wakeOpen).toHaveBeenCalledWith(expect.objectContaining({ wakeWord: 'Hey Siri', threshold: 0.7,
    speechWindowMs: 1_500, cooldownMs: 2_000 }));
  await satellite.close();
});

test('logs each wake word detection before forwarding it to the voice session', async () => {
  const satellite = await started();
  const { detected, rejected } = f.wakeOpen.mock.calls[0]![0] as { detected(): void; rejected(): void };
  detected();
  expect(f.wakeDetectedLog).toHaveBeenCalledOnce();
  expect(f.wakeDetected).toHaveBeenCalledOnce();
  expect(f.wakeDetectedLog.mock.invocationCallOrder[0]).toBeLessThan(f.wakeDetected.mock.invocationCallOrder[0]!);
  // A rejected detection is logged and never reaches the voice session.
  rejected();
  expect(f.wakeRejectedLog).toHaveBeenCalledOnce();
  expect(f.wakeDetected).toHaveBeenCalledOnce();
  await satellite.close();
});

test('construction loads the models without activating attenuation, microphone or session', async () => {
  const satellite = await createSatellite(config, diagnostics());
  expect(f.wakeOpen).toHaveBeenCalledOnce(); expect(f.vadOpen).toHaveBeenCalledOnce();
  expect(f.restore).not.toHaveBeenCalled(); expect(f.micStart).not.toHaveBeenCalled(); expect(f.ensure).not.toHaveBeenCalled();
  await satellite.close();
  expect(f.wakeClose).toHaveBeenCalledOnce(); expect(f.vadClose).toHaveBeenCalledOnce();
  expect(f.micClose).not.toHaveBeenCalled();
});

test('activation restores the attenuation, starts the microphone, then opens the persistent session', async () => {
  const satellite = await started();
  expect(f.restore).toHaveBeenCalledOnce();
  expect(f.micStart).toHaveBeenCalledOnce();
  expect(f.ensure).toHaveBeenCalledOnce();
  expect(f.restore.mock.invocationCallOrder[0]!).toBeLessThan(f.micStart.mock.invocationCallOrder[0]!);
  expect(f.micStart.mock.invocationCallOrder[0]!).toBeLessThan(f.ensure.mock.invocationCallOrder[0]!);
  await satellite.close();
});

test('starts even when the backend is unreachable and reports it as information', async () => {
  f.ensure.mockRejectedValue(new Error('unreachable'));
  const satellite = await started();
  await vi.waitFor(() => expect(f.info).toHaveBeenCalledWith('satellite_session_unavailable'));
  await satellite.close();
});

test('closes once, in reverse order of acquisition, after cancelling playback', async () => {
  const satellite = await started();
  const a = satellite.close(); const b = satellite.close();
  expect(a).toBe(b);
  await a;
  const order = [f.playbackCancel, f.micClose, f.stop, f.shutdown, f.vadClose, f.wakeClose]
    .map(close => { expect(close).toHaveBeenCalledOnce(); return close.mock.invocationCallOrder[0]!; });
  expect(order).toEqual([...order].sort((x, y) => x - y));
  // The call adapter owns the channel shutdown.
  expect(f.channelClose).not.toHaveBeenCalled();
});

test('attempts every closing when one fails and names the resource in the fault', async () => {
  const failure = new Error('close failed');
  f.stop.mockRejectedValue(failure);
  const satellite = await started();
  const outcome = await satellite.close().catch((error: unknown) => error);
  expect(outcome).toBeInstanceOf(ProjectError);
  expect(outcome).toMatchObject({ message: 'Voice session could not be stopped', cause: failure });
  expect(satellite.faults).toEqual([outcome]);
  for (const close of [f.stop, f.shutdown, f.micClose, f.vadClose, f.wakeClose, f.playbackCancel]) {
    expect(close).toHaveBeenCalledOnce();
  }
});

test.each([
  ['wake word', () => f.wakeOpen.mockRejectedValue(new Error('secret-marker')), 'Wake word model could not be loaded'],
  ['voice activity', () => f.vadOpen.mockRejectedValue(new Error('secret-marker')), 'Voice activity model could not be loaded'],
])('a failed %s model names the phase and keeps the original as cause', async (_name, fail, message) => {
  fail();
  const failure = await createSatellite(config, diagnostics()).catch((error: unknown) => error);
  expect(failure).toBeInstanceOf(ProjectError);
  expect(failure).toMatchObject({ message, cause: expect.objectContaining({ message: 'secret-marker' }) });
  expect(f.micStart).not.toHaveBeenCalled();
});

test('a failed microphone start names the phase', async () => {
  f.micStart.mockRejectedValue(new Error('secret-marker'));
  const satellite = await createSatellite(config, diagnostics());
  await expect(satellite.activate()).rejects.toMatchObject({ message: 'Microphone could not be started' });
  expect(f.ensure).not.toHaveBeenCalled();
  await satellite.close();
  expect(f.micClose).toHaveBeenCalledOnce();
});

test('a failed construction releases what was acquired and keeps both failures, the startup one first', async () => {
  const startup = new Error('vad failed'); const cleanup = new Error('release failed');
  f.vadOpen.mockRejectedValue(startup); f.wakeClose.mockRejectedValue(cleanup);
  const failure = await createSatellite(config, diagnostics()).catch((error: unknown) => error) as LifecycleError;
  expect(failure).toBeInstanceOf(LifecycleError);
  expect(failure.message).toBe('Satellite startup failed');
  expect(failure.faults).toHaveLength(2);
  expect(failure.faults[0]).toMatchObject({ message: 'Voice activity model could not be loaded', cause: startup });
  expect(failure.faults[1]).toMatchObject({ message: 'Wake word model could not be closed', cause: cleanup });
  expect(f.wakeClose).toHaveBeenCalledOnce();
});

test('releases resources acquired after abort during construction without activating anything', async () => {
  let resolve!: (value: unknown) => void;
  f.wakeOpen.mockReturnValue(new Promise(r => { resolve = r; }));
  const abort = new AbortController();
  const starting = createSatellite(config, diagnostics(), abort.signal);
  await vi.waitFor(() => expect(f.wakeOpen).toHaveBeenCalledOnce());
  abort.abort(); resolve({ close: f.wakeClose });
  await expect(starting).rejects.toMatchObject({ name: 'AbortError' });
  expect(f.micStart).not.toHaveBeenCalled(); expect(f.vadOpen).not.toHaveBeenCalled();
  expect(f.wakeClose).toHaveBeenCalledOnce();
  // The channel was never opened and needs no closing.
  expect(f.channelClose).not.toHaveBeenCalled(); expect(f.ensure).not.toHaveBeenCalled();
});

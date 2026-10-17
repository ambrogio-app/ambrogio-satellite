import { beforeEach, expect, test, vi } from 'vitest';
import { startSatellite } from '../../src/composition/satellite.js';

const f = vi.hoisted(() => ({
  stop: vi.fn(), shutdown: vi.fn(), channelClose: vi.fn(), ensure: vi.fn(),
  wakeClose: vi.fn(), wakeOpen: vi.fn(), vadOpen: vi.fn(), vadClose: vi.fn(),
  micStart: vi.fn(), micClose: vi.fn(), playbackCancel: vi.fn(), info: vi.fn(),
}));
vi.mock('../../src/adapters/out/local-notice.js', () => ({
  noticeSamples: async () => new Int16Array(2), voiceUnavailableSamples: async () => new Int16Array(2),
}));
vi.mock('../../src/adapters/out/diagnostics.js', () => ({ diagnostics: { info: f.info, failure: vi.fn() } }));
vi.mock('../../src/adapters/out/onnx-wake-word.js', () => ({ OnnxWakeWord: { open: f.wakeOpen } }));
vi.mock('../../src/adapters/out/silero-vad.js', () => ({ SileroVad: { open: f.vadOpen } }));
vi.mock('../../src/adapters/out/microphone-input.js', () => ({
  MicrophoneInput: class { start = f.micStart; close = f.micClose; },
}));
vi.mock('../../src/adapters/out/conversation-channel.js', () => ({
  ConversationChannel: class { ensure = f.ensure; close = f.channelClose; },
}));
vi.mock('../../src/adapters/out/response-playback.js', () => ({
  ResponsePlayback: class { cancel = f.playbackCancel; },
}));
vi.mock('../../src/adapters/in/conversation-events.adapter.js', () => ({ createConversationEventsAdapter: () => ({
  speech: {}, frames() {}, failed() {}, wakeDetected() {}, sessionLost() {},
}) }));
vi.mock('../../src/adapters/out/conversation-call.adapter.js', () => ({ createConversationCallAdapter: () => ({
  shutdown: f.shutdown, closeCall: f.stop,
  openCall: vi.fn(), setSpeechEnabled: vi.fn(), playReadyCue: vi.fn(), reportFailure: vi.fn(),
}) }));

const config = {
  backend: { sessionUrl: new URL('ws://localhost/api/session'), baseUrl: new URL('http://localhost') },
  client: { clientId: 'satellite-test', name: 'test' },
  audio: {}, wakeWord: { model: 'hey_jarvis' }, interaction: { replyTimeoutMs: 15000 },
};

beforeEach(() => {
  vi.resetAllMocks();
  f.wakeOpen.mockResolvedValue({ close: f.wakeClose, push() {}, reset() {}, async waitUntilIdle() {} });
  f.vadOpen.mockResolvedValue({ close: f.vadClose, push() {}, reset() {}, start() {} });
  f.ensure.mockResolvedValue(undefined);
  f.shutdown.mockResolvedValue(undefined);
});

test('opens the persistent session after starting the microphone', async () => {
  const satellite = await startSatellite(config);
  expect(f.micStart).toHaveBeenCalledOnce();
  expect(f.ensure).toHaveBeenCalledOnce();
  expect(f.micStart.mock.invocationCallOrder[0]!).toBeLessThan(f.ensure.mock.invocationCallOrder[0]!);
  await satellite.stop();
});

test('starts even when the backend is unreachable and reports it as information', async () => {
  f.ensure.mockRejectedValue(new Error('unreachable'));
  const satellite = await startSatellite(config);
  await vi.waitFor(() => expect(f.info).toHaveBeenCalledWith('satellite_session_unavailable'));
  await satellite.stop();
});

test('stops once and releases all remaining resources when session shutdown fails', async () => {
  const failure = new Error('close failed');
  f.stop.mockRejectedValue(failure);
  const satellite = await startSatellite(config);
  const a = satellite.stop(); const b = satellite.stop();
  expect(a).toBe(b);
  await expect(a).rejects.toMatchObject({ errors: expect.arrayContaining([failure]) });
  for (const close of [f.stop, f.shutdown, f.micClose, f.vadClose, f.wakeClose, f.playbackCancel]) {
    expect(close).toHaveBeenCalledOnce();
  }
  // The call adapter owns the channel shutdown once it exists.
  expect(f.channelClose).not.toHaveBeenCalled();
});

test('cleans up a partial microphone startup and preserves both failures', async () => {
  const startup = new Error('start failed'); const cleanup = new Error('release failed');
  f.micStart.mockRejectedValue(startup); f.wakeClose.mockRejectedValue(cleanup);
  await expect(startSatellite(config)).rejects.toMatchObject({ cause: startup,
    errors: expect.arrayContaining([startup, expect.objectContaining({ errors: expect.arrayContaining([cleanup]) })]) });
  expect(f.micClose).toHaveBeenCalledOnce(); expect(f.vadClose).toHaveBeenCalledOnce();
  expect(f.shutdown).toHaveBeenCalledOnce(); expect(f.ensure).not.toHaveBeenCalled();
});

test('releases resources acquired after abort during startup without starting microphone', async () => {
  let resolve!: (value: unknown) => void;
  f.wakeOpen.mockReturnValue(new Promise(r => { resolve = r; }));
  const abort = new AbortController();
  const starting = startSatellite(config, abort.signal);
  await vi.waitFor(() => expect(f.wakeOpen).toHaveBeenCalledOnce());
  abort.abort(); resolve({ close: f.wakeClose });
  await expect(starting).rejects.toMatchObject({ name: 'AbortError' });
  expect(f.micStart).not.toHaveBeenCalled(); expect(f.vadOpen).not.toHaveBeenCalled();
  expect(f.wakeClose).toHaveBeenCalledOnce(); expect(f.micClose).toHaveBeenCalledOnce();
  // Without a call adapter the channel is closed directly.
  expect(f.channelClose).toHaveBeenCalledOnce(); expect(f.ensure).not.toHaveBeenCalled();
});

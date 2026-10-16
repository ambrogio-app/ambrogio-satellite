import { beforeEach, expect, test, vi } from 'vitest';
import { startSatellite } from '../../src/composition/satellite.js';

const f = vi.hoisted(() => ({
  start: vi.fn(), stop: vi.fn(), detach: vi.fn(), attach: vi.fn(),
  wakeClose: vi.fn(), wakeOpen: vi.fn(), sileroClose: vi.fn(),
  micStop: vi.fn(), speakerStop: vi.fn(), shutdown: vi.fn(),
}));
vi.mock('@micdrop/client', () => ({ Mic: { setDriver() {} }, Speaker: { setDriver() {} }, setMicdropStorage() {} }));
vi.mock('../../src/adapters/out/local-notice.js', () => ({ noticeSamples: async () => new Int16Array(2) }));
vi.mock('../../src/adapters/out/silero-node.js', () => ({ installNodeSilero: () => ({ close: f.sileroClose }) }));
vi.mock('../../src/adapters/out/micdrop-decibri-drivers.js', () => ({
  DecibriMicDriver: class { close = f.micStop; }, DecibriSpeakerDriver: class { close = f.speakerStop; },
}));
vi.mock('../../src/adapters/out/onnx-wake-word.js', () => ({ OnnxWakeWord: { open: f.wakeOpen } }));
vi.mock('../../src/adapters/in/micdrop-events.adapter.js', () => ({ createMicdropEventsAdapter: () => ({
  attach: f.attach, detach: f.detach, failed() {}, responsePlayed() {}, wakeDetected() {},
}) }));
vi.mock('../../src/adapters/out/micdrop-call.adapter.js', () => ({ createMicdropCallAdapter: () => ({
  startListening: f.start, shutdown: f.shutdown, closeCall: f.stop,
  openCall: vi.fn(), setSpeechEnabled: vi.fn(), reportFailure: vi.fn(),
}) }));
const config = { backend: { voiceUrl: new URL('ws://localhost/api/voice'), baseUrl: new URL('http://localhost') },
  audio: {}, wakeWord: { model: 'hey_jarvis' }, interaction: { replyTimeoutMs: 15000 } };
beforeEach(() => {
  vi.resetAllMocks();
  f.wakeOpen.mockResolvedValue({ close: f.wakeClose, push() {}, reset() {}, async waitUntilIdle() {} });
});
test('stops once and releases all remaining resources when session shutdown fails', async () => {
  const failure = new Error('close failed');
  f.stop.mockRejectedValue(failure);
  const satellite = await startSatellite(config);
  const a = satellite.stop(); const b = satellite.stop();
  expect(a).toBe(b);
  await expect(a).rejects.toMatchObject({ errors: expect.arrayContaining([failure]) });
  for (const close of [f.stop, f.shutdown, f.micStop, f.speakerStop, f.sileroClose, f.wakeClose]) {
    expect(close).toHaveBeenCalledOnce();
  }
  expect(f.detach).toHaveBeenCalledOnce();
});
test('cleans up a partial microphone startup and preserves both failures', async () => {
  const startup = new Error('start failed'); const cleanup = new Error('release failed');
  f.start.mockRejectedValue(startup); f.wakeClose.mockRejectedValue(cleanup);
  await expect(startSatellite(config)).rejects.toMatchObject({ cause: startup,
    errors: expect.arrayContaining([startup, expect.objectContaining({ errors: expect.arrayContaining([cleanup]) })]) });
  expect(f.micStop).toHaveBeenCalledOnce(); expect(f.sileroClose).toHaveBeenCalledOnce();
});
test('releases resources acquired after abort during startup without starting microphone', async () => {
  let resolve!: (value: unknown) => void;
  f.wakeOpen.mockReturnValue(new Promise(r => { resolve = r; }));
  const abort = new AbortController();
  const starting = startSatellite(config, abort.signal);
  await vi.waitFor(() => expect(f.wakeOpen).toHaveBeenCalledOnce());
  abort.abort(); resolve({ close: f.wakeClose });
  await expect(starting).rejects.toMatchObject({ name: 'AbortError' });
  expect(f.start).not.toHaveBeenCalled(); expect(f.wakeClose).toHaveBeenCalledOnce();
  expect(f.micStop).toHaveBeenCalledOnce(); expect(f.speakerStop).toHaveBeenCalledOnce();
});

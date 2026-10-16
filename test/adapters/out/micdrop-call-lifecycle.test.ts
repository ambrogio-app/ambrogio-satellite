import { expect, test, vi } from 'vitest';
import { createMicdropCallAdapter } from '../../../src/adapters/out/micdrop-call.adapter.js';
const f = vi.hoisted(() => ({ start: vi.fn(), stop: vi.fn(async () => {}), startMic: vi.fn(), unmute: vi.fn() }));
vi.mock('@micdrop/client', () => ({ Micdrop: f, SileroVAD: class {} }));
vi.mock('../../../src/adapters/out/decibri-audio.js', () => ({ playPcm16: vi.fn() }));
vi.mock('../../../src/adapters/out/local-notice.js', () => ({ logFailure: vi.fn() }));

test('closes a call that completes opening after shutdown and never restarts listening', async () => {
  let opened!: () => void;
  f.start.mockReturnValue(new Promise<void>(resolve => { opened = resolve; }));
  let stopping = false;
  const call = createMicdropCallAdapter({ voiceUrl: 'ws://localhost/api/voice', audioReserveMs: 1500,
    notice: new Int16Array(2), playback: { cancel() {} },
    wake: { async waitUntilIdle() {}, reset() {} }, isStopping: () => stopping });
  const opening = call.openCall();
  stopping = true;
  const shutdown = call.shutdown(); expect(call.shutdown()).toBe(shutdown);
  expect(f.stop).toHaveBeenCalledOnce();
  opened(); await opening; await shutdown;
  expect(f.stop).toHaveBeenCalledTimes(2);
  await call.startListening(); await call.openCall();
  expect(f.startMic).not.toHaveBeenCalled(); expect(f.start).toHaveBeenCalledOnce();
});

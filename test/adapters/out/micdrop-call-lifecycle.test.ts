import { expect, test, vi } from 'vitest';
import { createMicdropCallAdapter } from '../../../src/adapters/out/micdrop-call.adapter.js';
import { diagnostics } from '../../../src/adapters/out/diagnostics.js';
import { playPcm16 } from '../../../src/adapters/out/decibri-audio.js';
const f = vi.hoisted(() => ({ start: vi.fn(), stop: vi.fn(async () => {}), startMic: vi.fn(),
  mute: vi.fn(), unmute: vi.fn() }));
vi.mock('@micdrop/client', () => ({ Micdrop: f, SileroVAD: class {} }));
vi.mock('../../../src/adapters/out/decibri-audio.js', () => ({ playPcm16: vi.fn() }));
vi.mock('../../../src/adapters/out/diagnostics.js', () => ({ diagnostics: { failure: vi.fn() } }));

test('closes a call that completes opening after shutdown and never restarts listening', async () => {
  let opened!: () => void;
  f.start.mockReturnValue(new Promise<void>(resolve => { opened = resolve; }));
  let stopping = false;
  const call = createMicdropCallAdapter({ voiceUrl: 'ws://localhost/api/voice', audioReserveMs: 1500,
    notice: new Int16Array(2), playback: { cancel() {} },
    wake: { async waitUntilIdle() {}, reset() {} }, isStopping: () => stopping });
  const opening = call.openCall();
  expect(f.mute).toHaveBeenCalledOnce();
  stopping = true;
  const shutdown = call.shutdown(); expect(call.shutdown()).toBe(shutdown);
  expect(f.stop).toHaveBeenCalledOnce();
  opened(); await opening; await shutdown;
  expect(f.stop).toHaveBeenCalledTimes(2);
  await call.startListening(); await call.openCall();
  expect(f.startMic).not.toHaveBeenCalled(); expect(f.start).toHaveBeenCalledOnce();
});

test('diagnoses interaction and notice playback failures separately without changing the spoken samples', async () => {
  vi.mocked(diagnostics.failure).mockClear();
  const original = new Error('secret interaction');
  const playbackError = new Error('secret playback');
  const notice = new Int16Array([3, 7]);
  const played: Int16Array[] = [];
  vi.mocked(playPcm16).mockImplementationOnce(async samples => {
    for await (const chunk of samples) played.push(chunk);
    throw playbackError;
  });
  const call = createMicdropCallAdapter({ voiceUrl: 'ws://localhost/api/voice', audioReserveMs: 1500,
    notice, playback: { cancel() {} }, wake: { async waitUntilIdle() {}, reset() {} }, isStopping: () => false });
  await call.reportFailure(original);
  expect(diagnostics.failure).toHaveBeenCalledTimes(2);
  expect(diagnostics.failure).toHaveBeenNthCalledWith(1, 'satellite_failure', original);
  expect(diagnostics.failure).toHaveBeenNthCalledWith(2, 'satellite_notice_failed', playbackError);
  expect(played).toEqual([notice]);
});

test('plays one brief local cue on the selected speaker and cancels it on shutdown', async () => {
  vi.mocked(playPcm16).mockReset();
  let cueSignal: AbortSignal | undefined;
  let cue: Int16Array | undefined;
  vi.mocked(playPcm16).mockImplementationOnce(async (chunks, selector, signal) => {
    expect(selector).toBe('alsa:cue-speaker');
    for await (const chunk of chunks) cue = chunk;
    cueSignal = signal;
    await new Promise<void>(resolve => signal?.addEventListener('abort', () => resolve(), { once: true }));
  });
  const call = createMicdropCallAdapter({ voiceUrl: 'ws://localhost/api/voice', audioReserveMs: 1500,
    speaker: 'alsa:cue-speaker', notice: new Int16Array(2), playback: { cancel() {} },
    wake: { async waitUntilIdle() {}, reset() {} }, isStopping: () => false });
  const playing = call.playReadyCue();
  await vi.waitFor(() => expect(cue).toBeDefined());
  expect(cue).toHaveLength(1600);
  expect(cue?.[0]).toBe(0);
  expect(cue?.[1599]).toBe(0);
  expect(Math.max(...cue!)).toBeLessThan(6000);
  expect(Math.max(...cue!)).toBeGreaterThan(4000);
  await call.shutdown(); await playing;
  expect(cueSignal?.aborted).toBe(true);
  expect(diagnostics.failure).not.toHaveBeenCalledWith('satellite_ready_cue_failed', expect.anything());
});

test('a local cue playback failure is diagnosed without rejecting the reply', async () => {
  vi.mocked(diagnostics.failure).mockClear();
  vi.mocked(playPcm16).mockRejectedValueOnce(new Error('speaker failed'));
  const call = createMicdropCallAdapter({ voiceUrl: 'ws://localhost/api/voice', audioReserveMs: 1500,
    notice: new Int16Array(2), playback: { cancel() {} },
    wake: { async waitUntilIdle() {}, reset() {} }, isStopping: () => false });
  await expect(call.playReadyCue()).resolves.toBeUndefined();
  expect(diagnostics.failure).toHaveBeenCalledExactlyOnceWith('satellite_ready_cue_failed', expect.any(Error));
});

import { beforeEach, expect, test, vi } from 'vitest';
import { createConversationCallAdapter } from './conversation-call.adapter.js';
import { readyCueSamples } from './ready-cue.js';

const f = vi.hoisted(() => ({
  plays: [] as Array<{ samples: number[]; speaker?: string; signal?: AbortSignal }>,
  play: undefined as undefined | ((signal?: AbortSignal) => Promise<void>),
  failure: vi.fn(),
}));
vi.mock('./decibri-audio.js', () => ({
  async playPcm16(chunks: AsyncIterable<Int16Array>, speaker: string | undefined, signal: AbortSignal | undefined) {
    const samples: number[] = [];
    for await (const chunk of chunks) samples.push(...chunk);
    f.plays.push({ samples, speaker, signal });
    await f.play?.(signal);
  },
}));

beforeEach(() => { f.plays.length = 0; f.play = undefined; f.failure.mockClear(); });

function adapter() {
  const vad = { reset: vi.fn(), start: vi.fn() };
  const speech = {};
  const call = createConversationCallAdapter({
    channel: { close: vi.fn(async () => {}), forgetRequest: vi.fn() } as never,
    vad: vad as never,
    speech: speech as never,
    playback: { cancel: vi.fn() } as never,
    speaker: 'test-speaker',
    wake: { waitUntilIdle: async () => {}, reset: vi.fn() },
    isStopping: () => false,
    diagnostics: { failure: f.failure },
  });
  return { call, vad, speech };
}

/** A playback that lasts until the test aborts it. */
const untilAborted = (signal?: AbortSignal) =>
  new Promise<void>(resolve => { signal?.addEventListener('abort', () => resolve(), { once: true }); });

// Verification: Regressione del segnale di ascolto
test('the ready cue is a 100 ms 880 Hz tone that never exceeds 0.18 of full scale', () => {
  const cue = readyCueSamples();
  expect(cue).toHaveLength(1_600);
  let crossings = 0;
  let peak = 0;
  for (let i = 0; i < cue.length; i++) {
    peak = Math.max(peak, Math.abs(cue[i]!));
    if (i > 0 && (cue[i - 1]! < 0) !== (cue[i]! < 0)) crossings++;
  }
  expect(crossings / 2 / 0.1).toBeCloseTo(880, -1);
  expect(peak).toBeGreaterThan(0);
  expect(peak).toBeLessThanOrEqual(0.18 * 32_768);
  expect(cue[0]).toBe(0);
  expect(cue.at(-1)).toBe(0);
});

// Verification: Regressione del segnale di ascolto
test('the ready cue plays on the configured speaker and resolves when it ends', async () => {
  const { call } = adapter();
  await call.playReadyCue();
  expect(f.plays).toEqual([{ samples: [...readyCueSamples()], speaker: 'test-speaker', signal: expect.any(AbortSignal) }]);
  expect(f.plays[0]!.signal?.aborted).toBe(false);
  expect(f.failure).not.toHaveBeenCalled();
});

// Verification: Regressione del segnale di ascolto
test('shutdown cancels the ready cue without a failure event', async () => {
  f.play = untilAborted;
  const { call } = adapter();
  const cue = call.playReadyCue();
  await vi.waitFor(() => expect(f.plays).toHaveLength(1));
  await call.shutdown();
  await expect(cue).resolves.toBeUndefined();
  expect(f.plays[0]!.signal?.aborted).toBe(true);
  expect(f.failure).not.toHaveBeenCalled();
});

// Verification: Regressione del segnale di ascolto
test('the end of the interaction cancels the ready cue still playing', async () => {
  f.play = untilAborted;
  const { call } = adapter();
  const cue = call.playReadyCue();
  await vi.waitFor(() => expect(f.plays).toHaveLength(1));
  await call.closeCall();
  await expect(cue).resolves.toBeUndefined();
  expect(f.plays[0]!.signal?.aborted).toBe(true);
  expect(f.failure).not.toHaveBeenCalled();
});

// Verification: Regressione del segnale di ascolto
test('a failed ready cue logs satellite_ready_cue_failed and listening still opens', async () => {
  const speakerGone = new Error('speaker gone');
  f.play = async () => { throw speakerGone; };
  const { call, vad, speech } = adapter();
  await expect(call.playReadyCue()).resolves.toBeUndefined();
  expect(f.failure).toHaveBeenCalledExactlyOnceWith('satellite_ready_cue_failed', speakerGone);
  call.setSpeechEnabled(true);
  expect(vad.start).toHaveBeenCalledExactlyOnceWith(speech);
});

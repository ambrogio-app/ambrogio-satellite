import { beforeEach, expect, test, vi } from 'vitest';
import { createConversationCallAdapter } from './conversation-call.adapter.js';
import { errorToneSamples, readyCueSamples } from './ready-cue.js';

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
  return createConversationCallAdapter({
    channel: { close: vi.fn(async () => {}), forgetRequest: vi.fn() } as never,
    vad: { reset: vi.fn() } as never,
    speech: {} as never,
    playback: { cancel: vi.fn() } as never,
    speaker: 'test-speaker',
    wake: { waitUntilIdle: async () => {}, reset: vi.fn() },
    isStopping: () => false,
    diagnostics: { failure: f.failure },
  });
}

function peak(samples: Int16Array, from: number, to: number): number {
  let max = 0;
  for (let i = from; i < to; i++) max = Math.max(max, Math.abs(samples[i]!));
  return max;
}

/** Zero crossings over a span give twice the frequency per second of signal. */
function frequency(samples: Int16Array, from: number, to: number): number {
  let crossings = 0;
  for (let i = from + 1; i < to; i++) if ((samples[i - 1]! < 0) !== (samples[i]! < 0)) crossings++;
  return crossings / 2 / ((to - from) / 16_000);
}

test('the error tone is two descending tones separated by silence', () => {
  const tone = errorToneSamples();
  expect(tone).toHaveLength(5_600);
  expect(frequency(tone, 0, 2_400)).toBeCloseTo(660, -1);
  expect(peak(tone, 2_400, 3_200)).toBe(0);
  expect(frequency(tone, 3_200, 5_600)).toBeCloseTo(440, -1);
  expect(peak(tone, 0, 5_600)).toBeLessThanOrEqual(Math.round(0.18 * 32_767));
  for (const edge of [0, 2_399, 3_200, 5_599]) expect(tone[edge]).toBe(0);
});

test('the error tone differs from the ready cue', () => {
  const cue = readyCueSamples();
  expect(cue).toHaveLength(1_600);
  expect(frequency(cue, 0, 1_600)).toBeCloseTo(880, -1);
  expect([...errorToneSamples()]).not.toEqual([...cue]);
});

test('a failed interaction is logged and plays the error tone on the configured speaker', async () => {
  const failure = new Error('backend unreachable');
  await adapter().reportFailure(failure);
  expect(f.failure).toHaveBeenCalledExactlyOnceWith('satellite_failure', failure);
  expect(f.plays).toEqual([{ samples: [...errorToneSamples()], speaker: 'test-speaker', signal: expect.any(AbortSignal) }]);
});

test('a failed error tone is logged and recovery continues', async () => {
  const speakerGone = new Error('speaker gone');
  f.play = async () => { throw speakerGone; };
  await expect(adapter().reportFailure(new Error('backend unreachable'))).resolves.toBeUndefined();
  expect(f.failure).toHaveBeenLastCalledWith('satellite_error_tone_failed', speakerGone);
});

test('shutdown cancels the error tone without a new failure event', async () => {
  f.play = signal => new Promise(resolve => { signal?.addEventListener('abort', () => resolve(), { once: true }); });
  const call = adapter();
  const reported = call.reportFailure(new Error('backend unreachable'));
  await vi.waitFor(() => expect(f.plays).toHaveLength(1));
  await call.shutdown();
  await reported;
  expect(f.plays[0]!.signal?.aborted).toBe(true);
  expect(f.failure).toHaveBeenCalledExactlyOnceWith('satellite_failure', expect.any(Error));
});

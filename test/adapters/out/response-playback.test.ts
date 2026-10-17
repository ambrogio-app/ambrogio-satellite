import { beforeEach, expect, test, vi } from 'vitest';
import { ResponsePlayback } from '../../../src/adapters/out/response-playback.js';

const f = vi.hoisted(() => ({ plays: [] as Array<{ samples: number[][]; sampleRate: number; signal?: AbortSignal;
  finished: boolean }>, gate: undefined as Promise<void> | undefined }));
vi.mock('../../../src/adapters/out/decibri-audio.js', () => ({
  async playPcm16(chunks: AsyncIterable<Int16Array>, _speaker: string | undefined, signal: AbortSignal | undefined,
    sampleRate: number) {
    const play = { samples: [] as number[][], sampleRate, signal, finished: false };
    f.plays.push(play);
    for await (const chunk of chunks) {
      if (signal?.aborted) return;
      play.samples.push([...chunk]);
    }
    if (f.gate) await f.gate;
    play.finished = true;
  },
}));

beforeEach(() => { f.plays.length = 0; f.gate = undefined; });

function playback(failed = vi.fn()) {
  return new ResponsePlayback({ voiceUnavailable: Int16Array.from([7, 7]), failed });
}

test('plays transmissions one after the other at their declared sample rate', async () => {
  const player = playback();
  player.start(1, { type: 'audio', sampleRate: 22_050 });
  player.audio(1, Int16Array.from([1, 2]));
  player.start(2, { type: 'audio', sampleRate: 16_000 });
  player.audio(2, Int16Array.from([3]));
  player.audio(1, Int16Array.from([4]));
  player.audio(99, Int16Array.from([9]));
  await new Promise(resolve => setTimeout(resolve, 10));
  expect(f.plays).toHaveLength(1);
  player.end(1);
  player.end(2);
  await player.idle();
  expect(f.plays.map(play => [play.sampleRate, play.samples, play.finished])).toEqual([
    [22_050, [[1, 2], [4]], true],
    [16_000, [[3]], true],
  ]);
});

test('replaces a text transmission with the voice-unavailable notice', async () => {
  const player = playback();
  player.start(3, { type: 'text' });
  player.end(3);
  await player.idle();
  expect(f.plays.map(play => [play.sampleRate, play.samples])).toEqual([[16_000, [[7, 7]]]]);
});

test('idle waits until the last transmission has finished playing', async () => {
  let release!: () => void;
  f.gate = new Promise(resolve => { release = resolve; });
  const player = playback();
  player.start(1, { type: 'audio', sampleRate: 16_000 });
  player.audio(1, Int16Array.from([1]));
  player.end(1);
  let idle = false;
  void player.idle().then(() => { idle = true; });
  await new Promise(resolve => setTimeout(resolve, 10));
  expect(idle).toBe(false);
  release();
  await vi.waitFor(() => expect(idle).toBe(true));
});

test('cancel aborts the current playback and skips queued transmissions', async () => {
  const player = playback();
  player.start(1, { type: 'audio', sampleRate: 16_000 });
  player.start(2, { type: 'audio', sampleRate: 16_000 });
  await vi.waitFor(() => expect(f.plays).toHaveLength(1));
  player.cancel();
  expect(f.plays[0]!.signal?.aborted).toBe(true);
  await player.idle();
  await new Promise(resolve => setTimeout(resolve, 10));
  expect(f.plays).toHaveLength(1);
  // A new turn plays normally after cancel.
  player.start(3, { type: 'audio', sampleRate: 16_000 });
  player.audio(3, Int16Array.from([5]));
  player.end(3);
  await player.idle();
  expect(f.plays.at(-1)!.samples).toEqual([[5]]);
});

test('reports a playback failure unless it was cancelled', async () => {
  const failed = vi.fn();
  const player = playback(failed);
  const failure = new Error('speaker gone');
  const decibri = await import('../../../src/adapters/out/decibri-audio.js');
  vi.spyOn(decibri, 'playPcm16').mockRejectedValueOnce(failure);
  player.start(1, { type: 'audio', sampleRate: 16_000 });
  player.end(1);
  await player.idle();
  expect(failed).toHaveBeenCalledExactlyOnceWith(failure);
});

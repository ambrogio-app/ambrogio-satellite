import { afterEach, describe, expect, it, vi } from 'vitest';
import { Microphone, Speaker } from 'decibri';
import { openConfiguredMicrophone, playPcm16 } from '../../../src/adapters/out/decibri-audio.js';

afterEach(() => vi.restoreAllMocks());

async function* oneChunk(): AsyncIterable<Int16Array> {
  yield new Int16Array([1, -1]);
}

describe('Decibri device selection', () => {
  it('passes an explicit ALSA ID without falling back to the default microphone', async () => {
    const failure = new Error('device unavailable');
    const open = vi.spyOn(Microphone, 'open').mockRejectedValue(failure);
    await expect(openConfiguredMicrophone('alsa:card1')).rejects.toBe(failure);
    expect(open).toHaveBeenCalledExactlyOnceWith({
      sampleRate: 16_000, channels: 1, dtype: 'float32', device: { id: 'alsa:card1' },
    });
  });

  it('leaves the microphone device unset for the system default', async () => {
    const open = vi.spyOn(Microphone, 'open').mockResolvedValue({} as Microphone);
    await openConfiguredMicrophone();
    expect(open).toHaveBeenCalledExactlyOnceWith({
      sampleRate: 16_000, channels: 1, dtype: 'float32',
    });
  });

  it('waits for queued output to play and releases the speaker', async () => {
    let releaseDrain: (() => void) | undefined;
    const drain = new Promise<void>(resolve => { releaseDrain = resolve; });
    const writeAsync = vi.fn().mockResolvedValue(undefined);
    const stop = vi.fn();
    const speaker = { writeAsync, drainAsync: vi.fn().mockReturnValue(drain), stop } as unknown as Speaker;
    const open = vi.spyOn(Speaker, 'open').mockResolvedValue(speaker);

    let completed = false;
    const playback = playPcm16(oneChunk(), 'USB Speaker').then(() => { completed = true; });
    await vi.waitFor(() => expect(speaker.drainAsync).toHaveBeenCalledOnce());
    expect(open).toHaveBeenCalledExactlyOnceWith({
      sampleRate: 16_000, channels: 1, dtype: 'int16', device: 'USB Speaker',
    });
    expect(writeAsync).toHaveBeenCalledExactlyOnceWith(Buffer.from([1, 0, 255, 255]));
    expect(completed).toBe(false);
    expect(stop).not.toHaveBeenCalled();

    releaseDrain?.();
    await playback;
    expect(stop).toHaveBeenCalledOnce();
  });

  it('stops the speaker after a failed write', async () => {
    const failure = new Error('speaker disconnected');
    const stop = vi.fn();
    vi.spyOn(Speaker, 'open').mockResolvedValue({
      writeAsync: vi.fn().mockRejectedValue(failure),
      drainAsync: vi.fn(),
      stop,
    } as unknown as Speaker);
    await expect(playPcm16(oneChunk())).rejects.toBe(failure);
    expect(stop).toHaveBeenCalledOnce();
  });
});

it('cancels a pending local notice drain and releases its speaker once', async () => {
  const stop = vi.fn();
  const drainAsync = vi.fn(() => new Promise<void>(() => {}));
  vi.spyOn(Speaker, 'open').mockResolvedValue({ writeAsync: vi.fn(async () => {}), drainAsync, stop } as unknown as Speaker);
  const controller = new AbortController();
  const playing = playPcm16(oneChunk(), undefined, controller.signal);
  await vi.waitFor(() => expect(drainAsync).toHaveBeenCalledOnce());
  controller.abort();
  await playing;
  expect(stop).toHaveBeenCalledOnce();
});

it('releases a notice speaker acquired after cancellation without playing it', async () => {
  let opened!: (speaker: Speaker) => void;
  vi.spyOn(Speaker, 'open').mockReturnValue(new Promise(resolve => { opened = resolve; }));
  const controller = new AbortController();
  const playing = playPcm16(oneChunk(), undefined, controller.signal);
  controller.abort();
  const stop = vi.fn(); const writeAsync = vi.fn();
  opened({ stop, writeAsync } as unknown as Speaker);
  await playing;
  expect(stop).toHaveBeenCalledOnce(); expect(writeAsync).not.toHaveBeenCalled();
});

it('preserves the playback error when releasing the device also fails', async () => {
  const original = new Error('write failed'); const cleanup = new Error('stop failed');
  vi.spyOn(Speaker, 'open').mockResolvedValue({ writeAsync: vi.fn().mockRejectedValue(original),
    stop: vi.fn(() => { throw cleanup; }) } as unknown as Speaker);
  await expect(playPcm16(oneChunk())).rejects.toMatchObject({ cause: original, errors: [original, cleanup] });
});

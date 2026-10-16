import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Microphone, Speaker } from 'decibri';
import { DecibriMicDriver, DecibriSpeakerDriver } from '../../../src/adapters/out/micdrop-decibri-drivers.js';

afterEach(() => vi.restoreAllMocks());

describe('Decibri Micdrop microphone driver', () => {
  it('feeds float32 frames from the selected device and releases it', async () => {
    const mic = Object.assign(new EventEmitter(), { stop: vi.fn() }) as unknown as Microphone;
    const open = vi.spyOn(Microphone, 'open').mockResolvedValue(mic);
    const driver = new DecibriMicDriver('alsa:card1');
    const frames: Float32Array[] = [];
    driver.on('Frames', samples => frames.push(samples));

    await driver.start();
    expect(open).toHaveBeenCalledExactlyOnceWith({
      sampleRate: 16_000, channels: 1, dtype: 'float32', device: { id: 'alsa:card1' },
    });
    const original = new Float32Array([0.25, -0.5]);
    mic.emit('data', Buffer.from(original.buffer));
    expect(frames).toHaveLength(1);
    expect(frames[0]).toEqual(original);
    expect(frames[0]).not.toBe(original);
    await driver.stop();
    expect(mic.stop).toHaveBeenCalledOnce();
    expect(driver.isStarted).toBe(false);
  });
});

describe('Decibri Micdrop speaker driver', () => {
  it('keeps playing until the native queue drains', async () => {
    let releaseDrain: (() => void) | undefined;
    const drained = new Promise<void>(resolve => { releaseDrain = resolve; });
    const speaker = Object.assign(new EventEmitter(), {
      writeAsync: vi.fn().mockResolvedValue(undefined),
      drainAsync: vi.fn().mockReturnValue(drained),
      stop: vi.fn(),
    }) as unknown as Speaker;
    vi.spyOn(Speaker, 'open').mockResolvedValue(speaker);
    const driver = new DecibriSpeakerDriver('alsa:card2');
    const states: string[] = [];
    driver.on('StartPlaying', () => states.push('start'));
    driver.on('StopPlaying', () => states.push('stop'));

    driver.play(new Int16Array([1, -1]), 16_000);
    await vi.waitFor(() => expect(speaker.drainAsync).toHaveBeenCalledOnce());
    expect(driver.isPlaying).toBe(true);
    expect(states).toEqual(['start']);
    releaseDrain?.();
    await vi.waitFor(() => expect(states).toEqual(['start', 'stop']));
    expect(speaker.stop).toHaveBeenCalledOnce();
  });

  it('reports a failed write and stops playback', async () => {
    const failure = new Error('device disconnected');
    const speaker = Object.assign(new EventEmitter(), {
      writeAsync: vi.fn().mockRejectedValue(failure),
      drainAsync: vi.fn(),
      stop: vi.fn(),
    }) as unknown as Speaker;
    vi.spyOn(Speaker, 'open').mockResolvedValue(speaker);
    const onFailure = vi.fn();
    const driver = new DecibriSpeakerDriver(undefined, onFailure);

    driver.play(new Int16Array([1]), 16_000);
    await vi.waitFor(() => expect(onFailure).toHaveBeenCalledExactlyOnceWith(failure));
    expect(driver.isPlaying).toBe(false);
    expect(speaker.stop).toHaveBeenCalledOnce();
  });
});

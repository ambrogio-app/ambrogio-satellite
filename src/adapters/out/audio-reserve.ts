/** Rolling window of the most recent microphone samples, kept only in memory. */
export class AudioReserve {
  private readonly samples: Float32Array;
  private length = 0;

  constructor(capacity: number) {
    if (!Number.isSafeInteger(capacity) || capacity <= 0) throw new Error('Invalid audio reserve capacity');
    this.samples = new Float32Array(capacity);
  }

  push(frames: Float32Array): void {
    const capacity = this.samples.length;
    if (frames.length >= capacity) {
      this.samples.set(frames.subarray(frames.length - capacity));
      this.length = capacity;
      return;
    }
    const keep = Math.min(this.length, capacity - frames.length);
    this.samples.copyWithin(0, this.length - keep, this.length);
    this.samples.set(frames, keep);
    this.length = keep + frames.length;
  }

  /** The reserved samples, oldest first; the reserve is emptied. */
  take(): Float32Array {
    const taken = this.samples.slice(0, this.length);
    this.length = 0;
    return taken;
  }
}

/** Float samples in [-1, 1] as PCM16. */
export function toPcm16(frames: Float32Array): Int16Array {
  const pcm = new Int16Array(frames.length);
  for (let index = 0; index < frames.length; index++) {
    const value = Math.max(-1, Math.min(1, frames[index]!));
    pcm[index] = Math.round(value < 0 ? value * 32_768 : value * 32_767);
  }
  return pcm;
}

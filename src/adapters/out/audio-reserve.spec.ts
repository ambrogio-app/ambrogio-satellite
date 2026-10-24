import { describe, expect, it } from 'vitest';
import { AudioReserve, toPcm16 } from './audio-reserve.js';

describe('audio reserve', () => {
  it('keeps only the most recent samples, oldest first', () => {
    const reserve = new AudioReserve(5);
    reserve.push(new Float32Array([1, 2]));
    reserve.push(new Float32Array([3, 4]));
    expect([...reserve.take()]).toEqual([1, 2, 3, 4]);
    reserve.push(new Float32Array([1, 2, 3]));
    reserve.push(new Float32Array([4, 5, 6, 7]));
    expect([...reserve.take()]).toEqual([3, 4, 5, 6, 7]);
    reserve.push(new Float32Array([1, 2, 3, 4, 5, 6, 7, 8]));
    expect([...reserve.take()]).toEqual([4, 5, 6, 7, 8]);
  });

  it('is emptied by take', () => {
    const reserve = new AudioReserve(3);
    reserve.push(new Float32Array([1]));
    reserve.take();
    expect([...reserve.take()]).toEqual([]);
  });

  it.each([0, -1, 1.5])('rejects capacity %s', capacity => {
    expect(() => new AudioReserve(capacity)).toThrow('capacity');
  });

  it('converts float samples to clamped PCM16', () => {
    expect([...toPcm16(new Float32Array([0, 1, -1, 2, -2, 0.5, -0.5]))])
      .toEqual([0, 32767, -32768, 32767, -32768, 16384, -16384]);
  });
});

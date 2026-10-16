import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MicdropPlaybackBoundary } from '../../../src/adapters/out/micdrop-playback.js';

describe('Micdrop playback completion estimate', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('does not finish before playback starts and waits for Decibri to drain', () => {
    const done = vi.fn();
    const boundary = new MicdropPlaybackBoundary(1000, done);
    boundary.begin();
    boundary.update(false);
    vi.advanceTimersByTime(2000);
    expect(done).not.toHaveBeenCalled();
    boundary.update(true);
    vi.advanceTimersByTime(2000);
    expect(done).not.toHaveBeenCalled();
    boundary.update(false);
    vi.advanceTimersByTime(999);
    expect(done).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(done).toHaveBeenCalledOnce();
  });

  it('resets quiet time when more audio arrives before the interval ends', () => {
    const done = vi.fn();
    const boundary = new MicdropPlaybackBoundary(1000, done);
    boundary.begin();
    boundary.update(true);
    boundary.update(false);
    vi.advanceTimersByTime(900);
    boundary.update(true);
    boundary.update(false);
    vi.advanceTimersByTime(999);
    expect(done).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(done).toHaveBeenCalledOnce();
  });

  it('cancels a pending completion when a call closes', () => {
    const done = vi.fn();
    const boundary = new MicdropPlaybackBoundary(1000, done);
    boundary.begin();
    boundary.update(true);
    boundary.update(false);
    boundary.cancel();
    vi.advanceTimersByTime(2000);
    expect(done).not.toHaveBeenCalled();
  });
});

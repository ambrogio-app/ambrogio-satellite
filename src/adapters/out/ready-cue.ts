const SAMPLE_RATE = 16_000;
const FADE_MS = 10;
const AMPLITUDE = 0.18 * 32_767;

/** One sine tone; fades prevent clicks at its edges. */
function tone(frequencyHz: number, durationMs: number): Int16Array {
  const length = SAMPLE_RATE * durationMs / 1000;
  const fade = SAMPLE_RATE * FADE_MS / 1000;
  const samples = new Int16Array(length);
  for (let i = 0; i < length; i++) {
    const envelope = Math.min(1, i / fade, (length - 1 - i) / fade);
    samples[i] = Math.round(AMPLITUDE * envelope * Math.sin(2 * Math.PI * frequencyHz * i / SAMPLE_RATE));
  }
  return samples;
}

/** Brief local cue: the person may speak once it ends. */
export function readyCueSamples(): Int16Array {
  return tone(880, 100);
}

/** Two descending tones, distinct from the ready cue, for a failed interaction or an unavailable voice. */
export function errorToneSamples(): Int16Array {
  const high = tone(660, 150);
  const gap = SAMPLE_RATE * 50 / 1000;
  const samples = new Int16Array(high.length + gap + high.length);
  samples.set(high, 0);
  samples.set(tone(440, 150), high.length + gap);
  return samples;
}

const SAMPLE_RATE = 16_000;
const DURATION_MS = 100;
const FADE_MS = 10;
const FREQUENCY_HZ = 880;
const AMPLITUDE = 0.18 * 32_767;

/** Brief local cue; fades prevent clicks at its edges. */
export function readyCueSamples(): Int16Array {
  const length = SAMPLE_RATE * DURATION_MS / 1000;
  const fade = SAMPLE_RATE * FADE_MS / 1000;
  const samples = new Int16Array(length);
  for (let i = 0; i < length; i++) {
    const envelope = Math.min(1, i / fade, (length - 1 - i) / fade);
    samples[i] = Math.round(AMPLITUDE * envelope * Math.sin(2 * Math.PI * FREQUENCY_HZ * i / SAMPLE_RATE));
  }
  return samples;
}

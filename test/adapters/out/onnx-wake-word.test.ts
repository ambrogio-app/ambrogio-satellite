import { describe, expect, it } from 'vitest';

describe('distributed ONNX wake word models', () => {
  it('loads every selectable model and processes silence with the shared feature files', async () => {
    process.env.ORT_DISABLE_TELEMETRY = '1';
    const [{ OnnxWakeWord }, { wakeWordFiles, distributedWakeWordIds }] = await Promise.all([
      import('../../../src/adapters/out/onnx-wake-word.js'),
      import('../../../src/adapters/out/wake-word-catalog.js'),
    ]);
    expect([...distributedWakeWordIds].sort()).toEqual(['alexa', 'hey_jarvis', 'hey_mycroft']);
    for (const id of ['alexa', 'hey_jarvis', 'hey_mycroft'] as const) {
      const detected: number[] = [];
      const failures: unknown[] = [];
      const detector = await OnnxWakeWord.open(wakeWordFiles(id), {
        threshold: 0.5,
        patience: 1,
        cooldownMs: 0,
        maxQueuedChunks: 20,
        detected: score => detected.push(score),
        failed: error => failures.push(error),
      });
      for (let index = 0; index < 18; index++) {
        expect(detector.push(new Float32Array(1_280))).toBe(true);
      }
      await detector.waitUntilIdle();
      await detector.close();
      expect(failures).toEqual([]);
      expect(detected).toEqual([]);
    }
  });
});

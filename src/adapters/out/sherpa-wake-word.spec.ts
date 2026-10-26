// Verification: Prova della conferma con l'attività vocale
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { KeywordSpotterConfig, SherpaEngine, SherpaKeywordSpotter, SherpaVad } from './sherpa-engine.js';
import { SherpaWakeWord, WAKE_BLOCK_SAMPLES, type WakeWordOptions } from './sherpa-wake-word.js';

const clip = fileURLToPath(new URL('../../../test/support/alexa-it.wav', import.meta.url));

/** Per 80 ms block: `s` speech, `k` keyword, `b` both, `.` neither. */
function scripted(script: string) {
  const blocks = [...script];
  let current = '.';
  const configs: KeywordSpotterConfig[] = [];
  let ready = false;
  const vad: SherpaVad = {
    acceptWaveform: () => { current = blocks.shift() ?? '.'; },
    isDetected: () => current === 's' || current === 'b',
    isEmpty: () => true,
    pop: () => undefined,
    reset: () => undefined,
  };
  const spotter: SherpaKeywordSpotter = {
    createStream: () => ({ acceptWaveform: () => { ready = true; } }),
    isReady: () => ready,
    decode: () => { ready = false; },
    getResult: () => ({ keyword: current === 'k' || current === 'b' ? '▁A LE X A' : '' }),
    reset: () => undefined,
  };
  const engine: SherpaEngine = {
    createVad: () => vad,
    createKeywordSpotter: config => { configs.push(config); return spotter; },
  };
  return { engine, configs };
}

function open(script: string, overrides: Partial<WakeWordOptions> = {}) {
  const log: string[] = [];
  const { engine, configs } = scripted(script);
  const wake = SherpaWakeWord.open({ wakeWord: 'Alexa', threshold: 0.25, speechWindowMs: 1_500, cooldownMs: 2_000,
    detected: () => log.push('detected'), rejected: () => log.push('rejected'), failed: () => log.push('failed'),
    ...overrides }, {}, engine);
  const blocks = (count: number) => { for (let i = 0; i < count; i++) wake.push(new Float32Array(WAKE_BLOCK_SAMPLES)); };
  return { wake, log, blocks, configs };
}

describe('wake word confirmed by speech detection', () => {
  it('passes the tokens of the wake word and the threshold to the keyword spotter', () => {
    const { configs } = open('');
    expect(configs[0]).toMatchObject({ keywordsBuf: '▁A LE X A', keywordsBufSize: Buffer.byteLength('▁A LE X A'),
      keywordsThreshold: 0.25, keywordsScore: 1, maxActivePaths: 4, numTrailingBlanks: 1,
      featConfig: { sampleRate: 16_000, featureDim: 80 } });
    expect(configs[0]!.modelConfig).toMatchObject({ numThreads: 1, provider: 'cpu' });
  });

  it('accepts a detection with speech in the window and rejects one without speech', () => {
    const accepted = open('sssk');
    accepted.blocks(4);
    expect(accepted.log).toEqual(['detected']);
    const rejected = open('...k');
    rejected.blocks(4);
    expect(rejected.log).toEqual(['rejected']);
  });

  it('counts only the speech of the 1500 ms that end with the detection', () => {
    // Speech in block 1, detection in block 19: 18 blocks later, 1440 ms, still inside the window.
    const inside = open(`s${'.'.repeat(17)}k`);
    inside.blocks(19);
    expect(inside.log).toEqual(['detected']);
    // Detection in block 20: 1520 ms after the speech, outside the window.
    const outside = open(`s${'.'.repeat(18)}k`);
    outside.blocks(20);
    expect(outside.log).toEqual(['rejected']);
  });

  it('ignores detections within 2000 ms of a confirmed one', () => {
    const { log, blocks } = open(`b${'.'.repeat(10)}b${'.'.repeat(20)}b`);
    blocks(33);
    expect(log).toEqual(['detected', 'detected']);
  });

  it('forgets earlier speech at reset', () => {
    const { wake, log, blocks } = open(`ss${'.'.repeat(25)}k`);
    blocks(2);
    wake.reset();
    blocks(26);
    expect(log).toEqual(['rejected']);
  });

  it('processes whole 80 ms blocks only, across pushes of any size', () => {
    const { wake, log } = open('...k');
    wake.push(new Float32Array(WAKE_BLOCK_SAMPLES * 3 + 100));
    expect(log).toEqual([]);
    wake.push(new Float32Array(WAKE_BLOCK_SAMPLES - 100));
    expect(log).toEqual(['rejected']);
  });

  it('refuses invalid options, a wake word that the model cannot represent and a missing model', () => {
    const { engine } = scripted('');
    const options: WakeWordOptions = { wakeWord: 'Alexa', threshold: 0.25, speechWindowMs: 1_500, cooldownMs: 2_000,
      detected: () => undefined, rejected: () => undefined, failed: () => undefined };
    expect(() => SherpaWakeWord.open({ ...options, threshold: 1 }, {}, engine)).toThrow();
    expect(() => SherpaWakeWord.open({ ...options, wakeWord: 'Città' }, {}, engine)).toThrow();
    expect(() => SherpaWakeWord.open(options, { speechDetection: '/missing/silero_vad.onnx' }, engine)).toThrow();
    expect(() => SherpaWakeWord.open(options, { keywordSpotting: '/missing/kws' }, engine)).toThrow();
  });

  it('reports a native error as a failure and accepts no audio after close', async () => {
    const { engine } = scripted('');
    const failing: SherpaEngine = { ...engine, createVad: model => ({ ...engine.createVad(model),
      acceptWaveform: () => { throw new Error('native failure'); } }) };
    const log: string[] = [];
    const wake = SherpaWakeWord.open({ wakeWord: 'Alexa', threshold: 0.25, speechWindowMs: 1_500, cooldownMs: 2_000,
      detected: () => log.push('detected'), rejected: () => log.push('rejected'), failed: () => log.push('failed') },
    {}, failing);
    expect(wake.push(new Float32Array(WAKE_BLOCK_SAMPLES))).toBe(false);
    expect(log).toEqual(['failed']);
    await wake.waitUntilIdle();
    await wake.close();
    expect(wake.push(new Float32Array(WAKE_BLOCK_SAMPLES))).toBe(false);
  });
});

describe('distributed models', () => {
  it('detect the default wake word in the test clip, confirmed by speech, and nothing in silence', () => {
    const { readWave } = createRequire(import.meta.url)('sherpa-onnx-node') as
      { readWave(path: string): { samples: Float32Array } };
    const log: string[] = [];
    const wake = SherpaWakeWord.open({ wakeWord: 'Alexa', threshold: 0.25, speechWindowMs: 1_500, cooldownMs: 2_000,
      detected: () => log.push('detected'), rejected: () => log.push('rejected'), failed: () => log.push('failed') });
    for (let block = 0; block < 60; block++) wake.push(new Float32Array(WAKE_BLOCK_SAMPLES));
    expect(log).toEqual([]);
    const samples = readWave(clip).samples;
    for (let at = 0; at < samples.length; at += 1_600) wake.push(samples.subarray(at, at + 1_600));
    expect(log).toEqual(['detected']);
  });
});

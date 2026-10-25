// Verification: Prova dei modelli sherpa-onnx registrati
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SPEECH_DETECTION, type SherpaEngine, type SherpaVad } from './sherpa-engine.js';
import { SherpaSpeechDetector, type SpeechEvents } from './sherpa-speech-detector.js';
import { VAD_MODEL } from './voice-models.js';

const clip = fileURLToPath(new URL('../../../test/support/alexa-it.wav', import.meta.url));

function recorder() {
  const log: string[] = [];
  const events: SpeechEvents = {
    confirmed: () => log.push('confirmed'),
    ended: () => log.push('ended'),
    failed: () => log.push('failed'),
  };
  return { log, events };
}

/** A detector whose "speech in progress" state follows a script, one value per accepted block. */
function scripted(states: boolean[]) {
  const calls: string[] = [];
  let current = false;
  let queued = 0;
  const vad: SherpaVad = {
    acceptWaveform: () => { current = states.shift() ?? false; if (!current) queued++; calls.push('accept'); },
    isDetected: () => current,
    isEmpty: () => queued === 0,
    pop: () => { queued--; calls.push('pop'); },
    reset: () => { current = false; calls.push('reset'); },
  };
  const engine: SherpaEngine = {
    createVad: () => vad,
    createKeywordSpotter: () => { throw new Error('not used'); },
  };
  return { engine, calls };
}

describe('speech detection with sherpa-onnx', () => {
  it('uses the parameters of the contract', () => {
    expect(SPEECH_DETECTION).toEqual({ threshold: 0.26, minSpeechDuration: 0.128, minSilenceDuration: 0.64,
      maxSpeechDuration: 55, windowSize: 512 });
  });

  it('reports confirmation and end once each, and drops the queued segments', () => {
    const { engine, calls } = scripted([false, true, true, false, false]);
    const detector = SherpaSpeechDetector.open(VAD_MODEL, engine);
    const { log, events } = recorder();
    detector.start(events);
    for (let block = 0; block < 5; block++) detector.push(new Float32Array(1_600));
    expect(log).toEqual(['confirmed', 'ended']);
    expect(calls.filter(call => call === 'pop').length).toBeGreaterThan(0);
  });

  it('reports nothing before start, after reset and after close', () => {
    const { engine } = scripted([true, true, true]);
    const detector = SherpaSpeechDetector.open(VAD_MODEL, engine);
    const { log, events } = recorder();
    detector.push(new Float32Array(1_600));
    detector.start(events);
    detector.reset();
    detector.push(new Float32Array(1_600));
    void detector.close();
    detector.push(new Float32Array(1_600));
    expect(log).toEqual([]);
  });

  it('turns a native error into a failure and stops reporting', () => {
    const { engine } = scripted([]);
    const failing: SherpaEngine = { ...engine, createVad: () => ({ ...engine.createVad(VAD_MODEL),
      acceptWaveform: () => { throw new Error('native failure'); } }) };
    const detector = SherpaSpeechDetector.open(VAD_MODEL, failing);
    const { log, events } = recorder();
    detector.start(events);
    detector.push(new Float32Array(1_600));
    detector.push(new Float32Array(1_600));
    expect(log).toEqual(['failed']);
  });

  it('refuses a missing model before creating the detector', () => {
    const { engine } = scripted([]);
    expect(() => SherpaSpeechDetector.open('/missing/silero_vad.onnx', engine)).toThrow();
  });

  it('confirms and ends the speech of the test clip with the distributed model, and ignores silence', () => {
    const { readWave } = createRequire(import.meta.url)('sherpa-onnx-node') as
      { readWave(path: string): { samples: Float32Array } };
    const speech = SherpaSpeechDetector.open();
    const { log, events } = recorder();
    speech.start(events);
    const samples = readWave(clip).samples;
    const audio = new Float32Array(samples.length + 16_000);
    audio.set(samples);
    for (let at = 0; at < audio.length; at += 1_600) speech.push(audio.subarray(at, at + 1_600));
    expect(log).toEqual(['confirmed', 'ended']);

    const quiet = recorder();
    speech.start(quiet.events);
    for (let block = 0; block < 50; block++) speech.push(new Float32Array(1_600));
    expect(quiet.log).toEqual([]);
  });
});

import { createRequire } from 'node:module';

/** Microphone audio is mono float32 at 16 kHz. */
export const SAMPLE_RATE = 16_000;

/** «Segmentazione dei turni con sherpa-onnx»: the Silero parameters, also used to confirm the wake word. */
export const SPEECH_DETECTION = {
  threshold: 0.26,
  minSpeechDuration: 0.128,
  minSilenceDuration: 0.64,
  maxSpeechDuration: 55,
  windowSize: 512,
} as const;
/** Seconds of audio the native detector may hold: the longest speech plus a margin. */
const VAD_BUFFER_SECONDS = 60;

/** The part of `sherpa-onnx-node`'s `Vad` used by the satellite. */
export type SherpaVad = Readonly<{
  acceptWaveform(samples: Float32Array): void;
  isDetected(): boolean;
  isEmpty(): boolean;
  pop(): void;
  reset(): void;
}>;

export type SherpaKeywordStream = Readonly<{
  acceptWaveform(waveform: Readonly<{ samples: Float32Array; sampleRate: number }>): void;
}>;

/** The part of `sherpa-onnx-node`'s `KeywordSpotter` used by the satellite. */
export type SherpaKeywordSpotter = Readonly<{
  createStream(): SherpaKeywordStream;
  isReady(stream: SherpaKeywordStream): boolean;
  decode(stream: SherpaKeywordStream): void;
  getResult(stream: SherpaKeywordStream): Readonly<{ keyword?: string }>;
  reset(stream: SherpaKeywordStream): void;
}>;

export type KeywordSpotterConfig = Readonly<{
  featConfig: Readonly<{ sampleRate: number; featureDim: number }>;
  modelConfig: Readonly<{
    transducer: Readonly<{ encoder: string; decoder: string; joiner: string }>;
    tokens: string;
    numThreads: number;
    provider: 'cpu';
    debug: number;
  }>;
  maxActivePaths: number;
  numTrailingBlanks: number;
  keywordsScore: number;
  keywordsThreshold: number;
  keywordsBuf: string;
  keywordsBufSize: number;
}>;

/** The native constructors, replaced in tests. */
export type SherpaEngine = Readonly<{
  createVad(modelPath: string): SherpaVad;
  createKeywordSpotter(config: KeywordSpotterConfig): SherpaKeywordSpotter;
}>;

type NativeModule = {
  Vad: new (config: object, bufferSizeInSeconds: number) => SherpaVad;
  KeywordSpotter: new (config: KeywordSpotterConfig) => SherpaKeywordSpotter;
};

/** `sherpa-onnx-node` is CommonJS without type declarations; it is loaded only when a model is opened. */
export function nativeSherpa(): SherpaEngine {
  const sherpa = createRequire(import.meta.url)('sherpa-onnx-node') as NativeModule;
  return {
    createVad: model => new sherpa.Vad({
      sileroVad: { model, ...SPEECH_DETECTION },
      sampleRate: SAMPLE_RATE, numThreads: 1, provider: 'cpu', debug: 0,
    }, VAD_BUFFER_SECONDS),
    createKeywordSpotter: config => new sherpa.KeywordSpotter(config),
  };
}

/** Feed samples and drop the finished segments the detector queues: the audio already went to the backend. */
export function acceptSpeech(vad: SherpaVad, samples: Float32Array): boolean {
  vad.acceptWaveform(samples);
  while (!vad.isEmpty()) vad.pop();
  return vad.isDetected();
}

/** Forget every sample and state of the detector. */
export function resetSpeech(vad: SherpaVad): void {
  vad.reset();
  while (!vad.isEmpty()) vad.pop();
}

import { acceptSpeech, nativeSherpa, resetSpeech, SAMPLE_RATE, type SherpaEngine, type SherpaKeywordSpotter,
  type SherpaKeywordStream, type SherpaVad } from './sherpa-engine.js';
import { keywordSpotterFiles, readableFile, VAD_MODEL, wakeWordVocabulary } from './voice-models.js';

/** 80 ms blocks at 16 kHz. */
export const WAKE_BLOCK_SAMPLES = 1_280;
const BLOCK_MS = 80;

export type WakeWordOptions = Readonly<{
  /** The configured wake word, as text. */
  wakeWord: string;
  threshold: number;
  /** A detection is confirmed only with speech in the blocks of this window, ending with the detection. */
  speechWindowMs: number;
  /** A confirmed detection ignores the detections of the following milliseconds of audio. */
  cooldownMs: number;
  detected(): void;
  rejected(): void;
  failed(error: unknown): void;
}>;

export type WakeWordModels = Readonly<{ keywordSpotting?: string; speechDetection?: string }>;

/**
 * The keyword spotter of sherpa-onnx, confirmed by its own speech detector. Both run synchronously on each 80 ms block;
 * times are measured in audio received, so they do not depend on the clock.
 */
export class SherpaWakeWord {
  private pending: number[] = [];
  private audioMs = 0;
  private lastSpeechMs = -Infinity;
  private lastDetectionMs = -Infinity;
  private closed = false;
  private readonly stream: SherpaKeywordStream;

  private constructor(private readonly spotter: SherpaKeywordSpotter, private readonly vad: SherpaVad,
    private readonly options: WakeWordOptions) {
    this.stream = spotter.createStream();
  }

  static open(options: WakeWordOptions, models: WakeWordModels = {}, engine?: SherpaEngine): SherpaWakeWord {
    if (!(options.threshold > 0 && options.threshold < 1) || !Number.isSafeInteger(options.speechWindowMs)
      || options.speechWindowMs <= 0 || !Number.isSafeInteger(options.cooldownMs) || options.cooldownMs < 0) {
      throw new Error('Invalid wake word processing options');
    }
    const files = keywordSpotterFiles(models.keywordSpotting);
    const tokens = wakeWordVocabulary(files).tokens(options.wakeWord);
    if (!tokens) throw new Error('The wake word cannot be represented with the model tokens');
    const speechModel = models.speechDetection ?? VAD_MODEL;
    readableFile(speechModel);
    const native = engine ?? nativeSherpa();
    const keywords = tokens.join(' ');
    const spotter = native.createKeywordSpotter({
      featConfig: { sampleRate: SAMPLE_RATE, featureDim: 80 },
      modelConfig: {
        transducer: { encoder: files.encoder, decoder: files.decoder, joiner: files.joiner },
        tokens: files.tokens, numThreads: 1, provider: 'cpu', debug: 0,
      },
      maxActivePaths: 4,
      numTrailingBlanks: 1,
      keywordsScore: 1,
      keywordsThreshold: options.threshold,
      keywordsBuf: keywords,
      keywordsBufSize: Buffer.byteLength(keywords),
    });
    return new SherpaWakeWord(spotter, native.createVad(speechModel), options);
  }

  /** Splits microphone samples into 80 ms blocks and processes each one as it completes. */
  push(samples: Float32Array): boolean {
    if (this.closed) return false;
    for (const sample of samples) this.pending.push(sample);
    while (this.pending.length >= WAKE_BLOCK_SAMPLES) {
      const block = Float32Array.from(this.pending.splice(0, WAKE_BLOCK_SAMPLES));
      try { this.process(block); }
      catch (error) {
        this.pending = [];
        this.options.failed(error);
        return false;
      }
    }
    return true;
  }

  /** Back to waiting for the wake word: no earlier audio, speech or detection carries over. */
  reset(): void {
    this.pending = [];
    this.lastSpeechMs = -Infinity;
    this.lastDetectionMs = -Infinity;
    if (this.closed) return;
    this.spotter.reset(this.stream);
    resetSpeech(this.vad);
  }

  /** Blocks are processed synchronously: nothing is ever queued. */
  waitUntilIdle(): Promise<void> { return Promise.resolve(); }

  /** The native objects have no explicit release: they stop receiving audio and are left to the finalizer. */
  close(): Promise<void> {
    this.closed = true;
    this.pending = [];
    return Promise.resolve();
  }

  private process(block: Float32Array): void {
    this.audioMs += BLOCK_MS;
    if (acceptSpeech(this.vad, block)) this.lastSpeechMs = this.audioMs;
    this.stream.acceptWaveform({ samples: block, sampleRate: SAMPLE_RATE });
    let detected = false;
    while (this.spotter.isReady(this.stream)) {
      this.spotter.decode(this.stream);
      if (this.spotter.getResult(this.stream).keyword) {
        detected = true;
        this.spotter.reset(this.stream);
      }
    }
    if (!detected || this.closed) return;
    if (this.audioMs - this.lastDetectionMs < this.options.cooldownMs) return;
    if (this.audioMs - this.lastSpeechMs < this.options.speechWindowMs) {
      this.lastDetectionMs = this.audioMs;
      this.options.detected();
    } else {
      this.options.rejected();
    }
  }
}

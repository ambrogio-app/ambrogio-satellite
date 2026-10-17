import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import * as ort from 'onnxruntime-node';

const require = createRequire(import.meta.url);
const modelPath = join(dirname(dirname(require.resolve('decibri'))), 'models', 'silero_vad.onnx');
const SAMPLE_RATE = 16_000;
const CONTEXT_SAMPLES = 64;
/** 32 ms windows at 16 kHz. */
export const SILERO_WINDOW_SAMPLES = 512;

/** Values previously used through Micdrop 3.4.0, with the satellite's redemption window. */
export const SILERO_OPTIONS = {
  positiveSpeechThreshold: 0.18,
  negativeSpeechThreshold: 0.11,
  minSpeechFrames: 4,
  redemptionFrames: 20,
} as const;

export type SpeechEvents = Readonly<{
  /** Speech lasted `minSpeechFrames` windows: the request may start. */
  confirmed(): void;
  /** Confirmed speech followed by `redemptionFrames` quiet windows. */
  ended(): void;
  failed(error: unknown): void;
}>;

function emptyState(): ort.Tensor {
  return new ort.Tensor('float32', new Float32Array(2 * 128), [2, 1, 128]);
}

/** Silero VAD over ONNX Runtime, scoring windows one after the other because each depends on the previous ones. */
export class SileroVad {
  private state = emptyState();
  private context = new Float32Array(CONTEXT_SAMPLES);
  private readonly sampleRate = new ort.Tensor('int64', BigInt64Array.from([BigInt(SAMPLE_RATE)]), []);
  private buffer = new Float32Array(0);
  private draining?: Promise<void>;
  private round = 0;
  private speaking = false;
  private speechFrames = 0;
  private silenceFrames = 0;
  private released?: Promise<void>;
  private events?: SpeechEvents;

  private constructor(private readonly session: ort.InferenceSession) {}

  static async open(): Promise<SileroVad> {
    const session = await ort.InferenceSession.create(modelPath, {
      executionProviders: ['cpu'], intraOpNumThreads: 1, interOpNumThreads: 1,
    });
    return new SileroVad(session);
  }

  /** Start a fresh detection whose events go to `events`; earlier windows are discarded. */
  start(events: SpeechEvents): void {
    this.reset();
    this.events = events;
  }

  /** Stop reporting and discard pending audio and model state. */
  reset(): void {
    this.round++;
    this.events = undefined;
    this.buffer = new Float32Array(0);
    this.state = emptyState();
    this.context = new Float32Array(CONTEXT_SAMPLES);
    this.speaking = false;
    this.speechFrames = 0;
    this.silenceFrames = 0;
  }

  push(frames: Float32Array): void {
    if (!this.events || this.released) return;
    const joined = new Float32Array(this.buffer.length + frames.length);
    joined.set(this.buffer);
    joined.set(frames, this.buffer.length);
    this.buffer = joined;
    this.draining ??= this.drain().finally(() => { this.draining = undefined; });
  }

  private async drain(): Promise<void> {
    while (this.buffer.length >= SILERO_WINDOW_SAMPLES && this.events && !this.released) {
      const window = this.buffer.slice(0, SILERO_WINDOW_SAMPLES);
      this.buffer = this.buffer.slice(SILERO_WINDOW_SAMPLES);
      const round = this.round;
      const events = this.events;
      let probability: number;
      try { probability = await this.infer(window); }
      catch (error) {
        if (round === this.round) { this.reset(); events.failed(error); }
        return;
      }
      if (round !== this.round) continue;
      this.onProbability(probability, events);
    }
  }

  private onProbability(probability: number, events: SpeechEvents): void {
    const options = SILERO_OPTIONS;
    if (probability >= options.positiveSpeechThreshold) {
      this.silenceFrames = 0;
      this.speechFrames++;
      this.speaking = true;
      if (this.speechFrames === options.minSpeechFrames) events.confirmed();
      return;
    }
    if (probability < options.negativeSpeechThreshold && this.speaking) {
      this.silenceFrames++;
      if (this.silenceFrames < options.redemptionFrames) return;
      const confirmed = this.speechFrames >= options.minSpeechFrames;
      this.speaking = false;
      this.speechFrames = 0;
      this.silenceFrames = 0;
      // Unconfirmed speech is discarded: no request was opened for it.
      if (confirmed) events.ended();
    }
  }

  private async infer(frame: Float32Array): Promise<number> {
    const input = new Float32Array(CONTEXT_SAMPLES + frame.length);
    input.set(this.context);
    input.set(frame, CONTEXT_SAMPLES);
    this.context = frame.slice(-CONTEXT_SAMPLES);
    const output = await this.session.run({
      input: new ort.Tensor('float32', input, [1, input.length]),
      state: this.state,
      sr: this.sampleRate,
    });
    const state = output.stateN;
    const probability = output.output?.data;
    if (!(state instanceof ort.Tensor) || !(probability instanceof Float32Array)
      || probability[0] === undefined || !Number.isFinite(probability[0])) {
      throw new Error('Unexpected Silero ONNX output');
    }
    this.state = state;
    return probability[0];
  }

  close(): Promise<void> {
    return this.released ??= (async () => {
      this.reset();
      await this.draining;
      await this.session.release();
    })();
  }
}

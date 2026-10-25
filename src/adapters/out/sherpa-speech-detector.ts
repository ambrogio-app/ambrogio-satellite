import { acceptSpeech, nativeSherpa, resetSpeech, type SherpaEngine, type SherpaVad } from './sherpa-engine.js';
import { readableFile, VAD_MODEL } from './voice-models.js';

export type SpeechEvents = Readonly<{
  /** Speech lasted the minimum duration: the request may start. */
  confirmed(): void;
  /** Confirmed speech followed by the minimum silence. */
  ended(): void;
  failed(error: unknown): void;
}>;

/** Delimits the turns of an interaction with sherpa-onnx's Silero detector, one block at a time as it arrives. */
export class SherpaSpeechDetector {
  private events?: SpeechEvents;
  private speaking = false;
  private closed = false;

  private constructor(private readonly vad: SherpaVad) {}

  /** sherpa-onnx does not report a missing model when the detector is created: the file is checked first. */
  static open(model = VAD_MODEL, engine?: SherpaEngine): SherpaSpeechDetector {
    readableFile(model);
    return new SherpaSpeechDetector((engine ?? nativeSherpa()).createVad(model));
  }

  /** Start a fresh detection whose events go to `events`; earlier audio is discarded. */
  start(events: SpeechEvents): void {
    this.reset();
    this.events = events;
  }

  /** Stop reporting and discard pending audio and detector state. */
  reset(): void {
    this.events = undefined;
    this.speaking = false;
    if (!this.closed) resetSpeech(this.vad);
  }

  push(frames: Float32Array): void {
    const events = this.events;
    if (!events || this.closed) return;
    let speaking: boolean;
    try { speaking = acceptSpeech(this.vad, frames); }
    catch (error) { this.reset(); events.failed(error); return; }
    if (speaking === this.speaking) return;
    this.speaking = speaking;
    // Unconfirmed speech never sets the flag, so it is discarded without events.
    if (speaking) events.confirmed();
    else events.ended();
  }

  /** The native detector has no explicit release: it stops receiving audio and is left to the finalizer. */
  close(): Promise<void> {
    this.events = undefined;
    this.closed = true;
    return Promise.resolve();
  }
}

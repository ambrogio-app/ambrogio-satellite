import * as ort from 'onnxruntime-node';

const CHUNK_SAMPLES = 1_280;
const MEL_CONTEXT_SAMPLES = 480;
const MEL_WINDOW_FRAMES = 76;
const MEL_BANDS = 32;
const EMBEDDING_SIZE = 96;

export type WakeWordModelFiles = Readonly<{
  mel: string;
  embedding: string;
  classifier: string;
}>;

export type WakeWordOptions = Readonly<{
  threshold: number;
  cooldownMs: number;
  maxQueuedChunks: number;
  detected(score: number): void;
  failed(error: unknown): void;
}>;

function firstTensor(outputs: ort.InferenceSession.OnnxValueMapType, name: string): Float32Array {
  const value = outputs[name];
  if (!(value?.data instanceof Float32Array)) throw new Error(`Unexpected ONNX output: ${name}`);
  return value.data;
}

/** OpenWakeWord's 80 ms streaming feature pipeline, confined to the ONNX adapter. */
export class OnnxWakeWord {
  private closing?: Promise<void>;
  private pending: number[] = [];
  private raw: number[] = [];
  private melFrames: Float32Array[] = Array.from(
    { length: MEL_WINDOW_FRAMES }, () => new Float32Array(MEL_BANDS).fill(1),
  );
  private embeddings: Float32Array[] = [];
  private tail: Promise<void> = Promise.resolve();
  private queuedChunks = 0;
  private lastDetectedAt = -Infinity;
  private readonly classifierFrames: number;

  private constructor(
    private readonly mel: ort.InferenceSession,
    private readonly embedding: ort.InferenceSession,
    private readonly classifier: ort.InferenceSession,
    private readonly options: WakeWordOptions,
  ) {
    const metadata = classifier.inputMetadata[0];
    const shape = metadata?.isTensor ? metadata.shape : undefined;
    const frames = shape?.[1];
    if (typeof frames !== 'number' || !Number.isSafeInteger(frames) || frames <= 0) {
      throw new Error('Wake word classifier has an unsupported input shape');
    }
    this.classifierFrames = frames;
  }

  static async open(files: WakeWordModelFiles, options: WakeWordOptions): Promise<OnnxWakeWord> {
    if (!(options.threshold > 0 && options.threshold <= 1)
      || !Number.isSafeInteger(options.cooldownMs) || options.cooldownMs < 0
      || !Number.isSafeInteger(options.maxQueuedChunks) || options.maxQueuedChunks <= 0) {
      throw new Error('Invalid wake word processing options');
    }
    const sessionOptions: ort.InferenceSession.SessionOptions = {
      executionProviders: ['cpu'], intraOpNumThreads: 1, interOpNumThreads: 1,
    };
    const opened: ort.InferenceSession[] = [];
    try {
      for (const file of [files.mel, files.embedding, files.classifier]) {
        opened.push(await ort.InferenceSession.create(file, sessionOptions));
      }
      return new OnnxWakeWord(opened[0]!, opened[1]!, opened[2]!, options);
    } catch (error) {
      const results = await Promise.allSettled(opened.map(session => Promise.resolve().then(() => session.release())));
      const failures = results.filter(r => r.status === 'rejected').map(r => r.reason);
      if (failures.length) throw new AggregateError([error, ...failures], 'Wake word startup cleanup failed', { cause: error });
      throw error;
    }
  }

  /** Copies microphone samples and bounds pending inference work. */
  push(samples: Float32Array): boolean {
    if (this.closing) return false;
    for (const sample of samples) this.pending.push(sample * 32_767);
    while (this.pending.length >= CHUNK_SAMPLES) {
      if (this.queuedChunks >= this.options.maxQueuedChunks) {
        this.pending = [];
        this.options.failed(new Error('Wake word inference cannot keep up with microphone audio'));
        return false;
      }
      const chunk = Float32Array.from(this.pending.splice(0, CHUNK_SAMPLES));
      this.queuedChunks++;
      this.tail = this.tail.then(() => this.closing ? undefined : this.process(chunk))
        .catch(error => { if (!this.closing) this.options.failed(error); })
        .finally(() => { this.queuedChunks--; });
    }
    return true;
  }

  /** Prevents an old detection score from immediately reopening a new call. */
  reset(): void {
    this.pending = [];
    this.raw = [];
    this.melFrames = Array.from(
      { length: MEL_WINDOW_FRAMES }, () => new Float32Array(MEL_BANDS).fill(1),
    );
    this.embeddings = [];
    this.lastDetectedAt = Date.now();
  }

  async waitUntilIdle(): Promise<void> { await this.tail; }

  close(): Promise<void> {
    return this.closing ??= (async () => {
      this.pending = [];
      await this.tail;
      const results = await Promise.allSettled([this.mel, this.embedding, this.classifier]
        .map(session => Promise.resolve().then(() => session.release())));
      const errors = results.filter(r => r.status === 'rejected').map(r => r.reason);
      if (errors.length) throw new AggregateError(errors, 'Wake word release failed');
    })();
  }

  private async process(chunk: Float32Array): Promise<void> {
    this.raw.push(...chunk);
    const maxRaw = CHUNK_SAMPLES + MEL_CONTEXT_SAMPLES;
    if (this.raw.length > maxRaw) this.raw.splice(0, this.raw.length - maxRaw);
    const raw = Float32Array.from(this.raw);
    const melOutput = await this.mel.run({
      [this.mel.inputNames[0]!]: new ort.Tensor('float32', raw, [1, raw.length]),
    });
    const melData = firstTensor(melOutput, this.mel.outputNames[0]!);
    if (melData.length % MEL_BANDS !== 0) throw new Error('Unexpected mel output shape');
    const frames = melData.length / MEL_BANDS;
    for (let frame = Math.max(0, frames - 8); frame < frames; frame++) {
      const row = new Float32Array(MEL_BANDS);
      for (let band = 0; band < MEL_BANDS; band++) {
        row[band] = melData[frame * MEL_BANDS + band]! / 10 + 2;
      }
      this.melFrames.push(row);
    }
    if (this.melFrames.length > MEL_WINDOW_FRAMES) {
      this.melFrames.splice(0, this.melFrames.length - MEL_WINDOW_FRAMES);
    }

    const melWindow = new Float32Array(MEL_WINDOW_FRAMES * MEL_BANDS);
    this.melFrames.forEach((row, index) => melWindow.set(row, index * MEL_BANDS));
    const embeddingOutput = await this.embedding.run({
      [this.embedding.inputNames[0]!]: new ort.Tensor('float32', melWindow,
        [1, MEL_WINDOW_FRAMES, MEL_BANDS, 1]),
    });
    const embedding = firstTensor(embeddingOutput, this.embedding.outputNames[0]!);
    if (embedding.length !== EMBEDDING_SIZE) throw new Error('Unexpected embedding size');
    this.embeddings.push(Float32Array.from(embedding));
    if (this.embeddings.length > this.classifierFrames) this.embeddings.shift();
    if (this.embeddings.length < this.classifierFrames) return;

    const features = new Float32Array(this.classifierFrames * EMBEDDING_SIZE);
    this.embeddings.forEach((value, index) => features.set(value, index * EMBEDDING_SIZE));
    const classifierOutput = await this.classifier.run({
      [this.classifier.inputNames[0]!]: new ort.Tensor('float32', features,
        [1, this.classifierFrames, EMBEDDING_SIZE]),
    });
    const score = firstTensor(classifierOutput, this.classifier.outputNames[0]!)[0];
    if (score === undefined || !Number.isFinite(score)) throw new Error('Invalid wake word score');
    const now = Date.now();
    if (score >= this.options.threshold && now - this.lastDetectedAt >= this.options.cooldownMs) {
      this.lastDetectedAt = now;
      if (!this.closing) this.options.detected(score);
    }
  }
}

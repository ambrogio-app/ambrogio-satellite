import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { SILERO_SAMPLE_RATE, setSileroModelLoader, type SileroModel } from '@micdrop/client';
import * as ort from 'onnxruntime-node';

const require = createRequire(import.meta.url);
const modelPath = join(dirname(dirname(require.resolve('decibri'))), 'models', 'silero_vad.onnx');
const CONTEXT_SAMPLES = 64;

function emptyState(): ort.Tensor {
  return new ort.Tensor('float32', new Float32Array(2 * 128), [2, 1, 128]);
}

class NodeSileroModel implements SileroModel {
  private state = emptyState();
  private context = new Float32Array(CONTEXT_SAMPLES);
  private readonly sampleRate = new ort.Tensor('int64',
    BigInt64Array.from([BigInt(SILERO_SAMPLE_RATE)]), []);

  private pending = new Set<Promise<unknown>>();
  private released?: Promise<void>;
  constructor(private readonly session: ort.InferenceSession, private readonly failed: (error: unknown) => void, private readonly disposed: () => void) {}

  process(frame: Float32Array): Promise<number> {
    if (this.released) return Promise.resolve(0);
    const work = this.infer(frame);
    this.pending.add(work);
    void work.then(() => this.pending.delete(work), () => this.pending.delete(work));
    return work;
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

  reset(): void {
    this.state = emptyState();
    this.context = new Float32Array(CONTEXT_SAMPLES);
  }

  release(): Promise<void> {
    return this.released ??= (async () => {
      await Promise.allSettled([...this.pending]);
      try { await this.session.release(); } catch (error) { this.failed(error); }
      finally { this.disposed(); }
    })();
  }
}

/** Tracks releases because Micdrop's recorder does not await VAD.stop(). */
export function installNodeSilero(): Readonly<{ close(): Promise<void> }> {
  const models = new Set<NodeSileroModel>();
  const loading = new Set<Promise<NodeSileroModel>>();
  const errors: unknown[] = [];
  let closing: Promise<void> | undefined;
  setSileroModelLoader(() => {
    if (closing) return Promise.reject(new Error('Silero loader is closed'));
    const work = (async () => {
      const session = await ort.InferenceSession.create(modelPath, {
        executionProviders: ['cpu'], intraOpNumThreads: 1, interOpNumThreads: 1,
      });
      const model = new NodeSileroModel(session, error => errors.push(error), () => models.delete(model));
      models.add(model);
      if (closing) await model.release();
      return model;
    })();
    loading.add(work);
    void work.then(() => loading.delete(work), () => loading.delete(work));
    return work;
  });
  return { close() {
    return closing ??= (async () => {
      await Promise.allSettled([...loading]);
      await Promise.all([...models].map(model => model.release()));
      models.clear();
      if (errors.length) throw new AggregateError(errors, 'Silero release failed');
    })();
  } };
}

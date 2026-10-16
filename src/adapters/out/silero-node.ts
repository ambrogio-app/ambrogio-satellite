import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { SILERO_SAMPLE_RATE, setSileroModelLoader, type SileroModel } from '@micdrop/client';
import * as ort from 'onnxruntime-node';

const require = createRequire(import.meta.url);
const modelPath = join(dirname(require.resolve('decibri')), 'models', 'silero_vad.onnx');
const CONTEXT_SAMPLES = 64;

function emptyState(): ort.Tensor {
  return new ort.Tensor('float32', new Float32Array(2 * 128), [2, 1, 128]);
}

class NodeSileroModel implements SileroModel {
  private state = emptyState();
  private context = new Float32Array(CONTEXT_SAMPLES);
  private readonly sampleRate = new ort.Tensor('int64',
    BigInt64Array.from([BigInt(SILERO_SAMPLE_RATE)]), []);

  constructor(private readonly session: ort.InferenceSession) {}

  async process(frame: Float32Array): Promise<number> {
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

  async release(): Promise<void> { await this.session.release(); }
}

export function installNodeSilero(): void {
  setSileroModelLoader(async () => {
    const session = await ort.InferenceSession.create(modelPath, {
      executionProviders: ['cpu'], intraOpNumThreads: 1, interOpNumThreads: 1,
    });
    return new NodeSileroModel(session);
  });
}

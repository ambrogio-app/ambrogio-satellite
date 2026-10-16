import { expect, test, vi } from 'vitest';
import type { SileroModel } from '@micdrop/client';
import { installNodeSilero } from '../../../src/adapters/out/silero-node.js';
const f = vi.hoisted(() => ({ create: vi.fn(), loader: undefined as undefined | (() => Promise<SileroModel>) }));
vi.mock('@micdrop/client', () => ({ SILERO_SAMPLE_RATE: 16000,
  setSileroModelLoader: (loader: () => Promise<SileroModel>) => { f.loader = loader; } }));
vi.mock('onnxruntime-node', () => ({ InferenceSession: { create: f.create }, Tensor: class {} }));

test('waits for active inference and releases Silero once, retaining release failure for its owner', async () => {
  let reject!: (error: Error) => void;
  const failure = new Error('release failed');
  const release = vi.fn().mockRejectedValue(failure);
  f.create.mockResolvedValue({ run: () => new Promise((_, r) => { reject = r; }), release });
  const owner = installNodeSilero();
  const model = await f.loader!();
  const processing = model.process(new Float32Array(512));
  const assertion = expect(processing).rejects.toThrow('inference interrupted');
  const released = model.release();
  expect(release).not.toHaveBeenCalled();
  reject(new Error('inference interrupted'));
  await assertion; await released;
  const closed = owner.close(); expect(owner.close()).toBe(closed);
  await expect(closed).rejects.toMatchObject({ errors: [failure] });
  expect(release).toHaveBeenCalledOnce();
});

import { beforeEach, expect, test, vi } from 'vitest';
import { OnnxWakeWord } from '../../../src/adapters/out/onnx-wake-word.js';
const f = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock('onnxruntime-node', () => ({ InferenceSession: { create: f.create }, Tensor: class {} }));
const files = { mel: 'mel', embedding: 'embedding', classifier: 'classifier' };
const options = { threshold: 0.5, cooldownMs: 100, maxQueuedChunks: 32, detected: vi.fn(), failed: vi.fn() };
beforeEach(() => { vi.clearAllMocks(); });
function session() { return { release: vi.fn(async () => {}), run: vi.fn(), inputMetadata: [{ isTensor: true, shape: [1, 16, 96] }] }; }
test('partial model startup releases every opened session and retains startup and cleanup errors', async () => {
  const mel = session(); const embedding = session();
  const startup = new Error('classifier failed'); const cleanup = new Error('embedding release failed');
  embedding.release.mockRejectedValue(cleanup);
  f.create.mockResolvedValueOnce(mel).mockResolvedValueOnce(embedding).mockRejectedValueOnce(startup);
  await expect(OnnxWakeWord.open(files, options)).rejects.toMatchObject({ cause: startup, errors: [startup, cleanup] });
  expect(mel.release).toHaveBeenCalledOnce(); expect(embedding.release).toHaveBeenCalledOnce();
});
test('closing discards queued inference, refuses frames and attempts every release exactly once', async () => {
  const models = [session(), session(), session()];
  for (const model of models) f.create.mockResolvedValueOnce(model);
  const failure = new Error('release failed'); models[0]!.release.mockRejectedValue(failure);
  const detector = await OnnxWakeWord.open(files, options);
  detector.push(new Float32Array(1280));
  const first = detector.close(); expect(detector.close()).toBe(first);
  expect(detector.push(new Float32Array(1280))).toBe(false);
  await expect(first).rejects.toMatchObject({ errors: [failure] });
  for (const model of models) { expect(model.release).toHaveBeenCalledOnce(); expect(model.run).not.toHaveBeenCalled(); }
});

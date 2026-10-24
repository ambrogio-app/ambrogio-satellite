import { beforeEach, expect, test, vi } from 'vitest';
import { OnnxWakeWord } from './onnx-wake-word.js';
const f = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock('onnxruntime-node', () => ({ InferenceSession: { create: f.create }, Tensor: class {} }));
const files = { mel: 'mel', embedding: 'embedding', classifier: 'classifier' };
const options = { threshold: 0.5, patience: 1, cooldownMs: 100, maxQueuedChunks: 32, detected: vi.fn(), failed: vi.fn() };
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

/** Sessions whose classifier returns one scripted score per 80 ms chunk. */
function scriptedSessions(scores: number[]) {
  const session = (data: () => Float32Array) => ({
    inputNames: ['input'], outputNames: ['output'], release: vi.fn(async () => {}),
    inputMetadata: [{ isTensor: true, shape: [1, 1, 96] }],
    run: vi.fn(async () => ({ output: { data: data() } })),
  });
  f.create
    .mockResolvedValueOnce(session(() => new Float32Array(8 * 32)))
    .mockResolvedValueOnce(session(() => new Float32Array(96)))
    .mockResolvedValueOnce(session(() => Float32Array.of(scores.shift() ?? 0)));
}

async function detections(scores: number[], patience: number, between?: (d: OnnxWakeWord) => void, split = scores.length) {
  scriptedSessions(scores);
  const detected: number[] = [];
  const chunks: number[] = [];
  const detector = await OnnxWakeWord.open(files, {
    threshold: 0.5, patience, cooldownMs: 0, maxQueuedChunks: 32,
    detected: (score, run) => { detected.push(score); chunks.push(run); }, failed: error => { throw error; },
  });
  const total = scores.length;
  for (let chunk = 0; chunk < total; chunk++) {
    if (chunk === split) { await detector.waitUntilIdle(); between?.(detector); }
    detector.push(new Float32Array(1_280));
  }
  await detector.waitUntilIdle();
  await detector.close();
  expect(chunks).toEqual(detected.map(() => patience));
  return detected;
}

test('a single chunk above the threshold does not activate with patience 2', async () => {
  expect(await detections([0.1, 0.75, 0.2, 0.1], 2)).toEqual([]);
});

test('two consecutive chunks above the threshold activate once, on the second chunk', async () => {
  expect(await detections([0.1, 0.625, 0.875, 0.2], 2)).toEqual([0.875]);
});

test('a chunk below the threshold restarts the count', async () => {
  expect(await detections([0.75, 0.2, 0.75, 0.1], 2)).toEqual([]);
});

test('patience 1 activates on a single chunk above the threshold', async () => {
  expect(await detections([0.1, 0.75, 0.1], 1)).toEqual([0.75]);
});

test('resetting the pipeline discards a count started before', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  try {
    expect(await detections([0.75, 0.75], 2, () => {}, 1)).toEqual([0.75]);
    expect(await detections([0.75, 0.75], 2, detector => detector.reset(), 1)).toEqual([]);
  } finally { vi.useRealTimers(); }
});

test.each([0, 1.5, Number.NaN])('rejects patience %s at startup', async patience => {
  await expect(OnnxWakeWord.open(files, {
    threshold: 0.5, patience, cooldownMs: 0, maxQueuedChunks: 32, detected() {}, failed() {},
  })).rejects.toThrow('Invalid wake word processing options');
  expect(f.create).not.toHaveBeenCalled();
});

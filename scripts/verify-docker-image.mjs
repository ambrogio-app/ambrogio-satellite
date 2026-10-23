import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [image, arch] = process.argv.slice(2);
assert(image && ['amd64', 'arm64'].includes(arch), 'Usage: node scripts/verify-docker-image.mjs <image> <amd64|arm64>');
function docker(args, input) {
  const result = spawnSync('docker', args, { input, encoding: 'utf8', timeout: 180_000, maxBuffer: 4 * 1024 * 1024 });
  if (result.error) throw result.error;
  return result;
}
function success(result) {
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout;
}
assert.equal(success(docker(['image', 'inspect', '--format', '{{.Os}}/{{.Architecture}}', image])).trim(), `linux/${arch}`);
const run = ['run', '--rm', '--network', 'none', '--platform', `linux/${arch}`, '--env', 'ORT_DISABLE_TELEMETRY=1'];
const startup = docker([...run, image]);
assert.equal(startup.status, 2, startup.stderr || startup.stdout);
const lines = startup.stdout.trim().split('\n');
assert.equal(lines.length, 1);
assert.equal(JSON.parse(lines[0]).event, 'invalid_configuration');
assert.equal(startup.stderr, '');

success(docker([...run, '--interactive', '--entrypoint', 'node', image, '--input-type=module', '-'], `
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
assert.equal(process.arch, ${JSON.stringify(arch === 'amd64' ? 'x64' : 'arm64')});
assert.equal(existsSync('/app/config.ts'), false);
assert.equal(existsSync('/config/satellite.ts'), false);
await import('decibri');
await import('onnxruntime-node');
const { errorToneSamples } = await import('./dist/adapters/out/ready-cue.js');
assert.equal(errorToneSamples().length, 5600);
const { OnnxWakeWord } = await import('./dist/adapters/out/onnx-wake-word.js');
const { wakeWordFiles, distributedWakeWordIds } = await import('./dist/adapters/out/wake-word-catalog.js');
assert(distributedWakeWordIds.size > 0);
for (const id of distributedWakeWordIds) {
  const failures = [];
  const detector = await OnnxWakeWord.open(wakeWordFiles(id), {
    threshold: 0.5, patience: 1, cooldownMs: 0, maxQueuedChunks: 20,
    detected() { throw new Error('Wake word detected in silence'); }, failed(error) { failures.push(error); },
  });
  try {
    for (let i = 0; i < 18; i++) assert(detector.push(new Float32Array(1280)));
    await detector.waitUntilIdle();
    assert.deepEqual(failures, []);
  } finally { await detector.close(); }
}
const { SileroVad, SILERO_WINDOW_SAMPLES } = await import('./dist/adapters/out/silero-vad.js');
const vad = await SileroVad.open();
try {
  const vadFailures = [];
  vad.start({ confirmed() { throw new Error('Speech confirmed in silence'); }, ended() {},
    failed(error) { vadFailures.push(error); } });
  vad.push(new Float32Array(SILERO_WINDOW_SAMPLES * 8));
  await new Promise(resolve => setTimeout(resolve, 500));
  assert.deepEqual(vadFailures, []);
} finally { await vad.close(); }
`));
const mountedModels = mkdtempSync(join(tmpdir(), 'ambrogio-wake-models-'));
try {
  for (const name of ['melspectrogram.onnx', 'embedding_model.onnx']) {
    copyFileSync(join('models', 'wakeword', name), join(mountedModels, name));
  }
  copyFileSync(join('models', 'wakeword', 'alexa_v0.1.onnx'), join(mountedModels, 'personalizzato.onnx'));
  success(docker([...run,
    '--mount', `type=bind,src=${mountedModels},dst=/app/models/wakeword,readonly`,
    '--interactive', '--entrypoint', 'node', image, '--input-type=module', '-'], `
import assert from 'node:assert/strict';
const { availableWakeWordIds, wakeWordFiles } = await import('./dist/adapters/out/wake-word-catalog.js');
const { parseSatelliteConfig } = await import('./dist/adapters/out/configuration.js');
const ids = availableWakeWordIds();
assert.deepEqual([...ids], ['personalizzato']);
const config = parseSatelliteConfig({ backend: { baseUrl: 'http://localhost:3000' },
  wakeWord: { model: 'personalizzato' } }, ids);
assert.equal(config.ok, true);
const { OnnxWakeWord } = await import('./dist/adapters/out/onnx-wake-word.js');
const detector = await OnnxWakeWord.open(wakeWordFiles('personalizzato'), {
  threshold: 0.5, patience: 1, cooldownMs: 0, maxQueuedChunks: 20,
  detected() { throw new Error('Unexpected detection in silence'); },
  failed(error) { throw error; },
});
try { assert(detector.push(new Float32Array(1280))); await detector.waitUntilIdle(); }
finally { await detector.close(); }
`));
} finally { rmSync(mountedModels, { recursive: true, force: true }); }
console.log(`Verified ${image}: ${arch}, native imports, models, error tone and safe startup without configuration.`);

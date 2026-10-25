import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
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
const labels = JSON.parse(success(docker(['image', 'inspect', '--format', '{{json .Config.Labels}}', image])));
assert.equal(labels['org.opencontainers.image.source'], 'https://github.com/ambrogio-app/ambrogio-satellite');
assert.equal(labels['org.opencontainers.image.licenses'], 'MIT');
const run = ['run', '--rm', '--network', 'none', '--platform', `linux/${arch}`];
// The image declares no runtime environment and no configuration value: the deployment supplies them.
const imageEnv = JSON.parse(success(docker(['image', 'inspect', '--format', '{{json .Config.Env}}', image])));
assert(!imageEnv.some(entry => entry.startsWith('AMBROGIO_')), 'The image must not set AMBROGIO_* variables');
function rejected(env, variable, condition) {
  const startup = docker([...run, ...env.flatMap(entry => ['--env', entry]), image]);
  assert.equal(startup.status, 2, startup.stderr || startup.stdout);
  const lines = startup.stdout.trim().split('\n');
  assert.equal(lines.length, 1);
  const record = JSON.parse(lines[0]);
  assert.deepEqual([record.event, record.variable, record.condition], ['invalid_configuration', variable, condition]);
  assert(!lines[0].includes('secret'));
  assert.equal(startup.stderr, '');
}
rejected([], 'AMBROGIO_ENV', 'missing');
rejected(['AMBROGIO_ENV=production', 'AMBROGIO_BACKEND_URL=ftp://secret.example.test'], 'AMBROGIO_BACKEND_URL', 'invalid');

success(docker([...run, '--interactive', '--entrypoint', 'node', image, '--input-type=module', '-'], `
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
assert.equal(process.arch, ${JSON.stringify(arch === 'amd64' ? 'x64' : 'arm64')});
assert.equal(existsSync('/app/.env'), false);
assert.equal(existsSync('/config'), false);
await import('decibri');
createRequire(import.meta.url)('sherpa-onnx-node');
const { errorToneSamples } = await import('./dist/adapters/out/ready-cue.js');
assert.equal(errorToneSamples().length, 5600);
const { SherpaWakeWord } = await import('./dist/adapters/out/sherpa-wake-word.js');
const outcomes = [];
const wake = SherpaWakeWord.open({ wakeWord: 'Alexa', threshold: 0.25, speechWindowMs: 1500, cooldownMs: 2000,
  detected() { outcomes.push('detected'); }, rejected() { outcomes.push('rejected'); },
  failed(error) { outcomes.push(String(error)); } });
for (let i = 0; i < 40; i++) assert(wake.push(new Float32Array(1280)));
await wake.close();
assert.deepEqual(outcomes, []);
const { SherpaSpeechDetector } = await import('./dist/adapters/out/sherpa-speech-detector.js');
const vad = SherpaSpeechDetector.open();
const vadEvents = [];
vad.start({ confirmed() { vadEvents.push('confirmed'); }, ended() { vadEvents.push('ended'); },
  failed(error) { vadEvents.push(String(error)); } });
for (let i = 0; i < 20; i++) vad.push(new Float32Array(1600));
await vad.close();
assert.deepEqual(vadEvents, []);
`));
const mountedModels = mkdtempSync(join(tmpdir(), 'ambrogio-kws-model-'));
try {
  for (const name of readdirSync(join('models', 'kws'))) copyFileSync(join('models', 'kws', name), join(mountedModels, name));
  writeFileSync(join(mountedModels, 'mounted-marker.txt'), 'mounted');
  success(docker([...run,
    '--mount', `type=bind,src=${mountedModels},dst=/app/models/kws,readonly`,
    '--interactive', '--entrypoint', 'node', image, '--input-type=module', '-'], `
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { installedWakeWordVocabulary, keywordSpotterFiles } = await import('./dist/adapters/out/voice-models.js');
const { readSatelliteConfig } = await import('./dist/runtime/configuration.js');
// The mount is the directory read: a marker file of the copy is visible inside the container.
assert.equal(readFileSync('/app/models/kws/mounted-marker.txt', 'utf8'), 'mounted');
assert(keywordSpotterFiles().encoder.startsWith('/app/models/kws/'));
const vocabulary = installedWakeWordVocabulary();
assert.deepEqual(vocabulary.tokens('Alexa'), ['▁A', 'LE', 'X', 'A']);
const config = readSatelliteConfig({ AMBROGIO_ENV: 'production', AMBROGIO_BACKEND_URL: 'http://localhost:3000',
  AMBROGIO_WAKE_WORD: 'Hey Siri' }, vocabulary);
assert.equal(config.ok, true);
const { SherpaWakeWord } = await import('./dist/adapters/out/sherpa-wake-word.js');
const wake = SherpaWakeWord.open({ wakeWord: 'Hey Siri', threshold: 0.25, speechWindowMs: 1500, cooldownMs: 2000,
  detected() { throw new Error('Unexpected detection in silence'); }, rejected() {}, failed(error) { throw error; } });
assert(wake.push(new Float32Array(1280)));
await wake.close();
`));
} finally { rmSync(mountedModels, { recursive: true, force: true }); }
console.log(`Verified ${image}: ${arch}, labels, native imports, speech models, mounted keyword spotting model, error tone and safe startup without configuration or with an invalid environment variable.`);

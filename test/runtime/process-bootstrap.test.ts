import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';

// Modules that build audio, wake word or network resources record their loading.
const f = vi.hoisted(() => ({
  loaded: [] as string[],
  start: vi.fn(),
  info: vi.fn(),
  failure: vi.fn(),
  configurationRejected: vi.fn(),
  shutdownTimeout: vi.fn(),
}));
vi.mock('../../src/composition/satellite.js', () => {
  f.loaded.push('composition');
  return { startSatellite: f.start };
});
vi.mock('decibri', () => { f.loaded.push('decibri'); return {}; });
vi.mock('onnxruntime-node', () => { f.loaded.push('onnxruntime-node'); return {}; });
vi.mock('../../src/adapters/out/diagnostics.js', () => ({ diagnostics: {
  info: f.info, failure: f.failure, configurationRejected: f.configurationRejected, shutdownTimeout: f.shutdownTimeout,
} }));

const argv = process.argv;
let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'ambrogio-satellite-bootstrap-'));
  f.loaded.length = 0;
  vi.resetModules();
  vi.clearAllMocks();
});
afterEach(async () => {
  process.argv = argv;
  process.exitCode = undefined;
  vi.unstubAllEnvs();
  await rm(directory, { recursive: true, force: true });
});

async function runMain(config: unknown): Promise<void> {
  const filename = join(directory, 'satellite.ts');
  await writeFile(filename, `export default ${JSON.stringify(config)};\n`);
  process.argv = [argv[0]!, 'main.js', '--config', filename];
  await import('../../src/main.js');
}

test.each([
  [{ backend: { baseUrl: 'ftp://backend.example.test' } }, 'backend.baseUrl'],
  [{ backend: { baseUrl: 'http://backend.example.test' }, wakeWord: { model: 'missing_word' } }, 'wakeWord.model'],
  [{ backend: { baseUrl: 'http://backend.example.test' }, unknown: {} }, 'config'],
])('an invalid configuration exits with 2 before any resource is loaded (%j)', async (config, field) => {
  await runMain(config);
  expect(process.exitCode).toBe(2);
  expect(f.configurationRejected).toHaveBeenCalledExactlyOnceWith({ kind: 'invalid_configuration', field });
  expect(f.loaded).toEqual([]);
  expect(f.start).not.toHaveBeenCalled();
});

test('missing startup arguments exit with 2 before the configuration is read', async () => {
  process.argv = [argv[0]!, 'main.js'];
  await import('../../src/main.js');
  expect(process.exitCode).toBe(2);
  expect(f.info).toHaveBeenCalledExactlyOnceWith('invalid_arguments');
  expect(f.loaded).toEqual([]);
});

test('a valid configuration reaches the composition root only after validation', async () => {
  vi.stubEnv('ORT_DISABLE_TELEMETRY', '');
  const failure = new Error('no devices in the test');
  f.start.mockRejectedValue(failure);
  await runMain({ backend: { baseUrl: 'https://backend.example.test/prefix' }, client: { id: 'satellite-test', name: 'Test' } });
  expect(f.configurationRejected).not.toHaveBeenCalled();
  expect(f.loaded).toEqual(['composition']);
  expect(f.start).toHaveBeenCalledOnce();
  const [config, signal] = f.start.mock.calls[0]!;
  expect(config.backend.sessionUrl.href).toBe('wss://backend.example.test/prefix/api/session');
  expect(config.client).toEqual({ clientId: 'satellite-test', name: 'Test' });
  expect(config.wakeWord.model).toBe('hey_jarvis');
  expect(signal).toBeInstanceOf(AbortSignal);
  expect(f.failure).toHaveBeenCalledExactlyOnceWith('satellite_process_failed', failure);
  expect(process.exitCode).toBe(1);
});

describe('compiled process', () => {
  // The entry point is built with the project's `tsc` into a temporary directory and run with Node.js.
  const root = fileURLToPath(new URL('../../', import.meta.url));
  let build: string;
  beforeAll(() => {
    build = mkdtempSync(join(tmpdir(), 'ambrogio-satellite-dist-'));
    const compiled = spawnSync(join(root, 'node_modules', '.bin', 'tsc'),
      ['-p', join(root, 'tsconfig.build.json'), '--outDir', join(build, 'dist')], { cwd: root, encoding: 'utf8' });
    expect(`${compiled.stdout}${compiled.stderr}`).toBe('');
    cpSync(join(root, 'package.json'), join(build, 'package.json'));
    symlinkSync(join(root, 'node_modules'), join(build, 'node_modules'), 'dir');
    symlinkSync(join(root, 'models'), join(build, 'models'), 'dir');
  }, 60_000);
  afterAll(() => { rmSync(build, { recursive: true, force: true }); });

  function run(filename: string) {
    const result = spawnSync(process.execPath, [join(build, 'dist', 'main.js'), '--config', filename],
      { encoding: 'utf8', env: { ...process.env, ORT_DISABLE_TELEMETRY: '1' }, timeout: 30_000 });
    const lines = result.stdout.trim().split('\n');
    return { status: result.status, lines, record: JSON.parse(lines[0]!) };
  }

  test('exits with 2 and one rejection line for an invalid configuration', async () => {
    const filename = join(directory, 'satellite.ts');
    await writeFile(filename, `export default ${JSON.stringify({ backend: { baseUrl: 'ftp://backend.example.test' } })};\n`);
    const { status, lines, record } = run(filename);
    expect(status).toBe(2);
    expect(lines).toHaveLength(1);
    expect(record).toMatchObject({ level: 'info', event: 'invalid_configuration',
      reason: 'invalid_configuration', field: 'backend.baseUrl' });
  });

  test('exits with 2 and one rejection line for a missing configuration file', () => {
    const { status, lines, record } = run(join(directory, 'missing.ts'));
    expect(status).toBe(2);
    expect(lines).toHaveLength(1);
    expect(record).toMatchObject({ level: 'info', event: 'invalid_configuration', reason: 'configuration_unavailable' });
  });
});

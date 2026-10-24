import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest';

let directory: string;

beforeEach(async () => { directory = await mkdtemp(join(tmpdir(), 'ambrogio-satellite-bootstrap-')); });
afterEach(async () => { await rm(directory, { recursive: true, force: true }); });

describe('compiled process', () => {
  // The entry point is built with the project's `tsc` into a temporary directory and run with Node.js.
  const root = fileURLToPath(new URL('../', import.meta.url));
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

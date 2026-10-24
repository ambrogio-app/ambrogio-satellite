import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

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

  /** Run the compiled process with only these configuration variables and no inherited AMBROGIO_* ones. */
  function run(variables: Readonly<Record<string, string>>, args: readonly string[] = []) {
    const inherited = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('AMBROGIO_')));
    const result = spawnSync(process.execPath, [join(build, 'dist', 'main.js'), ...args],
      { encoding: 'utf8', env: { ...inherited, ...variables, ORT_DISABLE_TELEMETRY: '1' }, timeout: 30_000 });
    const lines = result.stdout.trim().split('\n');
    return { status: result.status, lines, record: JSON.parse(lines[0]!) };
  }

  test('exits with 2 and one rejection line for an invalid configuration', () => {
    const { status, lines, record } = run({ AMBROGIO_ENV: 'production', AMBROGIO_BACKEND_URL: 'ftp://secret.example.test' });
    expect(status).toBe(2);
    expect(lines).toHaveLength(1);
    expect(lines[0]).not.toContain('secret');
    expect(record).toEqual({ level: 'info', time: expect.any(Number), event: 'invalid_configuration',
      variable: 'AMBROGIO_BACKEND_URL', condition: 'invalid' });
  });

  test('exits with 2 and one rejection line without a runtime environment', () => {
    const { status, lines, record } = run({ AMBROGIO_BACKEND_URL: 'http://backend.example.test' });
    expect(status).toBe(2);
    expect(lines).toHaveLength(1);
    expect(record).toMatchObject({ level: 'info', event: 'invalid_configuration', variable: 'AMBROGIO_ENV',
      condition: 'missing' });
  });

  test('exits with 2 and rejects startup arguments', () => {
    const { status, lines, record } = run({ AMBROGIO_ENV: 'production', AMBROGIO_BACKEND_URL: 'http://backend.example.test' },
      ['--config', '/config/satellite.ts']);
    expect(status).toBe(2);
    expect(lines).toHaveLength(1);
    expect(record).toMatchObject({ level: 'info', event: 'invalid_arguments' });
  });
});

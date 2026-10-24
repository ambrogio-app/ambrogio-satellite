import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, expect, test } from 'vitest';

// A copy of the sources is compiled with the project's TypeScript compiler, before and after adding a
// rejection variant: the exhaustive mappings of the process entry point must stop compiling.
const root = fileURLToPath(new URL('../../', import.meta.url));
const tsc = join(root, 'node_modules', '.bin', 'tsc');
let copy: string;

beforeEach(() => {
  copy = mkdtempSync(join(tmpdir(), 'ambrogio-satellite-types-'));
  for (const directory of ['src', 'test']) cpSync(join(root, directory), join(copy, directory), { recursive: true });
  for (const file of ['tsconfig.json', 'package.json']) cpSync(join(root, file), join(copy, file));
  symlinkSync(join(root, 'node_modules'), join(copy, 'node_modules'), 'dir');
});
afterEach(() => { rmSync(copy, { recursive: true, force: true }); });

function compile() {
  const result = spawnSync(tsc, ['--noEmit', '-p', join(copy, 'tsconfig.json')], { cwd: copy, encoding: 'utf8' });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

function addVariant(file: string, declaration: string, replacement: string): void {
  const path = join(copy, file);
  const source = readFileSync(path, 'utf8');
  expect(source).toContain(declaration);
  writeFileSync(path, source.replace(declaration, replacement));
}

test('the unmodified copy compiles', () => {
  expect(compile()).toEqual({ status: 0, output: '' });
}, 60_000);

test('a new configuration rejection is caught by the exhaustive mapping of the entry point', () => {
  addVariant('src/runtime/configuration.ts',
    'export type ConfigurationRejection = InvalidConfiguration;',
    "export type ConfigurationRejection = InvalidConfiguration | Readonly<{ kind: 'added_rejection' }>;");
  const { status, output } = compile();
  expect(status).not.toBe(0);
  expect(output).toMatch(/^src\/main\.ts\(\d+,\d+\): error TS2345: .*'never'/m);
  expect(output.trim().split('\n')).toHaveLength(1);
}, 60_000);

test('a new startup argument rejection is caught by the exhaustive mapping of the entry point', () => {
  addVariant('src/adapters/in/startup-arguments.ts',
    "export type InvalidArguments = Readonly<{ kind: 'invalid_arguments' }>;",
    "export type InvalidArguments = Readonly<{ kind: 'invalid_arguments' }> | Readonly<{ kind: 'added_rejection' }>;");
  const { status, output } = compile();
  expect(status).not.toBe(0);
  expect(output).toMatch(/^src\/main\.ts\(\d+,\d+\): error TS2345: .*'never'/m);
  expect(output.trim().split('\n')).toHaveLength(1);
}, 60_000);

test('every default branch of the entry point mappings passes the switched value to assertNever', () => {
  // With a single variant TypeScript narrows only the literal `kind` to `never`, not the variant object, so the
  // mapping passes the `kind` it switches on («Mapping esaustivo dei rifiuti previsti nel satellite»).
  const source = readFileSync(join(root, 'src', 'main.ts'), 'utf8');
  const switches = [...source.matchAll(/switch \(([\w.]+)\) \{[\s\S]*?default:\s*\n\s*assertNever\(([\w.]+)\);/g)];
  expect(switches.map(([, switched, passed]) => [switched, passed])).toEqual([
    ['args.error.kind', 'args.error.kind'], ['config.error.kind', 'config.error.kind']]);
  expect(source.match(/default:/g)).toHaveLength(2);
});

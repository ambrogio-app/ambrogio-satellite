import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

// «Profilo di installazione delle dipendenze del satellite»: exact versions, build scripts only for the listed
// packages, and the pnpm minimum release age with exceptions listed one exact version at a time.
const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const manifest = JSON.parse(read('package.json')) as {
  dependencies?: Record<string, string>; devDependencies?: Record<string, string>;
};
const direct = { ...manifest.dependencies, ...manifest.devDependencies };
// The project lockfile is the last YAML document; the first one records pnpm itself.
const projectLock = read('pnpm-lock.yaml').split(/^---$/m).at(-1) ?? '';
const rootImporter = projectLock.split(/^importers:$/m)[1]?.split(/^packages:$/m)[0] ?? '';
const workspace = read('pnpm-workspace.yaml');

function locked(name: string): Readonly<{ specifier?: string; version?: string }> {
  const key = (name.startsWith('@') ? `'${name}'` : name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`^ {6}${key}:\\n {8}specifier: (\\S+)\\n {8}version: (\\S+)$`, 'm').exec(rootImporter);
  return { specifier: match?.[1], version: match?.[2]?.replace(/\(.*$/, '') };
}

/** The entries of a top-level list of `pnpm-workspace.yaml`, without quotes. */
const listed = (key: string) => (new RegExp(`^${key}:\\n((?: {2}- .+\\n)*)`, 'm').exec(workspace)?.[1] ?? '')
  .split('\n').filter(Boolean).map(line => line.replace(/^ {2}- /, '').replace(/^'(.*)'$/, '$1'));

test('every direct dependency uses the exact version resolved in the lockfile', () => {
  expect(Object.keys(direct).length).toBeGreaterThan(0);
  for (const [name, version] of Object.entries(direct)) {
    expect(version, name).toMatch(/^\d+\.\d+\.\d+$/);
    expect(locked(name), name).toEqual({ specifier: version, version });
  }
  expect(existsSync(join(root, 'package-lock.json'))).toBe(false);
});

test('no dependency runs build scripts during installation', () => {
  expect(workspace).not.toMatch(/^allowBuilds:/m);
});

test('the minimum release age stays active with the exceptions of the contract, each an exact locked version', () => {
  expect(workspace).not.toMatch(/^minimumReleaseAge:/m);
  const exceptions = listed('minimumReleaseAgeExclude');
  expect(exceptions).toEqual(['vitest@5.0.5', '@vitest/mocker@5.0.5', '@vitest/spy@5.0.5']);
  for (const exception of exceptions) {
    const [, name, version] = /^(@?[^@]+)@(\d+\.\d+\.\d+)$/.exec(exception) ?? [];
    expect(name, exception).toBeDefined();
    const key = `${name}@${version}`.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    expect(projectLock, exception).toMatch(new RegExp(`^ {2}'?${key}'?:$`, 'm'));
  }
});

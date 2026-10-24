import { readdirSync, readFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { readSpecifiers } from './import-specifiers.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { dependencies?: Record<string, string> };
const dependencies = Object.keys(manifest.dependencies ?? {});

/** Every TypeScript file under `src`, read from the file system so untracked files are included too. */
const sources = readdirSync(join(root, 'src'), { recursive: true, encoding: 'utf8' })
  .filter(path => path.endsWith('.ts'))
  .map(path => join('src', path).split(sep).join('/'))
  .sort();

/**
 * Production files that load a module chosen at run time. The configuration loader imports the
 * installation's configuration module; it is not code of the backend.
 */
const computedImports = new Set(['src/adapters/out/config-file.ts']);

/** Package name of a bare specifier: `@scope/name/sub` -> `@scope/name`, `name/sub` -> `name`. */
function packageName(specifier: string): string {
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]!;
}

/** Why a production specifier would reach backend code, or undefined when it stays inside the satellite. */
function backendReach(from: string, specifier: string): string | undefined {
  if (/ambrogio-backend/.test(specifier)) return 'names the ambrogio-backend repository';
  if (/^@ambrogio\//.test(specifier)) return 'names a package of the backend';
  if (isAbsolute(specifier) || /^file:/.test(specifier)) return 'is an absolute path';
  if (specifier.startsWith('.')) {
    const target = relative(root, resolve(root, dirname(from), specifier));
    if (target.startsWith('..') || isAbsolute(target)) return `resolves outside the repository (${target})`;
    if (!target.split(sep).join('/').startsWith('src/')) return `resolves outside src (${target})`;
    return undefined;
  }
  if (specifier.startsWith('node:') || builtinModules.includes(specifier)) return undefined;
  if (dependencies.includes(packageName(specifier))) return undefined;
  return 'is not a Node.js module or a runtime dependency of the satellite';
}

describe('no backend code in the satellite', () => {
  it('reads a non-empty set of production files', () => {
    expect(sources.length).toBeGreaterThan(10);
    expect(sources).toContain('src/main.ts');
  });

  it('keeps every production import inside the satellite or its own dependencies', () => {
    const violations: string[] = [];
    let specifiers = 0;
    for (const from of sources) {
      for (const { specifier } of readSpecifiers(readFileSync(join(root, from), 'utf8'))) {
        specifiers++;
        if (specifier === '<computed>') {
          if (!computedImports.has(from)) violations.push(`${from}: computed import cannot be resolved`);
          continue;
        }
        const reason = backendReach(from, specifier);
        if (reason) violations.push(`${from}: ${specifier} ${reason}`);
      }
    }
    expect(specifiers).toBeGreaterThan(sources.length);
    expect(violations).toEqual([]);
  });

  it('declares no backend package among the dependencies', () => {
    const all = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as Record<string, unknown>;
    for (const field of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
      const names = Object.keys((all[field] ?? {}) as Record<string, string>);
      expect(names.filter(name => /^@ambrogio\/|^ambrogio-backend$/.test(name)), field).toEqual([]);
    }
  });

  it('recognises backend imports', () => {
    expect(backendReach('src/main.ts', '@ambrogio/conversations/application/produce-conversation-reply')).toBeDefined();
    expect(backendReach('src/main.ts', '../../ambrogio-backend/apps/server/dist/runtime/test-server.js')).toBeDefined();
    expect(backendReach('src/adapters/out/x.ts', '../../../outside.js')).toBeDefined();
    expect(backendReach('src/main.ts', 'ambrogio-backend')).toBeDefined();
    expect(backendReach('src/main.ts', 'left-pad')).toBeDefined();
    expect(backendReach('src/main.ts', './composition/satellite.js')).toBeUndefined();
    expect(backendReach('src/main.ts', 'node:path')).toBeUndefined();
    expect(backendReach('src/main.ts', 'pino')).toBeUndefined();
  });
});

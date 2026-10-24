import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { analyse, backendReach, describeViolation, repositoryWorkspace } from './architecture-rules.js';

// The import check is the rule `no-backend-imports` of the central architecture rules.
const root = fileURLToPath(new URL('../../', import.meta.url));
const workspace = repositoryWorkspace(root);
const sources = workspace.files.filter(path => path.startsWith('src/'));

describe('no backend code in the satellite', () => {
  it('reads a non-empty set of production files', () => {
    expect(sources.length).toBeGreaterThan(10);
    expect(sources).toContain('src/main.ts');
    expect(workspace.imports.filter(edge => edge.from.startsWith('src/')).length).toBeGreaterThan(sources.length);
  });

  it('keeps every production import inside the satellite or its own dependencies', () => {
    expect(analyse(workspace).filter(violation => violation.rule === 'no-backend-imports').map(describeViolation))
      .toEqual([]);
  });

  it('declares no backend package among the dependencies', () => {
    const all = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as Record<string, unknown>;
    for (const field of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
      const names = Object.keys((all[field] ?? {}) as Record<string, string>);
      expect(names.filter(name => /^@ambrogio\/|^ambrogio-backend$/.test(name)), field).toEqual([]);
    }
  });

  it('recognises backend imports', () => {
    const dependencies = workspace.dependencies;
    expect(backendReach('src/main.ts', '@ambrogio/conversations/application/produce-conversation-reply', dependencies)).toBeDefined();
    expect(backendReach('src/main.ts', '../../ambrogio-backend/apps/server/dist/runtime/test-server.js', dependencies)).toBeDefined();
    expect(backendReach('src/adapters/out/x.ts', '../../../outside.js', dependencies)).toBeDefined();
    expect(backendReach('src/main.ts', 'ambrogio-backend', dependencies)).toBeDefined();
    expect(backendReach('src/main.ts', 'left-pad', dependencies)).toBeDefined();
    expect(backendReach('src/main.ts', '<computed>', dependencies)).toBeDefined();
    expect(backendReach('src/main.ts', './composition/satellite.js', dependencies)).toBeUndefined();
    expect(backendReach('src/main.ts', 'node:path', dependencies)).toBeUndefined();
    expect(backendReach('src/main.ts', 'pino', dependencies)).toBeUndefined();
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

// «Distribuzione Docker facoltativa»: the build context leaves out the Git history, installed dependencies,
// build outputs, the model, the tests, local databases and environment files («Esecuzione host e container»).
const root = fileURLToPath(new URL('../../', import.meta.url));

test('the container build context excludes history, dependencies, outputs, model, tests, databases and environment files', () => {
  const entries = readFileSync(join(root, '.dockerignore'), 'utf8').split('\n').map(line => line.trim())
    .filter(line => line !== '' && !line.startsWith('#'));
  expect(entries).toEqual(expect.arrayContaining(['.git', 'node_modules', '**/node_modules', 'dist', 'system-model',
    'test', '**/*.spec.ts', '*.sqlite', '*.sqlite-*', '*.db', '*.db-*', '.env', '*.env', '*.env.*']));
  expect(entries.filter(entry => entry.startsWith('!'))).toEqual([]);
});

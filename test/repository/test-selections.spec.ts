import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const root = fileURLToPath(new URL('../../', import.meta.url));
const vitest = fileURLToPath(new URL('../../node_modules/vitest/vitest.mjs', import.meta.url));

/** The test files a Vitest project selects, as Vitest itself lists them, relative to the repository. */
function selection(project: 'fast' | 'e2e'): string[] {
  // A child Vitest must not inherit the state of the Vitest running this test.
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !/^(VITEST|TEST)/.test(name)));
  const listed = JSON.parse(execFileSync(process.execPath, [vitest, 'list', '--filesOnly', '--json', '--project', project],
    { cwd: root, env, encoding: 'utf8' })) as Array<{ file: string; projectName: string }>;
  expect(listed.every(entry => entry.projectName === project)).toBe(true);
  return listed.map(entry => relative(root, entry.file).split('\\').join('/')).sort();
}

// Verification: Prova del runner Vitest del satellite
test('the fast and e2e selections are disjoint and together cover every *.spec.ts file of the repository', () => {
  const specs = execFileSync('git', ['-C', root, 'ls-files', '--cached', '--others', '--exclude-standard'],
    { encoding: 'utf8' }).split('\n').filter(path => path.endsWith('.spec.ts')).sort();
  const fast = selection('fast');
  const e2e = selection('e2e');
  expect(fast.length).toBeGreaterThan(0);
  expect(e2e.length).toBeGreaterThan(0);
  expect(fast.filter(path => e2e.includes(path))).toEqual([]);
  expect([...fast, ...e2e].sort()).toEqual(specs);
});

// Verification: Prova del runner Vitest del satellite
test('pnpm test runs the fast project and pnpm test:e2e the e2e project, both with Vitest', () => {
  const manifest = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as {
    scripts: Record<string, string>;
  };
  expect(manifest.scripts.test).toBe('vitest run --project fast');
  expect(manifest.scripts['test:e2e']).toBe('vitest run --project e2e');
});

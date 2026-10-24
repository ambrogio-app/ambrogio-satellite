import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const module = fileURLToPath(new URL('./fatal-path.ts', import.meta.url));
const message = 'Ambrogio satellite stopped after a fatal error.';

/** Run a child Node.js process that installs the fatal path, then raises with markers. */
function run(raise: string) {
  const script = [
    `import { installFatalPath } from ${JSON.stringify(module)};`,
    `installFatalPath(${JSON.stringify(message)});`,
    "const failure = Object.assign(new Error('fatal-marker-message'), { detail: 'fatal-marker-property' });",
    raise,
    "setTimeout(() => console.log('still running'), 500);",
  ].join('\n');
  return spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8', timeout: 20_000 });
}

test.each([
  ['an uncaught exception', 'setTimeout(() => { throw failure; });'],
  ['an unhandled rejection', 'Promise.reject(failure);'],
])('%s writes only the fixed line to stderr and exits with 1', (_name, raise) => {
  const result = run(raise);
  expect(result.status).toBe(1);
  expect(result.stdout).toBe('');
  expect(result.stderr).toBe(`${message}\n`);
  expect(`${result.stdout}${result.stderr}`).not.toContain('marker');
});

test('main installs the fatal path before loading the application with dynamic imports', () => {
  const main = readFileSync(fileURLToPath(new URL('../main.ts', import.meta.url)), 'utf8');
  const staticImports = [...main.matchAll(/^import .* from '([^']+)';$/gm)].map(match => match[1]);
  expect(staticImports).toEqual(['./runtime/fatal-path.js']);
  expect(main.indexOf('installFatalPath(')).toBeLessThan(main.indexOf("import('"));
});

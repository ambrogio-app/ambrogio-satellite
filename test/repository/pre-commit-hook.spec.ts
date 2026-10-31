import { execFileSync, spawnSync } from 'node:child_process';
import { randomInt } from 'node:crypto';
import {
  chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, expect, test } from 'vitest';

const hook = fileURLToPath(new URL('../../.githooks/pre-commit', import.meta.url));
const pathEntries = (process.env.PATH ?? '').split(delimiter).filter(Boolean);

let directory: string;
let repository: string;
let modelChecksLog: string;

/**
 * A stand-in for `ambrogio-model/scripts/model-checks` next to the temporary repository: it records each
 * run and exits with the given status, so the hook is proven without running Reqvire.
 */
function fakeModelChecks(status: 0 | 1): void {
  const scripts = join(directory, 'ambrogio-model', 'scripts');
  mkdirSync(scripts, { recursive: true });
  const script = join(scripts, 'model-checks');
  writeFileSync(script, ['#!/bin/sh', `echo "run $*" >> '${modelChecksLog}'`,
    ...(status === 0 ? [] : ["echo 'model-checks: fake violation' >&2"]), `exit ${status}`, ''].join('\n'));
  chmodSync(script, 0o755);
}
const modelChecksCalls = () => (existsSync(modelChecksLog) ? readFileSync(modelChecksLog, 'utf8').split('\n').filter(Boolean) : []);
const modelChecksRuns = () => modelChecksCalls().length;

/**
 * A PATH with Git and without gitleaks: a folder holding only a link to Git, since Git and gitleaks may share a folder
 * of the system PATH.
 */
function withoutGitleaksPath(): string {
  const bin = join(directory, 'git-only');
  mkdirSync(bin);
  symlinkSync(execFileSync('sh', ['-c', 'command -v git'], { encoding: 'utf8' }).trim(), join(bin, 'git'));
  return bin;
}

/** A `gitleaks` on PATH that reports another version, ahead of every other entry. */
function otherGitleaksPath(): string {
  const bin = join(directory, 'other-gitleaks');
  mkdirSync(bin);
  writeFileSync(join(bin, 'gitleaks'), '#!/bin/sh\necho 8.30.0\nexit 0\n');
  chmodSync(join(bin, 'gitleaks'), 0o755);
  return [bin, ...pathEntries].join(delimiter);
}

/** A temporary repository isolated from the user and system Git configuration. */
function git(args: readonly string[], path = process.env.PATH ?? '') {
  return spawnSync('git', ['-C', repository, ...args], {
    encoding: 'utf8',
    env: { ...process.env, PATH: path, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' },
  });
}

function commits(): number {
  const result = git(['rev-list', '--count', '--all']);
  return result.status === 0 ? Number(result.stdout.trim()) : 0;
}

/** A GitHub token shape built at run time, so no credential is ever stored in this repository. */
function fakeToken(): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return `ghp_${Array.from({ length: 36 }, () => alphabet[randomInt(alphabet.length)]).join('')}`;
}

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'ambrogio-satellite-hook-'));
  repository = join(directory, 'repository');
  modelChecksLog = join(directory, 'model-checks.log');
  mkdirSync(repository);
  for (const args of [['init', '--quiet'], ['config', 'user.name', 'Hook Test'],
    ['config', 'user.email', 'hook@example.test'], ['config', 'commit.gpgsign', 'false'],
    ['config', 'core.hooksPath', '.githooks']]) {
    expect(git(args).status).toBe(0);
  }
  mkdirSync(join(repository, '.githooks'));
  copyFileSync(hook, join(repository, '.githooks', 'pre-commit'));
});
afterEach(() => { rmSync(directory, { recursive: true, force: true }); });

test('the versioned hook is executable and gitleaks 8.30.1 is on PATH', () => {
  expect(statSync(hook).mode & 0o111).toBe(0o111);
  expect(execFileSync('gitleaks', ['version'], { encoding: 'utf8' }).trim()).toBe('8.30.1');
});

test('a staged credential blocks the commit without printing its value or checking the model', () => {
  fakeModelChecks(0);
  const token = fakeToken();
  writeFileSync(join(repository, 'settings.env'), `GITHUB_TOKEN=${token}\n`);
  expect(git(['add', 'settings.env']).status).toBe(0);
  const result = git(['commit', '--quiet', '-m', 'Add settings']);
  expect(result.status).not.toBe(0);
  expect(`${result.stdout}${result.stderr}`).not.toContain(token);
  expect(`${result.stdout}${result.stderr}`).toMatch(/leaks found: [1-9]/);
  expect(commits()).toBe(0);
  expect(modelChecksRuns()).toBe(0);
});

test('a commit without secrets and with a valid model passes the hook after the model checks', () => {
  fakeModelChecks(0);
  writeFileSync(join(repository, 'notes.txt'), 'The satellite plays a tone when listening.\n');
  expect(git(['add', 'notes.txt']).status).toBe(0);
  const result = git(['commit', '--quiet', '-m', 'Add notes']);
  expect(result.stderr).toContain('no leaks found');
  expect(result.status).toBe(0);
  expect(commits()).toBe(1);
  // The model checks read the staged content: the root of the repository and the absolute path of its index.
  const [call] = modelChecksCalls();
  const [, flag, top, index] = call!.split(' ');
  expect(flag).toBe('--staged');
  expect(top).toBe(git(['rev-parse', '--show-toplevel']).stdout.trim());
  expect(index!.startsWith('/')).toBe(true);
  expect(index!.startsWith(join(top!, '.git'))).toBe(true);
  expect(index!.split('/').at(-1)).toMatch(/^index/);
});

test('failing model checks block the commit', () => {
  fakeModelChecks(1);
  writeFileSync(join(repository, 'notes.txt'), 'The satellite plays a tone when listening.\n');
  expect(git(['add', 'notes.txt']).status).toBe(0);
  const result = git(['commit', '--quiet', '-m', 'Add notes']);
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain('model-checks: fake violation');
  expect(modelChecksRuns()).toBe(1);
  expect(commits()).toBe(0);
});

test('without ambrogio-model next to the repository the commit is blocked with a clear message', () => {
  writeFileSync(join(repository, 'notes.txt'), 'The satellite plays a tone when listening.\n');
  expect(git(['add', 'notes.txt']).status).toBe(0);
  const result = git(['commit', '--quiet', '-m', 'Add notes']);
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain('pre-commit: ambrogio-model is not next to this repository; '
    + 'clone https://github.com/ambrogio-app/ambrogio-model beside it and retry.');
  expect(commits()).toBe(0);
});

test('the versioned hook runs the model checks of the side-by-side ambrogio-model on the staged content', () => {
  const text = readFileSync(hook, 'utf8');
  expect(text).toContain('top="$(git rev-parse --show-toplevel)"');
  expect(text).toContain('checks="$top/../ambrogio-model/scripts/model-checks"');
  expect(text).toMatch(/^exec "\$checks" --staged "\$top" "\$index"$/m);
});

test('the versioned hook scans the staged changes without honouring gitleaks:allow comments', () => {
  expect(readFileSync(hook, 'utf8')).toMatch(
    /^gitleaks git --pre-commit --staged --redact --no-banner --ignore-gitleaks-allow \. \|\| exit 1$/m);
});

test('a gitleaks:allow comment does not let a staged credential through', () => {
  fakeModelChecks(0);
  const token = fakeToken();
  writeFileSync(join(repository, 'settings.env'), `GITHUB_TOKEN=${token} # gitleaks:allow\n`);
  expect(git(['add', 'settings.env']).status).toBe(0);
  const result = git(['commit', '--quiet', '-m', 'Add settings']);
  expect(result.status).not.toBe(0);
  expect(`${result.stdout}${result.stderr}`).not.toContain(token);
  expect(`${result.stdout}${result.stderr}`).toMatch(/leaks found: [1-9]/);
  expect(commits()).toBe(0);
  expect(modelChecksRuns()).toBe(0);
});

test.each([
  ['without gitleaks on PATH', withoutGitleaksPath],
  ['with another gitleaks version on PATH', otherGitleaksPath],
])('%s the commit is blocked with the required version and where to install it', (_case, path) => {
  fakeModelChecks(0);
  const searchPath = path();
  expect(searchPath.split(delimiter).some(entry => existsSync(join(entry, 'git')))).toBe(true);
  writeFileSync(join(repository, 'notes.txt'), 'No secrets here.\n');
  expect(git(['add', 'notes.txt'], searchPath).status).toBe(0);
  const result = git(['commit', '--quiet', '-m', 'Add notes'], searchPath);
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain('pre-commit: gitleaks 8.30.1 is not on PATH; install gitleaks 8.30.1 '
    + '(https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1) and retry.');
  expect(commits()).toBe(0);
  expect(modelChecksRuns()).toBe(0);
});

import { execFileSync, spawnSync } from 'node:child_process';
import { randomInt } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, expect, test } from 'vitest';

const hook = fileURLToPath(new URL('../../.githooks/pre-commit', import.meta.url));
const pathEntries = (process.env.PATH ?? '').split(delimiter).filter(Boolean);
const withoutGitleaks = pathEntries.filter(entry => !existsSync(join(entry, 'gitleaks'))).join(delimiter);

let repository: string;

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
  repository = mkdtempSync(join(tmpdir(), 'ambrogio-satellite-hook-'));
  for (const args of [['init', '--quiet'], ['config', 'user.name', 'Hook Test'],
    ['config', 'user.email', 'hook@example.test'], ['config', 'commit.gpgsign', 'false'],
    ['config', 'core.hooksPath', '.githooks']]) {
    expect(git(args).status).toBe(0);
  }
  mkdirSync(join(repository, '.githooks'));
  copyFileSync(hook, join(repository, '.githooks', 'pre-commit'));
});
afterEach(() => { rmSync(repository, { recursive: true, force: true }); });

test('the versioned hook is executable and gitleaks 8.30.1 is on PATH', () => {
  expect(statSync(hook).mode & 0o111).toBe(0o111);
  expect(execFileSync('gitleaks', ['version'], { encoding: 'utf8' }).trim()).toBe('8.30.1');
});

test('a staged credential blocks the commit without printing its value', () => {
  const token = fakeToken();
  writeFileSync(join(repository, 'settings.env'), `GITHUB_TOKEN=${token}\n`);
  expect(git(['add', 'settings.env']).status).toBe(0);
  const result = git(['commit', '--quiet', '-m', 'Add settings']);
  expect(result.status).not.toBe(0);
  expect(`${result.stdout}${result.stderr}`).not.toContain(token);
  expect(`${result.stdout}${result.stderr}`).toMatch(/leaks found: [1-9]/);
  expect(commits()).toBe(0);
});

test('a commit without secrets passes the hook', () => {
  writeFileSync(join(repository, 'notes.txt'), 'The satellite plays a tone when listening.\n');
  expect(git(['add', 'notes.txt']).status).toBe(0);
  const result = git(['commit', '--quiet', '-m', 'Add notes']);
  expect(result.stderr).toContain('no leaks found');
  expect(result.status).toBe(0);
  expect(commits()).toBe(1);
});

test('without gitleaks on PATH the commit is blocked with install and enable instructions', () => {
  expect(withoutGitleaks.split(delimiter).some(entry => existsSync(join(entry, 'git')))).toBe(true);
  writeFileSync(join(repository, 'notes.txt'), 'No secrets here.\n');
  expect(git(['add', 'notes.txt'], withoutGitleaks).status).toBe(0);
  const result = git(['commit', '--quiet', '-m', 'Add notes'], withoutGitleaks);
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain('gitleaks is not on PATH');
  expect(result.stderr).toContain('Install gitleaks 8.30.1');
  expect(result.stderr).toContain('git config core.hooksPath .githooks');
  expect(commits()).toBe(0);
});

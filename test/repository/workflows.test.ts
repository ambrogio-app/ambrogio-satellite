import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The workflows are read as plain text: each check names the exact lines the contracts require.
const read = (name: string) => readFileSync(new URL(`../../.github/workflows/${name}`, import.meta.url), 'utf8');
const workflows = { ci: read('ci.yml'), secretScan: read('secret-scan.yml'), publish: read('publish-image.yml') };
const all = Object.values(workflows);

/** Lines of a top-level key, or of a nested key, until the indentation returns to its level. */
function section(text: string, key: string, indent = 0): string {
  const lines = text.split('\n');
  const prefix = ' '.repeat(indent);
  const start = lines.findIndex(line => line === `${prefix}${key}:` || line.startsWith(`${prefix}${key}: `));
  if (start < 0) throw new Error(`Missing section ${key}`);
  const rest = lines.slice(start + 1);
  const end = rest.findIndex(line => line.trim() !== '' && !line.startsWith(`${prefix} `));
  return [lines[start], ...(end < 0 ? rest : rest.slice(0, end))].join('\n');
}
const job = (text: string, id: string) => section(section(text, 'jobs'), id, 2);
const jobIds = (text: string) => [...section(text, 'jobs').matchAll(/^ {2}([\w-]+):$/gm)].map(match => match[1]!);
/** Each `- ` item of the steps of a job. */
const steps = (jobText: string) => jobText.split(/\n(?= {6}- )/).slice(1);
const step = (jobText: string, name: string) => {
  const found = steps(jobText).find(item => item.includes(`- name: ${name}\n`));
  if (!found) throw new Error(`Missing step ${name}`);
  return found;
};
const sha = /^[0-9a-f]{40}$/;

describe('workflow protections', () => {
  const pinned = new Map([
    ['actions/checkout', ['d23441a48e516b6c34aea4fa41551a30e30af803', 'v6']],
    ['actions/setup-node', ['249970729cb0ef3589644e2896645e5dc5ba9c38', 'v6']],
    ['docker/setup-qemu-action', ['c7c53464625b32c7a7e944ae62b3e17d2b600130', 'v3']],
    ['docker/setup-buildx-action', ['8d2750c68a42422c14e847fe6c8ac0403b4cbd6f', 'v3']],
  ]);

  it('pins every external action by commit SHA with the major version of the contract', () => {
    for (const text of all) {
      for (const [, reference] of text.matchAll(/^\s*(?:- )?uses: (.+)$/gm)) {
        if (reference!.startsWith('./.github/workflows/')) continue;
        const match = /^([\w.-]+\/[\w.-]+)@(\S+) # (v\d+)$/.exec(reference!);
        expect(match, reference).not.toBeNull();
        const [, action, ref, version] = match!;
        expect(ref, reference).toMatch(sha);
        expect(pinned.get(action!), reference).toEqual([ref, version]);
      }
    }
  });

  it('never keeps checkout credentials and never caches package manager data', () => {
    for (const text of all) {
      const items = text.split(/\n(?=\s*- name: )/);
      const checkouts = items.filter(item => item.includes('uses: actions/checkout@'));
      const setups = items.filter(item => item.includes('uses: actions/setup-node@'));
      expect(checkouts.length).toBeGreaterThan(0);
      for (const item of checkouts) expect(item).toMatch(/^\s+persist-credentials: false$/m);
      for (const item of setups) expect(item).toMatch(/^\s+package-manager-cache: false$/m);
    }
  });

  it('bounds every job that runs steps with the contract timeout', () => {
    expect(job(workflows.ci, 'checks')).toMatch(/^ {4}name: Satellite checks$/m);
    expect(job(workflows.ci, 'checks')).toMatch(/^ {4}timeout-minutes: 15$/m);
    expect(job(workflows.secretScan, 'gitleaks')).toMatch(/^ {4}name: Secret scan$/m);
    expect(job(workflows.secretScan, 'gitleaks')).toMatch(/^ {4}timeout-minutes: 10$/m);
    expect(job(workflows.publish, 'publish')).toMatch(/^ {4}timeout-minutes: 60$/m);
    for (const text of all) {
      for (const id of jobIds(text)) {
        const body = job(text, id);
        if (/^ {4}steps:$/m.test(body)) expect(body, id).toMatch(/^ {4}timeout-minutes: \d+$/m);
        else expect(body, id).toMatch(/^ {4}uses: \.\/\.github\/workflows\/[\w-]+\.yml$/m);
      }
    }
  });

  it('grants read-only defaults and package writes only to the publish job', () => {
    for (const text of all) expect(section(text, 'permissions')).toBe('permissions:\n  contents: read\n');
    for (const text of all) {
      for (const id of jobIds(text)) {
        const body = job(text, id);
        if (text === workflows.publish && id === 'publish') {
          expect(section(body, 'permissions', 4)).toBe('    permissions:\n      contents: read\n      packages: write');
        } else {
          expect(body, id).not.toMatch(/^ {4}permissions:/m);
        }
      }
    }
    expect(all.join('\n').match(/: write$/gm)).toEqual([': write']);
  });

  it('declares reusable checks and a non-cancelling release group with stdin login and unconditional logout', () => {
    expect(section(workflows.ci, 'on')).toMatch(/^ {2}workflow_call:$/m);
    expect(section(workflows.secretScan, 'on')).toMatch(/^ {2}workflow_call:$/m);
    expect(section(workflows.publish, 'concurrency')).toBe(
      'concurrency:\n  group: satellite-release-${{ github.ref }}\n  cancel-in-progress: false\n');
    const publish = job(workflows.publish, 'publish');
    expect(step(publish, 'Log in to GHCR')).toContain(
      `printf '%s' "$GHCR_TOKEN" | docker login ghcr.io --username "$GITHUB_ACTOR" --password-stdin`);
    expect(step(publish, 'Log in to GHCR')).toContain('GHCR_TOKEN: ${{ secrets.GITHUB_TOKEN }}');
    const logout = step(publish, 'Log out of GHCR');
    expect(logout).toMatch(/^ {8}if: always\(\)$/m);
    expect(logout).toMatch(/^ {8}run: docker logout ghcr\.io$/m);
  });
});

describe('CI workflow', () => {
  const checks = job(workflows.ci, 'checks');

  it('runs on pull requests, pushes to main, manual runs and workflow calls without path filters', () => {
    expect(section(workflows.ci, 'on')).toBe(
      'on:\n  pull_request:\n  push:\n    branches: [main]\n  workflow_dispatch:\n  workflow_call:\n');
    expect(workflows.ci).not.toMatch(/paths(-ignore)?:/);
  });

  it('uses the pinned runner, Node.js, pnpm, frozen lockfile and ONNX Runtime settings', () => {
    expect(checks).toMatch(/^ {4}runs-on: ubuntu-24\.04$/m);
    expect(step(checks, 'Set up Node.js')).toMatch(/^ {10}node-version: '24'$/m);
    expect(step(checks, 'Install pnpm')).toMatch(/run: npm install --global pnpm@12\.11\.2$/m);
    expect(step(checks, 'Install dependencies')).toMatch(/run: pnpm install --frozen-lockfile$/m);
    expect(section(checks, 'env', 4)).toBe(
      "    env:\n      ONNXRUNTIME_NODE_INSTALL: skip\n      ORT_DISABLE_TELEMETRY: '1'");
  });

  it('installs the gitleaks release of the secret scan, verifying its checksum before extraction', () => {
    const version = /^ {2}GITLEAKS_VERSION: (\S+)$/m.exec(workflows.secretScan)?.[1];
    const checksum = /^ {2}GITLEAKS_SHA256: (\S+)$/m.exec(workflows.secretScan)?.[1];
    expect(version).toBe('8.30.1');
    expect(checksum).toMatch(/^[0-9a-f]{64}$/);
    expect(workflows.ci).toMatch(new RegExp(`^ {2,6}GITLEAKS_VERSION: ${version!.replaceAll('.', '\\.')}$`, 'm'));
    expect(workflows.ci).toMatch(new RegExp(`^ {2,6}GITLEAKS_SHA256: ${checksum}$`, 'm'));
    const install = step(checks, 'Install gitleaks');
    expect(install).toBe(step(job(workflows.secretScan, 'gitleaks'), 'Install gitleaks'));
  });

  it('runs every check in the contract order and lets each failure fail the job', () => {
    const commands = [
      'run: pnpm install --frozen-lockfile',
      'run: npx --yes @reqvire-org/reqvire@1.3.2 --workspace "$PWD" validate',
      'npx --yes @reqvire-org/reqvire@1.3.2 --workspace "$PWD" lint --json > "$report"',
      "jq -e '.auto_fixable == [] and .needs_manual_review == []' \"$report\"",
      'run: node scripts/check-model.mjs',
      'run: pnpm typecheck',
      'name: Install gitleaks',
      'run: pnpm test',
      'run: pnpm build',
    ];
    const positions = commands.map(command => checks.indexOf(command));
    expect(positions.every(position => position >= 0), String(positions)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(step(checks, 'Lint Reqvire model')).toContain('set -euo pipefail');
    for (const text of all) expect(text).not.toContain('continue-on-error');
  });
});

describe('secret scan workflow', () => {
  const scan = job(workflows.secretScan, 'gitleaks');

  it('runs on every push, pull request, manual run and workflow call without filters', () => {
    expect(section(workflows.secretScan, 'on')).toBe(
      'on:\n  push:\n  pull_request:\n  workflow_dispatch:\n  workflow_call:\n');
  });

  it('checks out the whole history without stored credentials', () => {
    const checkout = step(scan, 'Check out full history');
    expect(checkout).toMatch(/^ {10}fetch-depth: 0$/m);
    expect(checkout).toMatch(/^ {10}persist-credentials: false$/m);
  });

  it('downloads the pinned release, verifies the checksum before extracting and scans the whole history', () => {
    expect(workflows.secretScan).toMatch(/^ {2}GITLEAKS_VERSION: 8\.30\.1$/m);
    expect(workflows.secretScan).toMatch(
      /^ {2}GITLEAKS_SHA256: 551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb$/m);
    const install = step(scan, 'Install gitleaks');
    expect(install).toContain('archive="gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz"');
    expect(install).toContain('"https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/$archive"');
    expect(install).toContain('set -euo pipefail');
    const check = install.indexOf('sha256sum --check --strict');
    expect(check).toBeGreaterThan(install.indexOf('curl -fsSL'));
    expect(install.indexOf('tar -xzf')).toBeGreaterThan(check);
    expect(step(scan, 'Scan the whole history')).toMatch(
      /^ {8}run: gitleaks git --redact --no-banner --exit-code 1 \.$/m);
  });

  it('gates publication on both the CI and the secret scan of the same commit', () => {
    expect(job(workflows.publish, 'checks')).toMatch(/^ {4}uses: \.\/\.github\/workflows\/ci\.yml$/m);
    expect(job(workflows.publish, 'secret-scan')).toMatch(/^ {4}uses: \.\/\.github\/workflows\/secret-scan\.yml$/m);
    expect(job(workflows.publish, 'publish')).toMatch(/^ {4}needs: \[checks, secret-scan\]$/m);
  });
});

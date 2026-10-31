import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The workflows are read as plain text: each check names the exact lines the contracts require.
const read = (name: string) => readFileSync(new URL(`../../.github/workflows/${name}`, import.meta.url), 'utf8');
const workflows = { ci: read('ci.yml'), secretScan: read('secret-scan.yml'), publish: read('publish-image.yml') };
const all = Object.values(workflows);

// Shared values live in the contracts of ambrogio-model, checked out side by side in the workspace
// (locally and in CI); the satellite's own values live in its contracts.
const contract = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const commonContracts = contract('../../../ambrogio-model/system-model/Contracts/ModelDrivenDevelopment.md');
const satelliteContracts = contract('../../system-model/Contracts/VoiceSatellite.md');
const manifest = (path: string) => JSON.parse(contract(path)) as { packageManager?: string; scripts?: Record<string, string> };

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
  /** Actions fixed by the contracts, written as `owner/action@<sha>` (vN). */
  const pinnedIn = (text: string) => [...text.matchAll(/`([\w.-]+\/[\w.-]+)@([0-9a-f]{40})` \((v\d+)\)/g)]
    .map(([, action, ref, version]) => [action!, [ref!, version!]] as const);
  const pinned = new Map([...pinnedIn(commonContracts), ...pinnedIn(satelliteContracts)]);

  it('reads the pinned actions from the contracts', () => {
    expect([...pinned.keys()].sort()).toEqual(
      ['actions/checkout', 'actions/setup-node', 'docker/setup-buildx-action', 'docker/setup-qemu-action']);
  });

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
    expect(satelliteContracts).toContain(
      '`timeout-minutes: 15` per `Satellite checks`, `10` per `Secret scan` e `60` per il job `publish`');
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

  it('uses the pinned runner, Node.js, pnpm through Corepack and the frozen lockfile', () => {
    expect(checks).toMatch(/^ {4}runs-on: ubuntu-24\.04$/m);
    expect(step(checks, 'Set up Node.js')).toMatch(/^ {10}node-version: '24'$/m);
    expect(manifest('../../package.json').packageManager).toBe('pnpm@12.11.2');
    expect(manifest('../../../ambrogio-backend/package.json').packageManager).toBe('pnpm@12.11.2');
    expect(step(checks, 'Enable Corepack')).toMatch(/^ {8}run: corepack enable$/m);
    expect(commonContracts).toContain('esegue `corepack enable` con la variabile d\'ambiente `COREPACK_ENABLE_DOWNLOAD_PROMPT` uguale a `0`');
    const install = step(checks, 'Install dependencies');
    expect(install).toMatch(/^ {8}working-directory: workspace\/ambrogio-satellite$/m);
    expect(install).toMatch(/run: pnpm install --frozen-lockfile$/m);
    expect(section(checks, 'env', 4)).toBe('    env:\n      BRANCH: ${{ github.head_ref || github.ref_name }}\n'
      + "      COREPACK_ENABLE_DOWNLOAD_PROMPT: '0'\n"
      + '      AMBROGIO_TEST_DATABASE_URL: postgres://postgres@127.0.0.1:5432/postgres');
  });

  it('provides the PostgreSQL test server that the integration test passes to the backend test entry', () => {
    const postgres = section(section(checks, 'services', 4), 'postgres', 6);
    expect(postgres).toMatch(/^ {8}image: pgvector\/pgvector:pg18$/m);
    expect(section(postgres, 'env', 8)).toMatch(/^ {10}POSTGRES_HOST_AUTH_METHOD: trust$/m);
    expect(section(postgres, 'ports', 8)).toMatch(/^ {10}- 5432:5432$/m);
    expect(postgres).toMatch(/--health-cmd "pg_isready/);
    const script = contract('../../scripts/verify-backend.mjs');
    expect(script).toMatch(/process\.env\.AMBROGIO_TEST_DATABASE_URL/);
    expect(script).toMatch(/startTestServer\(\{ databaseUrl,/);
  });

  it('checks out the workspace side by side and checks its model without a Reqvire version of its own', () => {
    const checkout = step(checks, 'Check out repository');
    expect(checkout).toMatch(/^ {10}path: workspace\/ambrogio-satellite$/m);
    expect(checkout).toMatch(/^ {10}fetch-depth: 0$/m);
    const model = step(checks, 'Check out ambrogio-model');
    expect(model).toContain('set -euo pipefail');
    expect(model).toContain('url=https://github.com/ambrogio-app/ambrogio-model.git');
    expect(model).toContain('ref=main');
    expect(model).toContain('if git ls-remote --exit-code --heads "$url" "$BRANCH" >/dev/null; then ref="$BRANCH"; fi');
    expect(model).toContain('git clone --quiet --branch "$ref" "$url" workspace/ambrogio-model');
    expect(step(checks, 'Check out the other repositories side by side')).toMatch(
      /^ {8}run: workspace\/ambrogio-model\/scripts\/checkout-workspace workspace "\$BRANCH"$/m);
    expect(step(checks, 'Check the model of the workspace')).toMatch(
      /^ {8}run: workspace\/ambrogio-model\/scripts\/model-checks --workspace workspace$/m);
    expect(workflows.ci).not.toMatch(/reqvire/i);
    expect(workflows.ci).not.toContain('check-model');
  });

  it('builds the side-by-side backend and runs the integration test only after the satellite build', () => {
    const install = step(checks, 'Install backend dependencies');
    expect(install).toMatch(/^ {8}working-directory: workspace\/ambrogio-backend$/m);
    expect(install).toMatch(/^ {8}run: pnpm install --frozen-lockfile$/m);
    const build = step(checks, 'Build backend');
    expect(build).toMatch(/^ {8}working-directory: workspace\/ambrogio-backend$/m);
    expect(build).toMatch(/^ {8}run: pnpm build$/m);
    const integration = step(checks, 'Test against the side-by-side backend');
    expect(integration).toMatch(/^ {8}working-directory: workspace\/ambrogio-satellite$/m);
    expect(integration).toMatch(/^ {8}run: pnpm test:backend$/m);
    expect(manifest('../../package.json')).toMatchObject(
      { scripts: { 'test:backend': 'pnpm build && node scripts/verify-backend.mjs' } });
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
      'name: Check out repository',
      'name: Set up Node.js',
      'name: Check out ambrogio-model',
      'run: workspace/ambrogio-model/scripts/checkout-workspace workspace "$BRANCH"',
      'run: workspace/ambrogio-model/scripts/model-checks --workspace workspace',
      'run: corepack enable',
      'name: Install backend dependencies',
      'name: Build backend',
      'name: Install dependencies',
      'run: pnpm audit --audit-level high',
      'run: pnpm typecheck',
      'name: Install gitleaks',
      'run: pnpm test\n',
      'run: pnpm test:e2e\n',
      'name: Build\n',
      'run: pnpm test:backend',
    ];
    const positions = commands.map(command => checks.indexOf(command));
    expect(positions.every(position => position >= 0), String(positions)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    for (const name of ['Run tests', 'Run compiled process tests', 'Build', 'Check TypeScript and core isolation']) {
      expect(step(checks, name), name).toMatch(/^ {8}working-directory: workspace\/ambrogio-satellite$/m);
    }
    for (const text of all) expect(text).not.toContain('continue-on-error');
  });
});

describe('dependency audit', () => {
  const checks = job(workflows.ci, 'checks');

  it('audits the satellite dependencies for high and critical advisories right after the frozen install', () => {
    const audit = step(checks, 'Audit dependencies');
    expect(audit).toMatch(/^ {8}working-directory: workspace\/ambrogio-satellite$/m);
    expect(audit).toMatch(/^ {8}run: pnpm audit --audit-level high$/m);
    const names = steps(checks).map(item => /- name: (.+)\n/.exec(item)?.[1]);
    expect(names.indexOf('Audit dependencies')).toBe(names.indexOf('Install dependencies') + 1);
    expect(commonContracts).toContain('esegue `pnpm audit --audit-level high` nella cartella del repository');
  });

  it('never weakens the audit with ignore or scope options', () => {
    for (const text of all) {
      for (const [line] of text.matchAll(/pnpm audit.*$/gm)) {
        expect(line).not.toMatch(/--(ignore|ignore-unfixable|ignore-registry-errors|prod|dev)\b/);
      }
    }
  });

  it('accepts only single GHSA advisories listed in the common contract as exceptions', () => {
    const config = readFileSync(new URL('../../pnpm-workspace.yaml', import.meta.url), 'utf8');
    const audit = /^auditConfig:\n((?: {2}.*\n?)*)/m.exec(config)?.[1] ?? '';
    const ignored = [...audit.matchAll(/^ {4}- (.+)$/gm)].map(match => match[1]!.replace(/^'|'$/g, ''));
    for (const advisory of ignored) {
      expect(advisory).toMatch(/^GHSA(-[23456789cfghjmpqrvwx]{4}){3}$/);
      expect(commonContracts).toContain(advisory);
    }
    expect(audit.replace(/^ {2}ignoreGhsas:\n|^ {4}- .+\n?/gm, '').trim()).toBe('');
  });
});

describe('Corepack and complete verification', () => {
  const checks = job(workflows.ci, 'checks');
  const dockerfile = readFileSync(new URL('../../Dockerfile', import.meta.url), 'utf8');

  it('never installs or runs another pnpm in the workflows or the Dockerfile', () => {
    for (const text of [...all, dockerfile]) {
      expect(text).not.toMatch(/npm install (--global|-g) pnpm|npx[^\n]*pnpm/);
    }
  });

  it('enables Corepack in the Docker build stage before the frozen install', () => {
    const build = dockerfile.split(/^FROM /m)[1]!;
    expect(build).toMatch(/^node:24\S* AS build$/m);
    const prompt = build.indexOf('ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0');
    const enable = build.indexOf('RUN corepack enable');
    const install = build.indexOf('RUN pnpm install --frozen-lockfile');
    expect(prompt).toBeGreaterThanOrEqual(0);
    expect(enable).toBeGreaterThan(prompt);
    expect(install).toBeGreaterThan(enable);
    expect(build.indexOf('COPY package.json')).toBeGreaterThan(enable);
  });

  it('runs in pnpm verify the same checks as the CI job, in the same order', () => {
    const runs = steps(checks).map(item => ({
      directory: /^ {8}working-directory: workspace\/(\S+)$/m.exec(item)?.[1],
      command: /^ {8}run: (pnpm .+)$/m.exec(item)?.[1],
    })).filter((entry): entry is { directory: string; command: string } => !!entry.directory && !!entry.command);
    const backend = runs.filter(entry => entry.directory === 'ambrogio-backend').map(entry => entry.command);
    const satellite = runs.filter(entry => entry.directory === 'ambrogio-satellite').map(entry => entry.command);
    expect(backend).toEqual(['pnpm install --frozen-lockfile', 'pnpm build']);
    expect(satellite.slice(0, 2)).toEqual(['pnpm install --frozen-lockfile', 'pnpm audit --audit-level high']);
    const expected = ['../ambrogio-model/scripts/model-checks', ...satellite.slice(0, 2),
      `(cd ../ambrogio-backend && ${backend.join(' && ')})`, ...satellite.slice(2)].join(' && ');
    expect(manifest('../../package.json')).toMatchObject({ scripts: { verify: expected } });
    expect(satellite.slice(2)).toEqual(['pnpm typecheck', 'pnpm test', 'pnpm test:e2e', 'pnpm build', 'pnpm test:backend']);
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
    const version = /`gitleaks_(\d+\.\d+\.\d+)_linux_x64\.tar\.gz`/.exec(commonContracts)?.[1];
    const checksum = /SHA-256 `([0-9a-f]{64})`/.exec(commonContracts)?.[1];
    expect(version).toBe('8.30.1');
    expect(checksum).toBeDefined();
    expect(workflows.secretScan).toMatch(new RegExp(`^ {2}GITLEAKS_VERSION: ${version!.replaceAll('.', '\\.')}$`, 'm'));
    expect(workflows.secretScan).toMatch(new RegExp(`^ {2}GITLEAKS_SHA256: ${checksum}$`, 'm'));
    const install = step(scan, 'Install gitleaks');
    expect(install).toContain('archive="gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz"');
    expect(install).toContain('"https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/$archive"');
    expect(install).toContain('set -euo pipefail');
    const check = install.indexOf('sha256sum --check --strict');
    expect(check).toBeGreaterThan(install.indexOf('curl -fsSL'));
    expect(install.indexOf('tar -xzf')).toBeGreaterThan(check);
    expect(step(scan, 'Scan the whole history')).toMatch(
      /^ {8}run: gitleaks git --redact --no-banner --ignore-gitleaks-allow --exit-code 1 \.$/m);
  });

  it('gates publication on both the CI and the secret scan of the same commit', () => {
    expect(job(workflows.publish, 'checks')).toMatch(/^ {4}uses: \.\/\.github\/workflows\/ci\.yml$/m);
    expect(job(workflows.publish, 'secret-scan')).toMatch(/^ {4}uses: \.\/\.github\/workflows\/secret-scan\.yml$/m);
    expect(job(workflows.publish, 'publish')).toMatch(/^ {4}needs: \[checks, secret-scan\]$/m);
  });

  it('writes the published image reference to the job summary after the push', () => {
    const publish = step(job(workflows.publish, 'publish'), 'Publish verified images and release manifest');
    const summary = publish.indexOf('echo "Published $IMAGE for linux/amd64 and linux/arm64" >> "$GITHUB_STEP_SUMMARY"');
    expect(summary).toBeGreaterThan(publish.indexOf('docker buildx imagetools create --tag "$IMAGE"'));
    expect(satelliteContracts).toContain('scrive nel riepilogo del job');
  });
});

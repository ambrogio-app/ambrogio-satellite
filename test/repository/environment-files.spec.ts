import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { configurationVariables, defaultedVariables } from '../../src/runtime/configuration.js';

// «Caricamento esplicito del file d'ambiente locale del satellite» and «Valori predefiniti del satellite
// applicati dal modulo di configurazione»: the example files list the variables without repeating defaults,
// and only the development command loads `.env`.
const root = fileURLToPath(new URL('../../', import.meta.url));
const text = (file: string) => readFileSync(join(root, file), 'utf8');

function envExample(): Map<string, string> {
  const entries = text('.env.example').split('\n').map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .map(line => {
      const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line);
      expect(match, line).not.toBeNull();
      return [match![1]!, match![2]!] as const;
    });
  return new Map(entries);
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : entry.name.endsWith('.ts') ? [path] : [];
  });
}

describe('local environment file', () => {
  it('.env.example lists every configuration variable, empty except the development environment', () => {
    const variables = envExample();
    expect([...variables.keys()].sort()).toEqual([...configurationVariables].sort());
    for (const [name, value] of variables) {
      expect(value, name).toBe(name === 'AMBROGIO_ENV' ? 'development' : '');
    }
  });

  it('is loaded only by the development command with node --env-file', () => {
    const scripts = JSON.parse(text('package.json')).scripts as Record<string, string>;
    expect(scripts.dev).toBe('node --env-file=.env dist/main.js');
    for (const [name, command] of Object.entries(scripts)) {
      if (name !== 'dev') expect(command, name).not.toContain('env-file');
    }
    for (const file of sourceFiles(join(root, 'src')).filter(file => !file.endsWith('.spec.ts'))) {
      expect(readFileSync(file, 'utf8'), relative(root, file)).not.toMatch(/loadEnvFile|dotenv|env-file|['"`]\.env['"`]/);
    }
  });

  it('lets a variable of the process environment prevail over the file', () => {
    const directory = mkdtempSync(join(tmpdir(), 'ambrogio-satellite-env-'));
    try {
      const file = join(directory, '.env');
      writeFileSync(file, 'AMBROGIO_BACKEND_URL=http://from-file.example.test\nAMBROGIO_CLIENT_NAME=from-file\n');
      const result = spawnSync(process.execPath, [`--env-file=${file}`, '-e',
        'console.log(JSON.stringify([process.env.AMBROGIO_BACKEND_URL, process.env.AMBROGIO_CLIENT_NAME]))'], {
        encoding: 'utf8',
        env: { PATH: process.env.PATH, AMBROGIO_BACKEND_URL: 'http://from-process.example.test' },
      });
      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual(['http://from-process.example.test', 'from-file']);
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });

  it('keeps the actual .env out of Git and of the image', () => {
    expect(text('.gitignore').split('\n')).toEqual(expect.arrayContaining(['.env', '.env.*', '!.env.example']));
    expect(text('.dockerignore').split('\n')).toEqual(expect.arrayContaining(['.env', '*.env', '*.env.*']));
  });
});

describe('Compose example', () => {
  it('sets only the values without a default and repeats no default', () => {
    const compose = text('compose.example.yaml');
    const assigned = [...compose.matchAll(/^\s+(AMBROGIO_[A-Z0-9_]+):\s*(.*)$/gm)].map(match => [match[1]!, match[2]!]);
    expect(assigned.map(([name]) => name).sort()).toEqual(['AMBROGIO_BACKEND_URL', 'AMBROGIO_ENV']);
    expect(Object.fromEntries(assigned).AMBROGIO_ENV).toBe('production');
    for (const name of defaultedVariables) expect(compose).not.toContain(name);
    expect(compose).not.toMatch(/:-/);
    expect(compose).not.toMatch(/\/config|--config|\.ts\b/);
  });

  // «Tempo massimo dell'arresto del processo»: Docker waits longer than the satellite's own 5000 ms limit.
  it('grants the container a stop grace period of at least 10 seconds', () => {
    const period = /^\s+stop_grace_period:\s*(\d+)s\s*$/m.exec(text('compose.example.yaml'));
    expect(period).not.toBeNull();
    expect(Number(period![1])).toBeGreaterThanOrEqual(10);
  });
});

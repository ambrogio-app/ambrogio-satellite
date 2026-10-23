import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadSatelliteConfig } from '../../../src/adapters/out/config-file.js';

const temporaryDirectories: string[] = [];
afterEach(async () => {
  vi.unstubAllEnvs();
  await Promise.all(temporaryDirectories.splice(0).map(directory =>
    rm(directory, { recursive: true, force: true })));
});

async function temporaryConfig(content: string): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'ambrogio-satellite-config-'));
  temporaryDirectories.push(directory);
  const filename = join(directory, 'satellite.ts');
  await writeFile(filename, `export default ${content};\n`);
  return filename;
}

describe('configuration file', () => {
  it('reads deployment values from the distributed TypeScript example', async () => {
    vi.stubEnv('AMBROGIO_BACKEND_URL', 'https://ambrogio.example.test');
    vi.stubEnv('AMBROGIO_CLIENT_ID', 'satellite-test');
    vi.stubEnv('AMBROGIO_WAKE_WORD_THRESHOLD', '0.7');
    const example = new URL('../../../config.example.ts', import.meta.url);
    const result = await loadSatelliteConfig(example.pathname, new Set(['hey_jarvis']));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.client.clientId).toBe('satellite-test');
      expect(result.value.wakeWord.threshold).toBe(0.7);
      expect(result.value.backend.sessionUrl.href).toBe('wss://ambrogio.example.test/api/session');
    }
  });
  it('loads a TypeScript configuration with system device defaults', async () => {
    const filename = await temporaryConfig('{"backend":{"baseUrl":"http://localhost:3000"}}');
    const result = await loadSatelliteConfig(filename, new Set(['hey_jarvis']));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.audio).toEqual({});
  });

  it('distinguishes missing and malformed files', async () => {
    const filename = await temporaryConfig('{');
    expect(await loadSatelliteConfig(filename, new Set(['hey_jarvis'])))
      .toEqual({ ok: false, error: { kind: 'invalid_configuration', field: 'config' } });
    expect(await loadSatelliteConfig(join(dirname(filename), 'missing.ts'), new Set(['hey_jarvis'])))
      .toEqual({ ok: false, error: { kind: 'configuration_unavailable' } });
  });
});

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadSatelliteConfig } from '../../../src/adapters/out/config-file.js';

const temporaryDirectories: string[] = [];
afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory =>
    rm(directory, { recursive: true, force: true })));
});

async function temporaryConfig(content: string): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'ambrogio-satellite-config-'));
  temporaryDirectories.push(directory);
  const filename = join(directory, 'satellite.json');
  await writeFile(filename, content);
  return filename;
}

describe('configuration file', () => {
  it('loads JSON with system device defaults', async () => {
    const filename = await temporaryConfig('{"backend":{"baseUrl":"http://localhost:3000"}}');
    const result = await loadSatelliteConfig(filename, new Set(['hey_jarvis']));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.audio).toEqual({});
  });

  it('distinguishes missing and malformed files', async () => {
    const filename = await temporaryConfig('{');
    expect(await loadSatelliteConfig(filename, new Set(['hey_jarvis'])))
      .toEqual({ ok: false, error: { kind: 'invalid_configuration', field: 'config' } });
    expect(await loadSatelliteConfig(`${filename}.missing`, new Set(['hey_jarvis'])))
      .toEqual({ ok: false, error: { kind: 'configuration_unavailable' } });
  });
});

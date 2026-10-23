import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { access } from 'node:fs/promises';
import { parseSatelliteConfig, type InvalidConfiguration, type SatelliteConfig } from './configuration.js';

export type ConfigurationUnavailable = Readonly<{ kind: 'configuration_unavailable' }>;
export type LoadConfigRejection = InvalidConfiguration | ConfigurationUnavailable;

let configRevision = 0;

/** Import the selected TypeScript module before constructing audio or network resources. */
export async function loadSatelliteConfig(filename: string, distributedModels: ReadonlySet<string>): Promise<
  Readonly<{ ok: true; value: SatelliteConfig }> | Readonly<{ ok: false; error: LoadConfigRejection }>
> {
  let document: unknown;
  if (!filename.endsWith('.ts')) {
    return { ok: false, error: { kind: 'invalid_configuration', field: 'config' } };
  }
  try { await access(filename); }
  catch { return { ok: false, error: { kind: 'configuration_unavailable' } }; }
  try { document = (await import(`${pathToFileURL(resolve(filename)).href}?revision=${++configRevision}`)).default; }
  catch { return { ok: false, error: { kind: 'invalid_configuration', field: 'config' } }; }
  return parseSatelliteConfig(document, distributedModels);
}

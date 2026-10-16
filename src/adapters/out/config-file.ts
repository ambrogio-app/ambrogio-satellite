import { readFile } from 'node:fs/promises';
import { parseSatelliteConfig, type InvalidConfiguration, type SatelliteConfig } from './configuration.js';

export type ConfigurationUnavailable = Readonly<{ kind: 'configuration_unavailable' }>;
export type LoadConfigRejection = InvalidConfiguration | ConfigurationUnavailable;

/** Read the selected JSON once, before constructing audio or network resources. */
export async function loadSatelliteConfig(filename: string, distributedModels: ReadonlySet<string>): Promise<
  Readonly<{ ok: true; value: SatelliteConfig }> | Readonly<{ ok: false; error: LoadConfigRejection }>
> {
  let content: string;
  try { content = await readFile(filename, 'utf8'); }
  catch { return { ok: false, error: { kind: 'configuration_unavailable' } }; }
  let document: unknown;
  try { document = JSON.parse(content); }
  catch { return { ok: false, error: { kind: 'invalid_configuration', field: 'config' } }; }
  return parseSatelliteConfig(document, distributedModels);
}

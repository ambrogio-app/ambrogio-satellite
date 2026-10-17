#!/usr/bin/env node
import { runSatelliteProcess } from './runtime/satellite-process.js';
import { parseConfigArguments } from './adapters/in/config-arguments.js';
import { loadSatelliteConfig } from './adapters/out/config-file.js';
import { availableWakeWordIds } from './adapters/out/wake-word-catalog.js';
import { diagnostics } from './adapters/out/diagnostics.js';

const args = parseConfigArguments(process.argv.slice(2));
if (!args.ok) {
  diagnostics.info('invalid_arguments');
  process.exitCode = 2;
} else {
  const config = await loadSatelliteConfig(args.value.filename, availableWakeWordIds());
  if (!config.ok) {
    switch (config.error.kind) {
      case 'invalid_configuration':
      case 'configuration_unavailable':
        diagnostics.configurationRejected(config.error);
        break;
      default:
        assertNever(config.error);
    }
    process.exitCode = 2;
  } else {
    // ONNX Runtime reads this before the first runtime import.
    process.env.ORT_DISABLE_TELEMETRY = '1';
    try {
      const { startSatellite } = await import('./composition/satellite.js');
      await runSatelliteProcess(async signal => {
        const satellite = await startSatellite(config.value, signal);
        if (!signal.aborted) diagnostics.info('satellite_ready');
        return satellite;
      });
    } catch (error) {
      diagnostics.failure('satellite_process_failed', error);
      process.exitCode = 1;
    }
  }
}

function assertNever(_value: never): never {
  throw new Error('Unexpected configuration rejection');
}

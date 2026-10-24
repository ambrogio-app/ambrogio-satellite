#!/usr/bin/env node
import { runSatelliteProcess } from './runtime/satellite-process.js';
import { parseStartupArguments } from './adapters/in/startup-arguments.js';
import { readSatelliteConfig } from './adapters/out/configuration.js';
import { availableWakeWordIds } from './adapters/out/wake-word-catalog.js';
import { diagnostics } from './adapters/out/diagnostics.js';

const args = parseStartupArguments(process.argv.slice(2));
if (!args.ok) {
  switch (args.error.kind) {
    case 'invalid_arguments':
      diagnostics.info('invalid_arguments');
      break;
    default:
      assertNever(args.error.kind);
  }
  process.exitCode = 2;
} else {
  // The configuration is read once, from the process environment, before any resource is built.
  const config = readSatelliteConfig(process.env, availableWakeWordIds());
  if (!config.ok) {
    switch (config.error.kind) {
      case 'invalid_configuration':
        diagnostics.configurationRejected(config.error);
        break;
      default:
        assertNever(config.error.kind);
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
      }, {
        reportShutdownTimeout: timeoutMs => diagnostics.shutdownTimeout(timeoutMs),
      });
    } catch (error) {
      diagnostics.failure('satellite_process_failed', error);
      process.exitCode = 1;
    }
  }
}

function assertNever(_value: never): never {
  throw new Error('Unexpected startup rejection');
}

#!/usr/bin/env node
import { runSatelliteProcess } from './runtime/satellite-process.js';
import { parseConfigArguments } from './adapters/in/config-arguments.js';
import { loadSatelliteConfig } from './adapters/out/config-file.js';
import { distributedWakeWordIds } from './adapters/out/wake-word-catalog.js';

const args = parseConfigArguments(process.argv.slice(2));
if (!args.ok) {
  console.log(JSON.stringify({ level: 'error', event: 'invalid_arguments', usage: '--config <file.json>' }));
  process.exitCode = 2;
} else {
  const config = await loadSatelliteConfig(args.value.filename, distributedWakeWordIds);
  if (!config.ok) {
    console.log(JSON.stringify({ level: 'error', event: config.error.kind,
      ...('field' in config.error ? { field: config.error.field } : {}) }));
    process.exitCode = 2;
  } else {
    // ONNX Runtime reads this before the first runtime import.
    process.env.ORT_DISABLE_TELEMETRY = '1';
    try {
      const { startSatellite } = await import('./composition/satellite.js');
      await runSatelliteProcess(async signal => {
        const satellite = await startSatellite(config.value, signal);
        if (!signal.aborted) console.log(JSON.stringify({ level: 'info', event: 'satellite_ready',
          wakeWord: config.value.wakeWord.model }));
        return satellite;
      });
    } catch (error) {
      const code = error instanceof Error ? error.name : 'Error';
      console.log(JSON.stringify({ level: 'error', event: 'satellite_process_failed', code }));
      process.exitCode = 1;
    }
  }
}

#!/usr/bin/env node
import { installFatalPath } from './runtime/fatal-path.js';

// The fatal path comes first: application code is loaded only afterwards, with dynamic imports.
installFatalPath('Ambrogio satellite stopped after a fatal error.');

const [{ createBaseLogger }, { createDiagnostics }, { parseStartupArguments }, { readSatelliteConfig },
  { installedWakeWordVocabulary }, { runSatelliteProcess }] = await Promise.all([
  import('./runtime/logger.js'), import('./adapters/out/diagnostics.js'), import('./adapters/in/startup-arguments.js'),
  import('./runtime/configuration.js'), import('./adapters/out/voice-models.js'),
  import('./runtime/satellite-process.js'),
]);

// The single base logger of the process, shared by every component through the composition root.
const diagnostics = createDiagnostics(createBaseLogger());

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
  const config = readSatelliteConfig(process.env, installedWakeWordVocabulary());
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
    const { createSatellite } = await import('./composition/satellite.js');
    const outcome = await runSatelliteProcess(signal => createSatellite(config.value, diagnostics, signal), {
      ready: () => diagnostics.info('satellite_ready'),
      startupFailed: error => diagnostics.startupFailed(error),
      shutdownFailed: error => diagnostics.failure('satellite_process_failed', error),
      shutdownTimeout: (timeoutMs, fault) => diagnostics.shutdownTimeout(timeoutMs, fault),
    });
    if (outcome.force) process.exit(outcome.exitCode);
    process.exitCode = outcome.exitCode;
  }
}

function assertNever(_value: never): never {
  throw new Error('Unexpected startup rejection');
}

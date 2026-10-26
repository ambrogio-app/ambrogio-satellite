import type { Logger } from '../../runtime/logger.js';
import type { InvalidConfiguration } from '../../runtime/configuration.js';

type FailureEvent = 'satellite_process_failed' | 'satellite_failure' | 'satellite_error_tone_failed'
  | 'satellite_ready_cue_failed';
type InfoEvent = 'invalid_arguments' | 'satellite_ready' | 'satellite_session_unavailable'
  | 'satellite_voice_unavailable';

/** Durations in milliseconds; `firstAudioMs` only when the reply contained audio. */
export type RequestTiming = Readonly<{ speechMs: number; firstAudioMs?: number; playedMs: number }>;

/** The `err` of a definitive log: the received Error itself, or a new Error whose cause is the value. */
export function normalizeDiagnosticError(value: unknown): Error {
  return value instanceof Error ? value : new Error('Unexpected satellite failure', { cause: value });
}

/** The diagnostic events of the satellite, emitted through the logger given by the composition root. */
export function createDiagnostics(log: Logger) {
  return {
    failure(event: FailureEvent, value: unknown): void {
      log.error({ event, err: normalizeDiagnosticError(value) }, 'Satellite operation failed');
    },
    /** The definitive log of a failed start; the process boundary also reports it on stderr. */
    startupFailed(value: unknown): void {
      log.error({ event: 'satellite_startup_failed', err: normalizeDiagnosticError(value) }, 'Satellite startup failed');
    },
    info(event: InfoEvent): void { log.info({ event }); },
    /** Only the operation and the selected reason: never device names or amixer output. */
    attenuationFailed(operation: 'attenuate' | 'restore', reason: 'exit_code' | 'timeout' | 'spawn_failed'): void {
      log.warn({ event: 'satellite_attenuation_failed', operation, reason });
    },
    /** The score of the confirming chunk and the consecutive chunks above the threshold. */
    wakeDetected(): void {
      log.info({ event: 'satellite_wake_detected' });
    },
    wakeRejected(): void {
      log.info({ event: 'satellite_wake_rejected' });
    },
    /** Only the durations of a request whose reply was played: never audio, texts or identifiers. */
    requestTiming(timing: RequestTiming): void {
      log.info({ event: 'satellite_request_timing', ...timing });
    },
    /**
     * The orderly shutdown did not finish in time; the process exits right after this line. `fault` is the
     * outcome of the closings already failed, if any.
     */
    shutdownTimeout(timeoutMs: number, fault?: unknown): void {
      log.error(fault === undefined ? { event: 'satellite_shutdown_timeout', timeoutMs }
        : { event: 'satellite_shutdown_timeout', timeoutMs, err: normalizeDiagnosticError(fault) });
    },
    /** Only the variable name and the violated condition: never values, host names or library messages. */
    configurationRejected(rejection: InvalidConfiguration): void {
      log.info({ event: 'invalid_configuration', variable: rejection.variable, condition: rejection.condition });
    },
  };
}

export type Diagnostics = ReturnType<typeof createDiagnostics>;

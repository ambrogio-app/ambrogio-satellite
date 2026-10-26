import { expect, test } from 'vitest';
import { createDiagnostics, normalizeDiagnosticError } from './diagnostics.js';

type Call = Readonly<{ level: string; fields: Record<string, unknown>; message?: string }>;

/** A structural logger recording the calls: the catalog receives the logger from the composition root. */
function capture() {
  const calls: Call[] = [];
  const record = (level: string) => (fields: Record<string, unknown>, message?: string) => {
    calls.push({ level, fields, ...(message === undefined ? {} : { message }) });
  };
  const logger = { debug: record('debug'), info: record('info'), warn: record('warn'), error: record('error'),
    child: () => logger };
  return { log: createDiagnostics(logger), calls };
}

test('a failure passes the original Error by identity, without mutating it or its cause', () => {
  const cause = Object.freeze(new Error('secret-cause'));
  const error = Object.freeze(new Error('secret-message', { cause }));
  const { log, calls } = capture();
  log.failure('satellite_failure', error);
  expect(calls).toEqual([{ level: 'error', fields: { event: 'satellite_failure', err: error },
    message: 'Satellite operation failed' }]);
  expect(calls[0]!.fields.err).toBe(error);
  expect(error.cause).toBe(cause);
});

test('a non-Error value is wrapped once, with the value as cause, without string conversion or getters', () => {
  const value = { toString() { throw new Error('must not run'); },
    get cause() { throw new Error('must not run'); } };
  expect(normalizeDiagnosticError(value).cause).toBe(value);
  const { log, calls } = capture();
  log.failure('satellite_process_failed', value);
  const err = calls[0]!.fields.err as Error;
  expect(err).toBeInstanceOf(Error);
  expect(err.message).toBe('Unexpected satellite failure');
  expect(err.cause).toBe(value);
});

test('a failed start is one error event with the startup message', () => {
  const failure = new Error('phase');
  const { log, calls } = capture();
  log.startupFailed(failure);
  expect(calls).toEqual([{ level: 'error', fields: { event: 'satellite_startup_failed', err: failure },
    message: 'Satellite startup failed' }]);
});

test('expected startup outcomes are informative and have no err or input data', () => {
  const { log, calls } = capture();
  log.info('invalid_arguments'); log.info('satellite_ready');
  expect(calls).toEqual([{ level: 'info', fields: { event: 'invalid_arguments' } },
    { level: 'info', fields: { event: 'satellite_ready' } }]);
});

type Rejection = Parameters<ReturnType<typeof createDiagnostics>['configurationRejected']>[0];

test.each([
  ['AMBROGIO_ENV', 'missing'],
  ['AMBROGIO_BACKEND_URL', 'invalid'],
  ['AMBROGIO_ATTENUATION_LEVEL', 'invalid'],
  ['AMBROGIO_WAKE_WORD', 'invalid'],
] as const)('a rejected configuration names only the variable and the condition: %s %s', (variable, condition) => {
  // The rejection carries an extra field with a value: the diagnostics select their fields explicitly.
  const rejection = { kind: 'invalid_configuration', variable, condition, value: 'secret-value' } as Rejection;
  const { log, calls } = capture();
  log.configurationRejected(rejection);
  expect(calls).toEqual([{ level: 'info', fields: { event: 'invalid_configuration', variable, condition } }]);
  expect(JSON.stringify(calls)).not.toContain('secret');
});

test('a confirmed and a rejected wake word detection log only their event', () => {
  const { log, calls } = capture();
  log.wakeDetected();
  log.wakeRejected();
  expect(calls).toEqual([{ level: 'info', fields: { event: 'satellite_wake_detected' } },
    { level: 'info', fields: { event: 'satellite_wake_rejected' } }]);
});

test('a shutdown timeout logs the deadline, and the faults already observed only when there are some', () => {
  const { log, calls } = capture();
  log.shutdownTimeout(5_000);
  const fault = new Error('close failed');
  log.shutdownTimeout(5_000, fault);
  expect(calls).toEqual([
    { level: 'error', fields: { event: 'satellite_shutdown_timeout', timeoutMs: 5_000 } },
    { level: 'error', fields: { event: 'satellite_shutdown_timeout', timeoutMs: 5_000, err: fault } },
  ]);
});

test('an attenuation failure logs only the operation and the reason', () => {
  const { log, calls } = capture();
  log.attenuationFailed('restore', 'timeout');
  expect(calls).toEqual([{ level: 'warn', fields: { event: 'satellite_attenuation_failed', operation: 'restore',
    reason: 'timeout' } }]);
});

// Verification: Prova dell'evento dei tempi della richiesta
test('the timing of a request is one info event with only its durations', () => {
  const { log, calls } = capture();
  log.requestTiming({ speechMs: 1_200, firstAudioMs: 2_900, playedMs: 4_100 });
  log.requestTiming({ speechMs: 800, playedMs: 1_000 });
  expect(calls).toEqual([
    { level: 'info', fields: { event: 'satellite_request_timing', speechMs: 1_200, firstAudioMs: 2_900, playedMs: 4_100 } },
    { level: 'info', fields: { event: 'satellite_request_timing', speechMs: 800, playedMs: 1_000 } },
  ]);
});

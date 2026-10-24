import { expect, test } from 'vitest';
import { readSatelliteConfig } from './configuration.js';
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

const valid = { AMBROGIO_ENV: 'production', AMBROGIO_BACKEND_URL: 'http://ambrogio.test:3000' };
const models = new Set(['hey_jarvis']);

function rejectionRecord(environment: Readonly<Record<string, string>>) {
  const loaded = readSatelliteConfig(environment, models, 'secret-host');
  if (loaded.ok || loaded.error.kind !== 'invalid_configuration') throw new Error('expected a rejected configuration');
  const { log, calls } = capture();
  log.configurationRejected(loaded.error);
  expect(calls).toHaveLength(1);
  expect(JSON.stringify(calls)).not.toContain('secret');
  return calls[0]!;
}

test.each([
  [{ AMBROGIO_BACKEND_URL: 'http://secret.test' }, 'AMBROGIO_ENV', 'missing'],
  [{ ...valid, AMBROGIO_ENV: 'secret' }, 'AMBROGIO_ENV', 'invalid'],
  [{ AMBROGIO_ENV: 'test' }, 'AMBROGIO_BACKEND_URL', 'missing'],
  [{ ...valid, AMBROGIO_BACKEND_URL: 'ftp://secret.test' }, 'AMBROGIO_BACKEND_URL', 'invalid'],
  [{ ...valid, AMBROGIO_CLIENT_ID: ' ' }, 'AMBROGIO_CLIENT_ID', 'invalid'],
  [{ ...valid, AMBROGIO_CLIENT_NAME: ' ' }, 'AMBROGIO_CLIENT_NAME', 'invalid'],
  [{ ...valid, AMBROGIO_MICROPHONE: ' secret' }, 'AMBROGIO_MICROPHONE', 'invalid'],
  [{ ...valid, AMBROGIO_SPEAKER: 'secret ' }, 'AMBROGIO_SPEAKER', 'invalid'],
  [{ ...valid, AMBROGIO_ATTENUATION_DEVICE: 'secret' }, 'AMBROGIO_ATTENUATION_CONTROL', 'missing'],
  [{ ...valid, AMBROGIO_ATTENUATION_DEVICE: 'secret', AMBROGIO_ATTENUATION_CONTROL: 'Music',
    AMBROGIO_ATTENUATION_LEVEL: '101' }, 'AMBROGIO_ATTENUATION_LEVEL', 'invalid'],
  [{ ...valid, AMBROGIO_WAKE_WORD_MODEL: 'secret_word' }, 'AMBROGIO_WAKE_WORD_MODEL', 'invalid'],
  [{ ...valid, AMBROGIO_WAKE_WORD_THRESHOLD: '2' }, 'AMBROGIO_WAKE_WORD_THRESHOLD', 'invalid'],
  [{ ...valid, AMBROGIO_WAKE_WORD_PATIENCE: '0' }, 'AMBROGIO_WAKE_WORD_PATIENCE', 'invalid'],
  [{ ...valid, AMBROGIO_REPLY_TIMEOUT_MS: '-1' }, 'AMBROGIO_REPLY_TIMEOUT_MS', 'invalid'],
])('a rejected configuration names only the variable and the condition: %j', (environment, variable, condition) => {
  const record = rejectionRecord(environment);
  expect(record).toEqual({ level: 'info', fields: { event: 'invalid_configuration', variable, condition } });
});

test('a wake word detection logs only its rounded score and consecutive chunks', () => {
  const { log, calls } = capture();
  log.wakeDetected(0.912345, 3);
  expect(calls).toEqual([{ level: 'info', fields: { event: 'satellite_wake_detected', score: 0.912, chunks: 3 } }]);
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

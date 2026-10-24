import { expect, test } from 'vitest';
import { readSatelliteConfig } from './configuration.js';
import { createDiagnostics, normalizeDiagnosticError } from './diagnostics.js';

function capture() {
  const lines: string[] = [];
  const log = createDiagnostics({ write(line: string) { lines.push(line); } });
  return { log, lines, records: () => lines.map(line => JSON.parse(line)) };
}

test('serializes real Pino JSON without exposing external error fields or mutating causes', () => {
  const cause = Object.freeze(Object.assign(new Error('secret-cause'), { name: 'secret-name', code: 'secret-code' }));
  const error = Object.freeze(Object.assign(new Error('secret-message', { cause }), {
    stack: 'secret-stack', audio: 'secret-audio', toJSON() { throw new Error('must not run'); },
  }));
  const { log, lines, records } = capture();
  log.failure('satellite_failure', error);
  expect(normalizeDiagnosticError(error)).toBe(error);
  expect(error.cause).toBe(cause);
  expect(error.stack).toBe('secret-stack');
  expect(lines).toHaveLength(1);
  expect(lines[0].trim().split('\n')).toHaveLength(1);
  expect(lines[0]).not.toContain('secret');
  expect(records()[0]).toMatchObject({ level: 'error', event: 'satellite_failure',
    err: { type: 'Error', stack: '[redacted]', cause: { type: 'Error', stack: '[redacted]' } } });
  expect(Object.keys(records()[0]).sort()).toEqual(['err', 'event', 'level', 'msg', 'time']);
});

test('preserves non-Error identity without string conversion or getter execution', () => {
  const value = { toString() { throw new Error('must not run'); },
    get cause() { throw new Error('must not run'); } };
  expect(normalizeDiagnosticError(value).cause).toBe(value);
  const { log, records } = capture();
  log.failure('satellite_process_failed', value);
  expect(records()[0].err.cause).toEqual({ type: 'Error', message: 'Unexpected satellite failure', stack: '[redacted]' });
});

test('bounds cyclic causes and aggregate fanout', () => {
  const cyclic = new Error('secret'); Object.defineProperty(cyclic, 'cause', { value: cyclic });
  const aggregate = new AggregateError(Array.from({ length: 100 }, () => cyclic), 'secret');
  const { log, lines, records } = capture();
  log.failure('satellite_process_failed', aggregate);
  expect(records()[0].err.errors).toHaveLength(10);
  expect(records()[0].err.truncated).toBe(true);
  expect(records()[0].err.errors[0].cause.truncated).toBe(true);
  expect(lines[0]).not.toContain('secret');
  expect(aggregate.errors).toHaveLength(100);
});

test('expected startup outcomes are informative and have no err or input data', () => {
  const { log, records } = capture();
  log.info('invalid_arguments'); log.info('satellite_ready');
  expect(records().map(row => row.event)).toEqual(['invalid_arguments', 'satellite_ready']);
  for (const record of records()) {
    expect(record.level).toBe('info');
    expect(Object.keys(record).sort()).toEqual(['event', 'level', 'time']);
  }
});

const valid = { AMBROGIO_ENV: 'production', AMBROGIO_BACKEND_URL: 'http://ambrogio.test:3000' };
const models = new Set(['hey_jarvis']);

function rejectionRecord(environment: Readonly<Record<string, string>>) {
  const loaded = readSatelliteConfig(environment, models, 'secret-host');
  if (loaded.ok || loaded.error.kind !== 'invalid_configuration') throw new Error('expected a rejected configuration');
  const { log, lines, records } = capture();
  log.configurationRejected(loaded.error);
  expect(lines).toHaveLength(1);
  expect(lines[0]).not.toContain('secret');
  return records()[0];
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
  expect(record).toEqual({ level: 'info', time: expect.any(Number), event: 'invalid_configuration', variable, condition });
});

test('a wake word detection logs only its rounded score and consecutive chunks', () => {
  const { log, lines, records } = capture();
  log.wakeDetected(0.912345, 3);
  expect(lines).toHaveLength(1);
  expect(records()[0]).toMatchObject({ level: 'info', event: 'satellite_wake_detected', score: 0.912, chunks: 3 });
  expect(Object.keys(records()[0]).sort()).toEqual(['chunks', 'event', 'level', 'score', 'time']);
});

test('a shutdown timeout logs one error line with the deadline only', () => {
  const { log, lines, records } = capture();
  log.shutdownTimeout(5_000);
  expect(lines).toHaveLength(1);
  expect(lines[0].trim().split('\n')).toHaveLength(1);
  expect(records()[0]).toMatchObject({ level: 'error', event: 'satellite_shutdown_timeout', timeoutMs: 5_000 });
  expect(Object.keys(records()[0]).sort()).toEqual(['event', 'level', 'time', 'timeoutMs']);
});

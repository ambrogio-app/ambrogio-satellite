import { expect, test } from 'vitest';
import { createDiagnostics, normalizeDiagnosticError } from '../../../src/adapters/out/diagnostics.js';

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
  log.info('invalid_arguments'); log.info('invalid_configuration'); log.info('satellite_ready');
  expect(records().map(row => row.event)).toEqual(['invalid_arguments', 'invalid_configuration', 'satellite_ready']);
  for (const record of records()) {
    expect(record.level).toBe('info');
    expect(Object.keys(record).sort()).toEqual(['event', 'level', 'time']);
  }
});

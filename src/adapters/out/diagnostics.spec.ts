import { expect, test } from 'vitest';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadSatelliteConfig } from './config-file.js';
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

const validConfig = { backend: { baseUrl: 'http://ambrogio.test:3000' } };
const models = new Set(['hey_jarvis']);

async function rejectionRecord(content?: string) {
  const directory = await mkdtemp(join(tmpdir(), 'satellite-config-'));
  const filename = join(directory, 'secret-path.ts');
  if (content !== undefined) await writeFile(filename, `export default ${content};\n`);
  const loaded = await loadSatelliteConfig(filename, models);
  if (loaded.ok) throw new Error('expected a rejected configuration');
  const { log, lines, records } = capture();
  log.configurationRejected(loaded.error);
  expect(lines).toHaveLength(1);
  expect(lines[0]).not.toContain('secret');
  return records()[0];
}

test('an unavailable configuration file is reported with its reason only', async () => {
  const record = await rejectionRecord();
  expect(record).toMatchObject({ level: 'info', event: 'invalid_configuration', reason: 'configuration_unavailable' });
  expect(Object.keys(record).sort()).toEqual(['event', 'level', 'reason', 'time']);
});

test.each([
  ['a module that cannot be imported', '{ secret', 'config'],
  ['an unknown section', JSON.stringify({ ...validConfig, secret: {} }), 'config'],
  ['backend.baseUrl', JSON.stringify({ backend: { baseUrl: 'ftp://secret.test' } }), 'backend.baseUrl'],
  ['client.id', JSON.stringify({ ...validConfig, client: { id: ' ' } }), 'client.id'],
  ['client.name', JSON.stringify({ ...validConfig, client: { name: '' } }), 'client.name'],
  ['audio.microphone', JSON.stringify({ ...validConfig, audio: { microphone: ' secret' } }), 'audio.microphone'],
  ['audio.speaker', JSON.stringify({ ...validConfig, audio: { speaker: '' } }), 'audio.speaker'],
  ['audio.attenuation', JSON.stringify({ ...validConfig, audio: { attenuation: { device: 'secret', control: 'Music', level: 101 } } }),
    'audio.attenuation'],
  ['wakeWord.model', JSON.stringify({ ...validConfig, wakeWord: { model: 'secret_word' } }), 'wakeWord.model'],
  ['wakeWord.threshold', JSON.stringify({ ...validConfig, wakeWord: { threshold: 2 } }), 'wakeWord.threshold'],
  ['wakeWord.patience', JSON.stringify({ ...validConfig, wakeWord: { patience: 0 } }), 'wakeWord.patience'],
  ['interaction.replyTimeoutMs', JSON.stringify({ ...validConfig, interaction: { replyTimeoutMs: -1 } }),
    'interaction.replyTimeoutMs'],
])('an invalid configuration names the rejected field: %s', async (_case, content, field) => {
  const record = await rejectionRecord(content);
  expect(record).toMatchObject({ level: 'info', event: 'invalid_configuration', reason: 'invalid_configuration', field });
  expect(Object.keys(record).sort()).toEqual(['event', 'field', 'level', 'reason', 'time']);
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

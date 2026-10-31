import { expect, test } from 'vitest';
import { createBaseLogger, errorView, redactSensitive } from './logger.js';
import { LifecycleError, ProjectError } from './project-error.js';

function capture() {
  const lines: string[] = [];
  const log = createBaseLogger({ write(line: string) { lines.push(line); } });
  return { log, lines, records: () => lines.map(line => JSON.parse(line) as Record<string, unknown>) };
}

test('emits one JSON line with a textual level, a timestamp and no pid or hostname', () => {
  const { log, lines, records } = capture();
  log.info({ event: 'satellite_ready' });
  log.debug({ event: 'below_the_level' });
  expect(lines).toHaveLength(1);
  expect(lines[0]!.trim().split('\n')).toHaveLength(1);
  expect(records()[0]).toEqual({ level: 'info', time: expect.any(Number), event: 'satellite_ready' });
});

test('a derived logger adds its fixed fields without changing the base or another derived logger', () => {
  const { log, records } = capture();
  const first = log.child({ component: 'first' });
  const second = log.child({ component: 'second', part: 1 });
  first.warn({ event: 'a' }, 'first');
  second.error({ event: 'b' });
  log.info({ event: 'c' });
  expect(records()).toEqual([
    { level: 'warn', time: expect.any(Number), component: 'first', event: 'a', msg: 'first' },
    { level: 'error', time: expect.any(Number), component: 'second', part: 1, event: 'b' },
    { level: 'info', time: expect.any(Number), event: 'c' },
  ]);
});

test('redacts sensitive fields at any depth, credential variable names included, without touching the originals', () => {
  const fields = { event: 'x', MISTRAL_API_KEY: 'secret-1', nested: { deeper: [{ token: 'secret-2', ok: 1 }],
    Authorization: 'secret-3', password: 'secret-4' }, apiKey: 'secret-5' };
  const original = structuredClone(fields);
  const { log, lines, records } = capture();
  log.info(fields);
  log.child({ HA_TOKEN: 'secret-6', cookie: { secret: 'secret-7' } }).info({ event: 'y' });
  expect(fields).toEqual(original);
  expect(lines.join('')).not.toContain('secret-');
  expect(records()[0]).toMatchObject({ MISTRAL_API_KEY: '[redacted]', apiKey: '[redacted]',
    nested: { deeper: [{ token: '[redacted]', ok: 1 }], Authorization: '[redacted]', password: '[redacted]' } });
  expect(records()[1]).toMatchObject({ HA_TOKEN: '[redacted]', cookie: '[redacted]', event: 'y' });
});

test('redaction gives errors their view, survives cycles and runs no getter', () => {
  const error = new Error('secret-kept');
  const cyclic: Record<string, unknown> = { err: error };
  cyclic.self = cyclic;
  Object.defineProperty(cyclic, 'trap', { enumerable: true, get() { throw new Error('must not run'); } });
  const copy = redactSensitive(cyclic);
  expect(copy === cyclic).toBe(false);
  expect(copy.err).toEqual({ type: 'Error', message: 'Unexpected satellite failure', stack: '[redacted]' });
  expect(cyclic.err).toBe(error);
  expect(copy.self === copy).toBe(true);
  expect(Object.keys(copy)).toEqual(['err', 'self']);
});

test('redacts the own fields of class instances, shared and circular references, without mutating them', () => {
  class Credentials {
    readonly user = 'someone';
    readonly password = 'secret-1';
    get token() { throw new Error('must not run'); }
    toJSON() { throw new Error('must not run'); }
  }
  const credentials = Object.freeze(new Credentials());
  const shared = { apiKey: 'secret-2', kept: 1 };
  const circular: Record<string, unknown> = { name: 'loop', secret: 'secret-3' };
  circular.again = circular;
  const fields = { event: 'x', account: credentials, first: shared, list: [shared, { nested: shared }], circular };
  const { log, lines, records } = capture();
  log.info(fields);
  log.child({ bound: credentials, also: [shared] }).info({ event: 'y' });
  expect(lines).toHaveLength(2);
  expect(lines.join('')).not.toContain('secret-');
  const [first, second] = records();
  expect(first).toMatchObject({ account: { user: 'someone', password: '[redacted]' },
    first: { apiKey: '[redacted]', kept: 1 },
    list: [{ apiKey: '[redacted]', kept: 1 }, { nested: { apiKey: '[redacted]', kept: 1 } }],
    circular: { name: 'loop', secret: '[redacted]' } });
  expect(second).toMatchObject({ bound: { user: 'someone', password: '[redacted]' },
    also: [{ apiKey: '[redacted]', kept: 1 }], event: 'y' });
  expect(credentials.password).toBe('secret-1');
  expect(shared).toEqual({ apiKey: 'secret-2', kept: 1 });
  expect(circular.secret).toBe('secret-3');
  expect(circular.again).toBe(circular);
});

test('every Error at any depth and key, in events and fixed fields, gets the controlled view', () => {
  const external = Object.freeze(Object.assign(new Error('secret-external'), { code: 'secret-code' }));
  const project = new ProjectError('Speaker could not be opened', { cause: external });
  const constant = { type: 'Error', message: 'Unexpected satellite failure', stack: '[redacted]' };
  const { log, lines, records } = capture();
  log.warn({ event: 'x', problem: external, nested: { deeper: [project, { reason: external }] } });
  log.child({ origin: external, context: { failure: project } }).info({ event: 'y' });
  log.child({ err: external }).info({ event: 'z' });
  expect(lines.join('')).not.toContain('secret');
  const projectView = { type: 'ProjectError', message: 'Speaker could not be opened', stack: project.stack };
  expect(records()[0]).toEqual({ level: 'warn', time: expect.any(Number), event: 'x', problem: constant,
    nested: { deeper: [projectView, { reason: constant }] } });
  expect(records()[1]).toEqual({ level: 'info', time: expect.any(Number), origin: constant,
    context: { failure: projectView }, event: 'y' });
  expect(records()[2]).toEqual({ level: 'info', time: expect.any(Number), err: constant, event: 'z' });
  expect(project.cause).toBe(external);
  expect(Object.keys(external)).toEqual(['code']);
});

test('an external AggregateError keeps the views of its errors in order, with a constant message', () => {
  const project = new ProjectError('Microphone could not be closed');
  const external = new Error('secret-inner');
  const aggregate = new AggregateError([project, external, 'secret-value'], 'secret-aggregate');
  const view = { type: 'AggregateError', message: 'Unexpected satellite failure', stack: '[redacted]', errors: [
    { type: 'ProjectError', message: 'Microphone could not be closed', stack: project.stack },
    { type: 'Error', message: 'Unexpected satellite failure', stack: '[redacted]' },
    { type: 'Error', message: 'Unexpected satellite failure', stack: '[redacted]' },
  ] };
  expect(errorView(aggregate)).toEqual(view);
  const { log, lines, records } = capture();
  log.error({ event: 'a', err: aggregate });
  log.error({ event: 'b', faults: { all: aggregate } });
  expect(lines.join('')).not.toContain('secret');
  expect(records()[0]!.err).toEqual(view);
  expect(records()[1]!.faults).toEqual({ all: view });
  expect(aggregate.errors).toEqual([project, external, 'secret-value']);
  // An aggregate that contains itself still produces a finite view.
  const looping = new AggregateError([], 'secret');
  (looping.errors as unknown[]).push(looping);
  expect(errorView(looping)).toEqual({ type: 'AggregateError', message: 'Unexpected satellite failure',
    stack: '[redacted]', errors: [{ type: 'Error', message: 'Unexpected satellite failure', stack: '[redacted]' }] });
});

test('serializes project errors with type, message and stack and every other value with a constant view', () => {
  const external = Object.freeze(Object.assign(new Error('secret-external'), { code: 'secret-code' }));
  const project = new ProjectError('Wake word model could not be loaded', { cause: external });
  const { log, lines, records } = capture();
  log.error({ event: 'p', err: project });
  log.error({ event: 'e', err: external });
  // Without a message Pino must not copy the error message into `msg`.
  log.error({ event: 'v', err: { toJSON() { throw new Error('must not run'); } } });
  expect(records()[0]!.err).toEqual({ type: 'ProjectError', message: 'Wake word model could not be loaded',
    stack: project.stack });
  const constant = { type: 'Error', message: 'Unexpected satellite failure', stack: '[redacted]' };
  expect(records()[1]!.err).toEqual(constant);
  expect(records()[2]!.err).toEqual(constant);
  expect(lines.join('')).not.toContain('secret');
  expect(records()[1]).not.toHaveProperty('msg');
  expect(project.cause).toBe(external);
  expect(Object.keys(external)).toEqual(['code']);
});

test('a lifecycle error lists the views of its faults in order', () => {
  const first = new ProjectError('Microphone could not be closed', { cause: new Error('secret') });
  const second = new Error('secret');
  const lifecycle = new LifecycleError('Satellite shutdown failed', [first, second]);
  expect(errorView(lifecycle)).toEqual({ type: 'LifecycleError', message: 'Satellite shutdown failed',
    stack: lifecycle.stack, faults: [
      { type: 'ProjectError', message: 'Microphone could not be closed', stack: first.stack },
      { type: 'Error', message: 'Unexpected satellite failure', stack: '[redacted]' },
    ] });
  expect(lifecycle.faults[1]).toBe(second);
});

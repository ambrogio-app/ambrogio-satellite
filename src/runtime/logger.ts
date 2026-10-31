import pino, { type DestinationStream, type Logger as PinoLogger } from 'pino';
import { LifecycleError, ProjectError } from './project-error.js';

export type LogFields = Readonly<Record<string, unknown>>;

/** The minimal logger the technical components receive; it does not expose the logging library. */
export interface Logger {
  debug(fields: LogFields, message?: string): void;
  info(fields: LogFields, message?: string): void;
  warn(fields: LogFields, message?: string): void;
  error(fields: LogFields, message?: string): void;
  /** A logger with these fixed fields; the logger it derives from is unchanged. */
  child(fields: LogFields): Logger;
}

const sensitiveName = /token|password|passwd|secret|authorization|cookie|credential|api[-_]?key/i;
const redacted = '[redacted]';
const unexpected = 'Unexpected satellite failure';

export type ErrorView = Readonly<{
  type: string;
  message: string;
  stack: string;
  faults?: readonly ErrorView[];
  errors?: readonly ErrorView[];
}>;

/** An own data property, read without running getters; `undefined` for accessors and missing properties. */
function ownValue(value: object, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor && 'value' in descriptor ? descriptor.value : undefined;
}

/**
 * The controlled view of `err`: only errors built by the satellite show their type, message and stack; an external
 * `AggregateError` keeps the views of the errors it collects. `pending` guards against errors that contain themselves.
 */
export function errorView(value: unknown, pending = new Set<unknown>()): ErrorView {
  const constant: ErrorView = { type: 'Error', message: unexpected, stack: redacted };
  if (pending.has(value)) return constant;
  pending.add(value);
  try {
    if (value instanceof ProjectError) {
      const view = { type: value.name, message: value.message, stack: value.stack ?? '' };
      return value instanceof LifecycleError
        ? { ...view, faults: value.faults.map(fault => errorView(fault, pending)) } : view;
    }
    if (value instanceof AggregateError) {
      const errors = ownValue(value, 'errors');
      return { type: 'AggregateError', message: unexpected, stack: redacted,
        errors: Array.isArray(errors) ? errors.map(error => errorView(error, pending)) : [] };
    }
    return constant;
  } finally {
    pending.delete(value);
  }
}

/** Objects that hold no named fields of their own and serialize safely as they are. */
function opaque(value: object): boolean {
  return value instanceof Date || ArrayBuffer.isView(value) || value instanceof ArrayBuffer;
}

/**
 * A copy of `value` where every field with a sensitive name holds `[redacted]` and every `Error` its controlled view.
 * Arrays, plain objects and the own enumerable data fields of class instances are copied at any depth, each object
 * once even when it is shared or circular; the originals are never modified and getters never run.
 */
export function redactSensitive<T>(value: T, seen = new WeakMap<object, unknown>()): T {
  if (typeof value !== 'object' || value === null) return value;
  const known = seen.get(value);
  if (known !== undefined) return known as T;
  if (value instanceof Error) {
    const view = errorView(value);
    seen.set(value, view);
    return view as T;
  }
  if (opaque(value)) return value;
  const copy: Record<string, unknown> | unknown[] = Array.isArray(value) ? [] : {};
  seen.set(value, copy);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string') continue;
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
    if (!('value' in descriptor) || !descriptor.enumerable) continue;
    (copy as Record<string, unknown>)[key] = sensitiveName.test(key) ? redacted
      : redactSensitive(descriptor.value, seen);
  }
  return copy as T;
}

/**
 * The fields of an event or the fixed fields of a derived logger, as they reach the line: redacted, with the
 * controlled view of every `Error`. `err` is left to its serializer, which gives the same view.
 */
function prepareFields(fields: LogFields): Record<string, unknown> {
  const seen = new WeakMap<object, unknown>();
  const prepared: Record<string, unknown> = {};
  for (const key of Object.keys(fields)) {
    const descriptor = Object.getOwnPropertyDescriptor(fields, key)!;
    if (!('value' in descriptor)) continue;
    prepared[key] = sensitiveName.test(key) ? redacted
      : key === 'err' ? descriptor.value : redactSensitive(descriptor.value, seen);
  }
  return prepared;
}

function wrap(logger: PinoLogger): Logger {
  const emit = (level: 'debug' | 'info' | 'warn' | 'error') => (fields: LogFields, message?: string) => {
    if (message === undefined) logger[level](fields);
    else logger[level](fields, message);
  };
  return {
    debug: emit('debug'), info: emit('info'), warn: emit('warn'), error: emit('error'),
    // Pino applies its bindings formatter only to the base logger: the fixed fields of a child are prepared here.
    child: fields => wrap(logger.child(prepareFields(fields))),
  };
}

/** The single base logger of the satellite process: one JSON line per event on stdout. */
export function createBaseLogger(destination: DestinationStream = process.stdout): Logger {
  return wrap(pino({
    base: null,
    level: 'info',
    // Pino copies `err.message` into `msg` when an event has no message; a key no event uses turns that off, so an
    // external message never reaches the line. The `err` serializer below still applies to `err`.
    errorKey: 'unusedErrorKey',
    formatters: { level: label => ({ level: label }), log: prepareFields },
    serializers: { err: (value: unknown) => errorView(value) },
  }, destination));
}

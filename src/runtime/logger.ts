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

function isPlain(value: object): boolean {
  if (Array.isArray(value)) return true;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/**
 * A copy of the plain objects and arrays of `value` where every field with a sensitive name holds `[redacted]`.
 * Errors and other objects are kept by identity; the originals are never modified and getters never run.
 */
export function redactSensitive<T>(value: T, seen = new WeakMap<object, unknown>()): T {
  if (typeof value !== 'object' || value === null || !isPlain(value)) return value;
  const known = seen.get(value);
  if (known !== undefined) return known as T;
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

export type ErrorView = Readonly<{ type: string; message: string; stack: string; faults?: readonly ErrorView[] }>;

/** The controlled view of `err`: only errors built by the satellite show their type, message and stack. */
export function errorView(value: unknown): ErrorView {
  if (!(value instanceof ProjectError)) {
    return { type: 'Error', message: 'Unexpected satellite failure', stack: redacted };
  }
  const view = { type: value.name, message: value.message, stack: value.stack ?? '' };
  return value instanceof LifecycleError ? { ...view, faults: value.faults.map(errorView) } : view;
}

function wrap(logger: PinoLogger): Logger {
  const emit = (level: 'debug' | 'info' | 'warn' | 'error') => (fields: LogFields, message?: string) => {
    if (message === undefined) logger[level](fields);
    else logger[level](fields, message);
  };
  return {
    debug: emit('debug'), info: emit('info'), warn: emit('warn'), error: emit('error'),
    child: fields => wrap(logger.child(redactSensitive(fields))),
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
    formatters: { level: label => ({ level: label }), log: fields => redactSensitive(fields) },
    serializers: { err: errorView },
  }, destination));
}

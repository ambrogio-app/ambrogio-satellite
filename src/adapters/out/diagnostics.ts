import pino, { type DestinationStream } from 'pino';
import type { LoadConfigRejection } from './config-file.js';

type FailureEvent = 'satellite_process_failed' | 'satellite_failure' | 'satellite_notice_failed'
  | 'satellite_ready_cue_failed';
type InfoEvent = 'invalid_arguments' | 'satellite_ready' | 'satellite_session_unavailable';
type ErrorView = Readonly<{
  type: 'Error'; message: string; stack: '[redacted]';
  cause?: ErrorView; errors?: readonly ErrorView[]; truncated?: true;
}>;

export function normalizeDiagnosticError(value: unknown): Error {
  return value instanceof Error ? value : new Error('Unexpected satellite failure', { cause: value });
}

/** Never read arbitrary messages, stacks, toJSON methods or property accessors. */
function errorView(value: unknown, depth = 0, seen = new Set<object>()): ErrorView {
  const base = { type: 'Error' as const, message: 'Unexpected satellite failure', stack: '[redacted]' as const };
  if (depth >= 5) return { ...base, truncated: true };
  if (typeof value !== 'object' || value === null) return base;
  if (seen.has(value)) return { ...base, truncated: true };
  seen.add(value);
  try {
    const cause = Object.getOwnPropertyDescriptor(value, 'cause');
    const errors = value instanceof AggregateError ? Object.getOwnPropertyDescriptor(value, 'errors') : undefined;
    const children: ErrorView[] = [];
    if (errors && 'value' in errors && Array.isArray(errors.value)) {
      for (let i = 0; i < Math.min(errors.value.length, 10); i++) {
        const child = Object.getOwnPropertyDescriptor(errors.value, String(i));
        children.push(errorView(child && 'value' in child ? child.value : undefined, depth + 1, seen));
      }
    }
    return { ...base,
      ...(cause && 'value' in cause ? { cause: errorView(cause.value, depth + 1, seen) } : {}),
      ...(errors && 'value' in errors && Array.isArray(errors.value)
        ? { errors: children, ...(errors.value.length > 10 ? { truncated: true as const } : {}) } : {}),
    };
  } catch { return base; } // Exotic thrown objects must not break failure handling.
}

export function createDiagnostics(destination: DestinationStream = process.stdout) {
  const logger = pino({ base: null, formatters: { level: label => ({ level: label }) },
    serializers: { err: value => errorView(value) } }, destination);
  return {
    failure(event: FailureEvent, value: unknown): void {
      logger.error({ event, err: normalizeDiagnosticError(value) }, 'Satellite operation failed');
    },
    info(event: InfoEvent): void { logger.info({ event }); },
    /** Only the rejection kind and the field name: never values, paths or library messages. */
    configurationRejected(rejection: LoadConfigRejection): void {
      logger.info(rejection.kind === 'invalid_configuration'
        ? { event: 'invalid_configuration', reason: rejection.kind, field: rejection.field }
        : { event: 'invalid_configuration', reason: rejection.kind });
    },
  };
}

export const diagnostics = createDiagnostics();

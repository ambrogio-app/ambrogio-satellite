import type { EventEmitter } from 'node:events';
import { combineFaults, faultOutcome } from './lifecycle.js';

/** What the construction returns: activation and the single closing, with the faults it has observed so far. */
export type BuiltSatellite = Readonly<{
  activate(): Promise<void>;
  close(): Promise<void>;
  readonly faults: readonly unknown[];
}>;

/** Single deferred execution that can be cancelled; it must never keep the process alive by itself. */
export type ShutdownTimer = (delayMs: number, callback: () => void) => Readonly<{ cancel(): void }>;

export type SatelliteProcessOptions = Readonly<{
  /** The satellite waits for the wake word. */
  ready(): void;
  /** The definitive log of a failed start, before the line on stderr. */
  startupFailed(error: unknown): void;
  /** The definitive log of a failed shutdown. */
  shutdownFailed(error: unknown): void;
  /** The definitive log of an expired shutdown, with the outcome of the faults already observed, if any. */
  shutdownTimeout(timeoutMs: number, fault: unknown): void;
  stderr?: (line: string) => void;
  signals?: Pick<EventEmitter, 'on' | 'off'>;
  timer?: ShutdownTimer;
}>;

/** The outcome of the process: `force` asks the entrypoint to exit without waiting for pending work. */
export type ProcessOutcome = Readonly<{ exitCode: number; force: boolean }>;

/** Upper bound for the orderly shutdown started by the first SIGINT or SIGTERM. */
export const SHUTDOWN_TIMEOUT_MS = 5_000;

export const unrefShutdownTimer: ShutdownTimer = (delayMs, callback) => {
  const handle = setTimeout(callback, delayMs);
  handle.unref();
  return { cancel: () => clearTimeout(handle) };
};

const isAbort = (error: unknown) => error instanceof DOMException && error.name === 'AbortError';

/**
 * Coordinates the satellite process from startup until all resources are released: construction, activation,
 * wait for SIGINT or SIGTERM, a single shutdown bounded by `SHUTDOWN_TIMEOUT_MS`. It never calls `process.exit`.
 */
export async function runSatelliteProcess(
  build: (signal: AbortSignal) => Promise<BuiltSatellite>,
  options: SatelliteProcessOptions,
): Promise<ProcessOutcome> {
  const { signals = process, timer = unrefShutdownTimer,
    stderr = line => { process.stderr.write(line); } } = options;
  const abort = new AbortController();
  let requestStop!: () => void;
  const requested = new Promise<void>(resolve => { requestStop = resolve; });
  let expire!: () => void;
  const expired = new Promise<'expired'>(resolve => { expire = () => resolve('expired'); });
  let deadline: Readonly<{ cancel(): void }> | undefined;
  const stop = () => {
    deadline ??= timer(SHUTDOWN_TIMEOUT_MS, expire);
    abort.abort();
    requestStop();
  };
  signals.on('SIGINT', stop);
  signals.on('SIGTERM', stop);
  const keepAlive = setInterval(() => {}, 60_000);
  let satellite: BuiltSatellite | undefined;
  /** Close the satellite within the deadline, if one is armed. */
  const closeBounded = async (): Promise<'closed' | 'expired'> => {
    const closing = satellite ? satellite.close().then(() => 'closed' as const) : Promise.resolve('closed' as const);
    return Promise.race([closing, expired]);
  };
  const timedOut = (): ProcessOutcome => {
    options.shutdownTimeout(SHUTDOWN_TIMEOUT_MS, faultOutcome('Satellite shutdown failed', satellite?.faults ?? []));
    return { exitCode: 1, force: true };
  };
  try {
    try {
      const starting = build(abort.signal);
      const built = await Promise.race([starting, expired]);
      if (built === 'expired') return timedOut();
      satellite = built;
      if (!abort.signal.aborted) {
        const activation = await Promise.race([built.activate().then(() => 'active' as const), expired]);
        if (activation === 'expired') return timedOut();
      }
    } catch (error) {
      if (satellite === undefined && abort.signal.aborted) {
        // A shutdown requested during construction: the construction has already released what it acquired.
        if (isAbort(error)) return { exitCode: 0, force: false };
        options.shutdownFailed(error);
        return { exitCode: 1, force: false };
      }
      if (!(abort.signal.aborted && isAbort(error))) {
        // A failed start: release what was acquired, keeping the startup failure first.
        let cleanup: readonly unknown[] = [];
        try { if ((await closeBounded()) === 'expired') return timedOut(); }
        catch { cleanup = satellite?.faults ?? []; }
        options.startupFailed(combineFaults('Satellite startup failed', error, cleanup));
        stderr('Unable to start Ambrogio satellite.\n');
        return { exitCode: 1, force: false };
      }
      // Interrupted during activation: an ordinary requested shutdown follows.
    }
    if (!abort.signal.aborted) options.ready();
    await requested;
    try {
      if ((await closeBounded()) === 'expired') return timedOut();
    } catch (error) {
      options.shutdownFailed(error);
      return { exitCode: 1, force: false };
    }
    return { exitCode: 0, force: false };
  } finally {
    deadline?.cancel();
    clearInterval(keepAlive);
    signals.off('SIGINT', stop);
    signals.off('SIGTERM', stop);
  }
}

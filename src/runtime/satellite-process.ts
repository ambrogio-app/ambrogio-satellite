import type { EventEmitter } from 'node:events';

type Satellite = Readonly<{ stop(): Promise<void> }>;

/** Single deferred execution that can be cancelled; it must never keep the process alive by itself. */
export type ShutdownTimer = (delayMs: number, callback: () => void) => Readonly<{ cancel(): void }>;

export type SatelliteProcessOptions = Readonly<{
  /** Records the diagnostic event before the forced exit. */
  reportShutdownTimeout(timeoutMs: number): void;
  signals?: Pick<EventEmitter, 'on' | 'off'>;
  timer?: ShutdownTimer;
  exit?: (code: number) => void;
}>;

/** Upper bound for the orderly shutdown started by the first SIGINT or SIGTERM. */
export const SHUTDOWN_TIMEOUT_MS = 5_000;

export const unrefShutdownTimer: ShutdownTimer = (delayMs, callback) => {
  const handle = setTimeout(callback, delayMs);
  handle.unref();
  return { cancel: () => clearTimeout(handle) };
};

/** Owns process signals from startup until all satellite resources are released. */
export async function runSatelliteProcess(
  start: (signal: AbortSignal) => Promise<Satellite>,
  options: SatelliteProcessOptions,
): Promise<void> {
  const { signals = process, timer = unrefShutdownTimer, exit = code => process.exit(code) } = options;
  const abort = new AbortController();
  let requestStop!: () => void;
  const requested = new Promise<void>(resolve => { requestStop = resolve; });
  let deadline: Readonly<{ cancel(): void }> | undefined;
  let finished = false;
  const stop = () => {
    if (!deadline && !finished) {
      deadline = timer(SHUTDOWN_TIMEOUT_MS, () => {
        if (finished) return;
        options.reportShutdownTimeout(SHUTDOWN_TIMEOUT_MS);
        exit(1);
      });
    }
    abort.abort();
    requestStop();
  };
  signals.on('SIGINT', stop);
  signals.on('SIGTERM', stop);
  const keepAlive = setInterval(() => {}, 60_000);
  try {
    let satellite: Satellite;
    try { satellite = await start(abort.signal); }
    catch (error) {
      if (abort.signal.aborted && error instanceof DOMException && error.name === 'AbortError') return;
      throw error;
    }
    await requested;
    await satellite.stop();
  } finally {
    finished = true;
    deadline?.cancel();
    clearInterval(keepAlive);
    signals.off('SIGINT', stop);
    signals.off('SIGTERM', stop);
  }
}

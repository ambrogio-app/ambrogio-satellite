import type { EventEmitter } from 'node:events';

type Satellite = Readonly<{ stop(): Promise<void> }>;

/** Owns process signals from startup until all satellite resources are released. */
export async function runSatelliteProcess(
  start: (signal: AbortSignal) => Promise<Satellite>,
  signals: Pick<EventEmitter, 'on' | 'off'> = process,
): Promise<void> {
  const abort = new AbortController();
  let requestStop!: () => void;
  const requested = new Promise<void>(resolve => { requestStop = resolve; });
  const stop = () => { abort.abort(); requestStop(); };
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
    clearInterval(keepAlive);
    signals.off('SIGINT', stop);
    signals.off('SIGTERM', stop);
  }
}

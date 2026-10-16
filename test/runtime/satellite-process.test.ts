import { EventEmitter } from 'node:events';
import { expect, test, vi } from 'vitest';
import { runSatelliteProcess } from '../../src/runtime/satellite-process.js';

for (const name of ['SIGINT', 'SIGTERM']) {
  test(`${name} interrupts startup and repeated signals share cleanup`, async () => {
    const signals = new EventEmitter();
    let ready!: (value: { stop(): Promise<void> }) => void;
    const stop = vi.fn(async () => {});
    let signal!: AbortSignal;
    const running = runSatelliteProcess(s => {
      signal = s;
      return new Promise(resolve => { ready = resolve; });
    }, signals);
    signals.emit(name); signals.emit(name);
    expect(signal.aborted).toBe(true);
    ready({ stop });
    await running;
    expect(stop).toHaveBeenCalledOnce();
    expect(signals.listenerCount(name)).toBe(0);
  });
}
test('reports cleanup failure to the process boundary and removes both signal handlers', async () => {
  const signals = new EventEmitter(); const failure = new Error('stop failed');
  const running = runSatelliteProcess(async () => ({ stop: async () => { throw failure; } }), signals);
  signals.emit('SIGTERM');
  await expect(running).rejects.toBe(failure);
  expect(signals.listenerCount('SIGINT')).toBe(0);
  expect(signals.listenerCount('SIGTERM')).toBe(0);
});

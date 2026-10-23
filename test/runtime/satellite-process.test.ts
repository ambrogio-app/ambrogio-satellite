import { EventEmitter } from 'node:events';
import { expect, test, vi } from 'vitest';
import { runSatelliteProcess, SHUTDOWN_TIMEOUT_MS, unrefShutdownTimer } from '../../src/runtime/satellite-process.js';

/** Deadlines advanced by the test instead of Node.js timers. */
function manualTimer() {
  const pending = new Set<{ delayMs: number; callback(): void }>();
  return {
    pending,
    timer: vi.fn((delayMs: number, callback: () => void) => {
      const entry = { delayMs, callback };
      pending.add(entry);
      return { cancel: () => { pending.delete(entry); } };
    }),
    expire() { for (const entry of [...pending]) { pending.delete(entry); entry.callback(); } },
  };
}

function processOptions(signals: EventEmitter, timer = manualTimer()) {
  return {
    timer,
    options: { signals, timer: timer.timer, reportShutdownTimeout: vi.fn(), exit: vi.fn() },
  };
}

const flush = () => new Promise(resolve => setImmediate(resolve));

for (const name of ['SIGINT', 'SIGTERM']) {
  test(`${name} interrupts startup and repeated signals share cleanup`, async () => {
    const signals = new EventEmitter();
    const { options, timer } = processOptions(signals);
    let ready!: (value: { stop(): Promise<void> }) => void;
    const stop = vi.fn(async () => {});
    let signal!: AbortSignal;
    const running = runSatelliteProcess(s => {
      signal = s;
      return new Promise(resolve => { ready = resolve; });
    }, options);
    signals.emit(name); signals.emit(name);
    expect(signal.aborted).toBe(true);
    ready({ stop });
    await running;
    expect(stop).toHaveBeenCalledOnce();
    expect(signals.listenerCount(name)).toBe(0);
    expect(timer.timer).toHaveBeenCalledOnce();
    expect(timer.pending.size).toBe(0);
    expect(options.reportShutdownTimeout).not.toHaveBeenCalled();
    expect(options.exit).not.toHaveBeenCalled();
  });

  test(`${name} forces exit 1 after ${SHUTDOWN_TIMEOUT_MS} ms when a close never returns`, async () => {
    const signals = new EventEmitter();
    const { options, timer } = processOptions(signals);
    // The close never returns on its own; it is released only to end the test.
    let release!: () => void;
    const stop = vi.fn(() => new Promise<void>(resolve => { release = resolve; }));
    const running = runSatelliteProcess(async () => ({ stop }), options);
    await flush();
    signals.emit(name);
    await flush();
    signals.emit(name);
    expect(stop).toHaveBeenCalledOnce();
    expect(timer.timer).toHaveBeenCalledOnce();
    expect(timer.timer).toHaveBeenCalledWith(5_000, expect.any(Function));
    expect(options.exit).not.toHaveBeenCalled();
    timer.expire();
    expect(options.reportShutdownTimeout).toHaveBeenCalledExactlyOnceWith(5_000);
    expect(options.exit).toHaveBeenCalledExactlyOnceWith(1);
    expect(options.reportShutdownTimeout.mock.invocationCallOrder[0])
      .toBeLessThan(options.exit.mock.invocationCallOrder[0]!);
    release();
    await running;
    expect(options.exit).toHaveBeenCalledOnce();
  });
}

test('the deadline also bounds a startup that never ends after the interruption', async () => {
  const signals = new EventEmitter();
  const { options, timer } = processOptions(signals);
  let abandon!: (error: unknown) => void;
  const running = runSatelliteProcess(() => new Promise((_resolve, reject) => { abandon = reject; }), options);
  signals.emit('SIGINT');
  timer.expire();
  expect(options.reportShutdownTimeout).toHaveBeenCalledExactlyOnceWith(5_000);
  expect(options.exit).toHaveBeenCalledExactlyOnceWith(1);
  abandon(new DOMException('aborted', 'AbortError'));
  await running;
});

test('no deadline is armed without a signal', async () => {
  const signals = new EventEmitter();
  const { options, timer } = processOptions(signals);
  const failure = new Error('start failed');
  await expect(runSatelliteProcess(async () => { throw failure; }, options)).rejects.toBe(failure);
  expect(timer.timer).not.toHaveBeenCalled();
});

test('reports cleanup failure to the process boundary and removes both signal handlers', async () => {
  const signals = new EventEmitter(); const failure = new Error('stop failed');
  const { options, timer } = processOptions(signals);
  const running = runSatelliteProcess(async () => ({ stop: async () => { throw failure; } }), options);
  signals.emit('SIGTERM');
  await expect(running).rejects.toBe(failure);
  expect(signals.listenerCount('SIGINT')).toBe(0);
  expect(signals.listenerCount('SIGTERM')).toBe(0);
  expect(timer.pending.size).toBe(0);
  expect(options.exit).not.toHaveBeenCalled();
});

test('the default shutdown timer runs once, can be cancelled and does not keep the event loop alive', async () => {
  const timeouts = () => process.getActiveResourcesInfo().filter(type => type === 'Timeout').length;
  const before = timeouts();
  const cancelled = vi.fn();
  const handle = unrefShutdownTimer(60_000, cancelled);
  expect(timeouts()).toBe(before);
  handle.cancel();
  handle.cancel();
  const fired = vi.fn();
  unrefShutdownTimer(1, fired);
  await vi.waitFor(() => expect(fired).toHaveBeenCalledOnce());
  expect(cancelled).not.toHaveBeenCalled();
});

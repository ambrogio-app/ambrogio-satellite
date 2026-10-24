import { EventEmitter } from 'node:events';
import { expect, test, vi } from 'vitest';
import { LifecycleError, ProjectError } from './project-error.js';
import { runSatelliteProcess, SHUTDOWN_TIMEOUT_MS, unrefShutdownTimer, type BuiltSatellite } from './satellite-process.js';

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

function processOptions(signals = new EventEmitter(), timer = manualTimer()) {
  return {
    signals, timer,
    options: { signals, timer: timer.timer, ready: vi.fn(), startupFailed: vi.fn(), shutdownFailed: vi.fn(),
      shutdownTimeout: vi.fn(), stderr: vi.fn() },
  };
}

function satellite(overrides: Partial<{ activate(): Promise<void>; close(): Promise<void>; faults: unknown[] }> = {}) {
  const value = { faults: overrides.faults ?? [], activate: vi.fn(overrides.activate ?? (async () => {})),
    close: vi.fn(overrides.close ?? (async () => {})) } satisfies BuiltSatellite;
  return value;
}

const flush = () => new Promise(resolve => setImmediate(resolve));

test('builds, then activates, reports ready only after activation and exits with 0 after a clean shutdown', async () => {
  const { signals, options } = processOptions();
  const built = satellite();
  const running = runSatelliteProcess(async () => built, options);
  await flush();
  expect(built.activate).toHaveBeenCalledOnce();
  expect(options.ready).toHaveBeenCalledOnce();
  expect(built.activate.mock.invocationCallOrder[0]).toBeLessThan(options.ready.mock.invocationCallOrder[0]!);
  expect(built.close).not.toHaveBeenCalled();
  signals.emit('SIGTERM');
  expect(await running).toEqual({ exitCode: 0, force: false });
  expect(built.close).toHaveBeenCalledOnce();
  expect(options.shutdownFailed).not.toHaveBeenCalled();
});

for (const name of ['SIGINT', 'SIGTERM']) {
  test(`${name} during construction skips activation, and repeated signals share one shutdown`, async () => {
    const { signals, options, timer } = processOptions();
    let ready!: (value: BuiltSatellite) => void;
    let signal!: AbortSignal;
    const running = runSatelliteProcess(s => {
      signal = s;
      return new Promise(resolve => { ready = resolve; });
    }, options);
    signals.emit(name); signals.emit(name);
    expect(signal.aborted).toBe(true);
    const built = satellite();
    ready(built);
    expect(await running).toEqual({ exitCode: 0, force: false });
    expect(built.activate).not.toHaveBeenCalled();
    expect(built.close).toHaveBeenCalledOnce();
    expect(options.ready).not.toHaveBeenCalled();
    expect(signals.listenerCount(name)).toBe(0);
    expect(timer.timer).toHaveBeenCalledOnce();
    expect(timer.pending.size).toBe(0);
  });

  test(`${name} forces exit 1 after ${SHUTDOWN_TIMEOUT_MS} ms with the faults already observed`, async () => {
    const { signals, options, timer } = processOptions();
    const observed = new ProjectError('Microphone could not be closed');
    const built = satellite({ close: vi.fn(() => new Promise<void>(() => { /* never returns */ })), faults: [observed] });
    const running = runSatelliteProcess(async () => built, options);
    await flush();
    signals.emit(name);
    await flush();
    signals.emit(name);
    expect(built.close).toHaveBeenCalledOnce();
    expect(timer.timer).toHaveBeenCalledExactlyOnceWith(5_000, expect.any(Function));
    timer.expire();
    expect(await running).toEqual({ exitCode: 1, force: true });
    expect(options.shutdownTimeout).toHaveBeenCalledExactlyOnceWith(5_000, observed);
    expect(options.shutdownFailed).not.toHaveBeenCalled();
  });
}

test('the timeout reports several observed faults as one LifecycleError, and none when there is none', async () => {
  for (const faults of [[], [new Error('a'), new Error('b')]]) {
    const { signals, options, timer } = processOptions();
    const running = runSatelliteProcess(async () => satellite({ close: () => new Promise<void>(() => {}), faults }), options);
    await flush();
    signals.emit('SIGTERM');
    timer.expire();
    await running;
    const fault = options.shutdownTimeout.mock.calls[0]![1];
    if (faults.length === 0) expect(fault).toBeUndefined();
    else expect((fault as LifecycleError).faults).toEqual(faults);
  }
});

test('the deadline also bounds a construction that never ends after the interruption', async () => {
  const { signals, options, timer } = processOptions();
  const running = runSatelliteProcess(() => new Promise(() => { /* never */ }), options);
  signals.emit('SIGINT');
  timer.expire();
  expect(await running).toEqual({ exitCode: 1, force: true });
  expect(options.shutdownTimeout).toHaveBeenCalledExactlyOnceWith(5_000, undefined);
});

test('a failed construction is one startup event, one stderr line and exit 1, with no deadline', async () => {
  const { options, timer } = processOptions();
  const failure = new ProjectError('Wake word model could not be loaded');
  expect(await runSatelliteProcess(async () => { throw failure; }, options)).toEqual({ exitCode: 1, force: false });
  expect(options.startupFailed).toHaveBeenCalledExactlyOnceWith(failure);
  expect(options.stderr).toHaveBeenCalledExactlyOnceWith('Unable to start Ambrogio satellite.\n');
  expect(options.ready).not.toHaveBeenCalled();
  expect(timer.timer).not.toHaveBeenCalled();
});

test('a failed activation releases the resources and keeps the startup failure before the cleanup faults', async () => {
  const { options } = processOptions();
  const startup = new ProjectError('Microphone could not be started');
  const cleanup = new ProjectError('Wake word model could not be closed');
  const built = satellite({ activate: vi.fn(async () => { throw startup; }),
    close: vi.fn(async () => { throw cleanup; }), faults: [cleanup] });
  expect(await runSatelliteProcess(async () => built, options)).toEqual({ exitCode: 1, force: false });
  expect(built.close).toHaveBeenCalledOnce();
  const reported = options.startupFailed.mock.calls[0]![0] as LifecycleError;
  expect(reported).toBeInstanceOf(LifecycleError);
  expect(reported.message).toBe('Satellite startup failed');
  expect(reported.faults).toEqual([startup, cleanup]);
  expect(reported.faults[0]).toBe(startup);
  expect(options.ready).not.toHaveBeenCalled();
});

test('a failed shutdown is reported once and exits with 1, removing both signal handlers', async () => {
  const { signals, options, timer } = processOptions();
  const failure = new ProjectError('Microphone could not be closed');
  const running = runSatelliteProcess(async () => satellite({ close: async () => { throw failure; } }), options);
  await flush();
  signals.emit('SIGTERM');
  expect(await running).toEqual({ exitCode: 1, force: false });
  expect(options.shutdownFailed).toHaveBeenCalledExactlyOnceWith(failure);
  expect(signals.listenerCount('SIGINT')).toBe(0);
  expect(signals.listenerCount('SIGTERM')).toBe(0);
  expect(timer.pending.size).toBe(0);
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

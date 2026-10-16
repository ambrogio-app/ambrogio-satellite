import { expect, test, vi } from 'vitest';
import { NodeDeadlineScheduler } from '../../../src/adapters/out/node-deadline-scheduler.adapter.js';

test('runs once asynchronously and permits cancellation after execution', async () => {
  const scheduler = new NodeDeadlineScheduler();
  const callback = vi.fn();
  let finish!: () => void;
  const fired = new Promise<void>(resolve => { finish = resolve; });
  const deadline = scheduler.schedule(10, () => { callback(); finish(); });
  expect(callback).not.toHaveBeenCalled();
  await fired;
  deadline.cancel(); deadline.cancel();
  await new Promise<void>(resolve => scheduler.schedule(10, resolve));
  expect(callback).toHaveBeenCalledOnce();
});
test('cancels a deadline repeatedly without affecting other registrations', async () => {
  const scheduler = new NodeDeadlineScheduler();
  const cancelled = vi.fn();
  const deadline = scheduler.schedule(10, cancelled);
  deadline.cancel(); deadline.cancel();
  await new Promise<void>(resolve => scheduler.schedule(20, resolve));
  expect(cancelled).not.toHaveBeenCalled();
});
test('zero delay remains asynchronous', async () => {
  const callback = vi.fn();
  let finish!: () => void;
  const fired = new Promise<void>(resolve => { finish = resolve; });
  new NodeDeadlineScheduler().schedule(0, () => { callback(); finish(); });
  expect(callback).not.toHaveBeenCalled();
  await fired; expect(callback).toHaveBeenCalledOnce();
});

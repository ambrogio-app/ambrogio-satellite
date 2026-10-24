import { expect, test } from 'vitest';
import { combineFaults, createResourceStack } from './lifecycle.js';
import { LifecycleError, ProjectError } from './project-error.js';

test('closes every resource once, in reverse order of acquisition, and shares repeated closings', async () => {
  const order: string[] = [];
  const stack = createResourceStack();
  for (const name of ['wake', 'vad', 'call', 'session', 'microphone']) stack.defer(`${name} failed`, () => { order.push(name); });
  const first = stack.close(); const second = stack.close();
  expect(first).toBe(second);
  await first;
  expect(order).toEqual(['microphone', 'session', 'call', 'vad', 'wake']);
  expect(stack.faults).toEqual([]);
});

test('attempts the other closings when one fails and keeps the original as cause', async () => {
  const original = new Error('release failed');
  const order: string[] = [];
  const stack = createResourceStack();
  stack.defer('Wake word model could not be closed', () => { order.push('wake'); });
  stack.defer('Microphone could not be closed', async () => { order.push('microphone'); throw original; });
  const failure = await stack.close().catch((error: unknown) => error);
  expect(order).toEqual(['microphone', 'wake']);
  expect(failure).toBeInstanceOf(ProjectError);
  expect(failure).toMatchObject({ message: 'Microphone could not be closed', cause: original });
  expect(stack.faults).toEqual([failure]);
});

test('keeps several faults distinct in a LifecycleError in the order observed', async () => {
  const a = new Error('a'); const b = new Error('b');
  const stack = createResourceStack('Satellite shutdown failed');
  stack.defer('first', () => { throw a; });
  stack.defer('second', () => { throw b; });
  const failure = await stack.close().catch((error: unknown) => error) as LifecycleError;
  expect(failure).toBeInstanceOf(LifecycleError);
  expect(failure.message).toBe('Satellite shutdown failed');
  expect(failure.faults.map(fault => (fault as Error).cause)).toEqual([b, a]);
  expect((failure.faults[0] as Error).cause).not.toBe(failure.faults[1]);
});

test('exposes the faults observed while a closing is still pending', async () => {
  let release!: () => void;
  const stack = createResourceStack();
  stack.defer('never', () => new Promise<void>(resolve => { release = resolve; }));
  stack.defer('failed', () => { throw new Error('x'); });
  const closing = stack.close();
  await new Promise(resolve => setImmediate(resolve));
  expect(stack.faults).toHaveLength(1);
  release();
  await expect(closing).rejects.toBeInstanceOf(ProjectError);
});

test('a startup failure stays first and unchanged without cleanup faults', () => {
  const startup = new Error('startup');
  const cleanup = new Error('cleanup');
  expect(combineFaults('Satellite startup failed', startup, [])).toBe(startup);
  const combined = combineFaults('Satellite startup failed', startup, [cleanup]) as LifecycleError;
  expect(combined.faults).toEqual([startup, cleanup]);
  expect(combined.faults[0]).toBe(startup);
  expect(startup.cause).toBeUndefined();
});

import { expect, test, vi } from 'vitest';
import { MicdropClient, Speaker } from '@micdrop/client';

test('ignores a late close from a socket that is no longer current', async () => {
  const client = new MicdropClient();
  const stop = vi.fn(async () => {});
  const state = client as unknown as {
    ws?: { readyState: number; close(): void };
    stop: typeof stop;
    stopWS(): void;
    onWSClose(event: { target: object; code: number }): void;
    onSpeakerStartPlaying(): void;
    onSpeakerStopPlaying(): void;
  };
  state.stop = stop;
  const oldSocket = { readyState: 1, close() {
    queueMicrotask(() => state.onWSClose({ target: oldSocket, code: 1000 }));
  } };
  const currentSocket = { readyState: 1, close() {} };
  try {
    state.ws = oldSocket;
    state.stopWS();
    state.ws = currentSocket;
    await Promise.resolve();
    expect(stop).not.toHaveBeenCalled();

    state.onWSClose({ target: currentSocket, code: 1000 });
    expect(stop).toHaveBeenCalledOnce();
  } finally {
    Speaker.off('StartPlaying', state.onSpeakerStartPlaying);
    Speaker.off('StopPlaying', state.onSpeakerStopPlaying);
  }
});

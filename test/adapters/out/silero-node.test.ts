import { EventEmitter } from 'node:events';
import { describe, expect, it } from 'vitest';

describe('Silero Node loader', () => {
  it('loads the bundled Decibri model into Micdrop', async () => {
    process.env.ORT_DISABLE_TELEMETRY = '1';
    const [{ installNodeSilero }, { SileroVAD }] = await Promise.all([
      import('../../../src/adapters/out/silero-node.js'),
      import('@micdrop/client'),
    ]);
    installNodeSilero();
    const vad = new SileroVAD();
    const microphone = new EventEmitter();
    await vad.start(microphone as unknown as Parameters<typeof vad.start>[0]);
    expect(vad.isStarted).toBe(true);
    await vad.stop();
  });
});

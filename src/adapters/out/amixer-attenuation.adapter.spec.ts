import { describe, expect, it, vi } from 'vitest';
import { AmixerAttenuation, type AmixerOutcome, type AmixerRunner } from './amixer-attenuation.adapter.js';

const settings = { device: 'hw:CARD=Example', control: 'Music', level: 25 };

function adapter(outcome: AmixerOutcome | (() => Promise<AmixerOutcome>)) {
  const run = vi.fn<AmixerRunner>(typeof outcome === 'function' ? outcome : async () => outcome);
  const failed = vi.fn();
  return { run, failed, attenuation: new AmixerAttenuation(settings, failed, run) };
}

describe('amixer attenuation adapter', () => {
  it('sets the configured level and the full level on the configured control, with a 2 s limit', async () => {
    const { run, failed, attenuation } = adapter({ kind: 'applied' });
    await attenuation.attenuate();
    await attenuation.restore();
    expect(run.mock.calls).toEqual([
      [['-D', 'hw:CARD=Example', '-q', 'sset', 'Music', '25%'], 2_000],
      [['-D', 'hw:CARD=Example', '-q', 'sset', 'Music', '100%'], 2_000],
    ]);
    expect(failed).not.toHaveBeenCalled();
  });

  it('treats a control that does not exist yet as nothing to attenuate', async () => {
    const { failed, attenuation } = adapter({ kind: 'missing_control' });
    await attenuation.attenuate();
    await attenuation.restore();
    expect(failed).not.toHaveBeenCalled();
  });

  it.each(['exit_code', 'timeout', 'spawn_failed'] as const)('reports %s without rejecting', async reason => {
    const { failed, attenuation } = adapter({ kind: 'failed', reason });
    await expect(attenuation.attenuate()).resolves.toBeUndefined();
    await expect(attenuation.restore()).resolves.toBeUndefined();
    expect(failed.mock.calls).toEqual([['attenuate', reason], ['restore', reason]]);
  });

  it('reports a runner that throws as a spawn failure', async () => {
    const { failed, attenuation } = adapter(async () => { throw new Error('unexpected'); });
    await expect(attenuation.attenuate()).resolves.toBeUndefined();
    expect(failed).toHaveBeenCalledExactlyOnceWith('attenuate', 'spawn_failed');
  });
});

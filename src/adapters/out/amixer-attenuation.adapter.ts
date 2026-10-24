import { execFile } from 'node:child_process';
import type { LocalAttenuation } from '../../application/local-attenuation.port.js';

const AMIXER_TIMEOUT_MS = 2_000;
const FULL_LEVEL = 100;

export type AttenuationSettings = Readonly<{ device: string; control: string; level: number }>;
export type AttenuationOperation = 'attenuate' | 'restore';
export type AttenuationFailureReason = 'exit_code' | 'timeout' | 'spawn_failed';

/** Outcome of one amixer run; the missing control is an expected case, not a failure. */
export type AmixerOutcome =
  | Readonly<{ kind: 'applied' }>
  | Readonly<{ kind: 'missing_control' }>
  | Readonly<{ kind: 'failed'; reason: AttenuationFailureReason }>;

export type AmixerRunner = (args: readonly string[], timeoutMs: number) => Promise<AmixerOutcome>;

/** Runs `amixer` directly, without a shell, and classifies its exit. */
export const runAmixer: AmixerRunner = (args, timeoutMs) => new Promise(resolve => {
  execFile('amixer', [...args], { timeout: timeoutMs, encoding: 'utf8' }, (error, _stdout, stderr) => {
    if (!error) { resolve({ kind: 'applied' }); return; }
    if (error.killed || error.signal) { resolve({ kind: 'failed', reason: 'timeout' }); return; }
    if (typeof error.code === 'string') { resolve({ kind: 'failed', reason: 'spawn_failed' }); return; }
    // ALSA creates a softvol control the first time its device is opened.
    if (stderr.includes('Unable to find simple control')) { resolve({ kind: 'missing_control' }); return; }
    resolve({ kind: 'failed', reason: 'exit_code' });
  });
});

/** Lowers and restores one ALSA control with amixer; reports failures and never rejects. */
export class AmixerAttenuation implements LocalAttenuation {
  constructor(
    private readonly settings: AttenuationSettings,
    private readonly failed: (operation: AttenuationOperation, reason: AttenuationFailureReason) => void,
    private readonly run: AmixerRunner = runAmixer,
  ) {}

  attenuate(): Promise<void> { return this.set('attenuate', this.settings.level); }

  restore(): Promise<void> { return this.set('restore', FULL_LEVEL); }

  private async set(operation: AttenuationOperation, level: number): Promise<void> {
    let outcome: AmixerOutcome;
    try {
      outcome = await this.run(['-D', this.settings.device, '-q', 'sset', this.settings.control, `${level}%`],
        AMIXER_TIMEOUT_MS);
    } catch { outcome = { kind: 'failed', reason: 'spawn_failed' }; }
    if (outcome.kind === 'failed') this.failed(operation, outcome.reason);
  }
}

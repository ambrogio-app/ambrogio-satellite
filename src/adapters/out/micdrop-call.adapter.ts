import { Micdrop, SileroVAD } from '@micdrop/client';
import type { VoiceSessionPorts } from '../../application/voice-session.use-case.js';
import { playPcm16 } from './decibri-audio.js';
import { logFailure } from './local-notice.js';

/** Implements the session's outbound call, speech and failure-notice ports. */
export function createMicdropCallAdapter(options: Readonly<{
  voiceUrl: string;
  speaker?: string;
  audioReserveMs: number;
  notice: Int16Array;
  playback: Readonly<{ cancel(): void }>;
  wake: Readonly<{ waitUntilIdle(): Promise<void>; reset(): void }>;
  isStopping(): boolean;
}>): VoiceSessionPorts & Readonly<{ startListening(): Promise<void> }> {
  const { playback, wake, notice } = options;

  async function startListening(): Promise<void> {
    await Micdrop.startMic({ vad: 'silero' });
    if (!(Micdrop.vad instanceof SileroVAD)) throw new Error('Silero VAD was not installed');
    Micdrop.vad.delay = options.audioReserveMs;
    Micdrop.vad.setOptions({ redemptionFrames: 20 });
    Micdrop.mute();
  }

  return {
    startListening,
    async openCall() {
      await Micdrop.start({
        url: options.voiceUrl,
        disableInterruption: true,
        reconnect: { maxAttempts: 0, connectionTimeout: 5_000 },
      });
    },
    async closeCall() {
      playback.cancel();
      await Micdrop.stop();
      if (options.isStopping()) return;
      await startListening();
      await wake.waitUntilIdle();
      wake.reset();
    },
    setSpeechEnabled(enabled) {
      if (enabled) Micdrop.unmute();
      else Micdrop.mute();
    },
    async reportFailure(error) {
      logFailure(error);
      try { await playPcm16((async function* () { yield notice; })(), options.speaker); }
      catch (playbackError) {
        logFailure(playbackError instanceof Error ? playbackError : new Error(String(playbackError)));
      }
    },
  };
}

import { Micdrop, SileroVAD } from '@micdrop/client';
import type { VoiceSessionPorts } from '../../application/voice-session.use-case.js';
import { playPcm16 } from './decibri-audio.js';
import { diagnostics } from './diagnostics.js';

/** Implements the session's outbound call, speech and failure-notice ports. */
export function createMicdropCallAdapter(options: Readonly<{
  voiceUrl: string;
  speaker?: string;
  audioReserveMs: number;
  notice: Int16Array;
  playback: Readonly<{ cancel(): void }>;
  wake: Readonly<{ waitUntilIdle(): Promise<void>; reset(): void }>;
  isStopping(): boolean;
}>): VoiceSessionPorts & Readonly<{ startListening(): Promise<void>; shutdown(): Promise<void> }> {
  const { playback, wake, notice } = options;

  const noticeAbort = new AbortController();
  let shutdownPromise: Promise<void> | undefined;
  let listening: Promise<void> | undefined;
  let openingCall: Promise<void> | undefined;
  let noticeWork: Promise<void> | undefined;
  const noticeErrors: unknown[] = [];
  function shutdown(): Promise<void> {
    if (shutdownPromise) return shutdownPromise;
    noticeAbort.abort();
    shutdownPromise = (async () => {
      const pending = [listening, openingCall].filter((value): value is Promise<void> => value !== undefined);
      const errors: unknown[] = [];
      try { await Micdrop.stop(); } catch (error) { errors.push(error); }
      if (pending.length) {
        const results = await Promise.allSettled(pending);
        errors.push(...results.filter(r => r.status === 'rejected').map(r => r.reason));
        try { await Micdrop.stop(); } catch (error) { errors.push(error); }
      }
      if (noticeWork) await noticeWork;
      errors.push(...noticeErrors);
      if (errors.length) throw new AggregateError(errors, 'Micdrop shutdown failed');
    })();
    return shutdownPromise;
  }
  function startListening(): Promise<void> {
    if (options.isStopping()) return Promise.resolve();
    const pending = listen();
    listening = pending;
    return pending.finally(() => { if (listening === pending) listening = undefined; });
  }
  async function listen(): Promise<void> {
    await Micdrop.startMic({ vad: 'silero' });
    if (!(Micdrop.vad instanceof SileroVAD)) throw new Error('Silero VAD was not installed');
    Micdrop.vad.delay = options.audioReserveMs;
    Micdrop.vad.setOptions({ redemptionFrames: 20 });
    Micdrop.mute();
  }

  return {
    startListening,
    shutdown,
    async openCall() {
      if (options.isStopping()) return;
      const work = Micdrop.start({
        url: options.voiceUrl,
        disableInterruption: true,
        reconnect: { maxAttempts: 0, connectionTimeout: 5_000 },
      });
      openingCall = work;
      try { await work; } finally { if (openingCall === work) openingCall = undefined; }
    },
    async closeCall() {
      playback.cancel();
      if (options.isStopping()) return shutdown();
      await Micdrop.stop();
      if (options.isStopping()) return;
      await startListening();
      if (options.isStopping()) return;
      await wake.waitUntilIdle();
      if (!options.isStopping()) wake.reset();
    },
    setSpeechEnabled(enabled) {
      if (enabled) Micdrop.unmute();
      else Micdrop.mute();
    },
    async reportFailure(error) {
      if (options.isStopping()) return;
      diagnostics.failure('satellite_failure', error);
      const work = playPcm16((async function* () { yield notice; })(), options.speaker, noticeAbort.signal)
        .catch(playbackError => {
          if (noticeAbort.signal.aborted) { noticeErrors.push(playbackError); return; }
          diagnostics.failure('satellite_notice_failed', playbackError);
        });
      noticeWork = work;
      try { await work; } finally { if (noticeWork === work) noticeWork = undefined; }
    },
  };
}

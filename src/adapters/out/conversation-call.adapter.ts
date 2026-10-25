import type { VoiceSessionPorts } from '../../application/conversation-call.port.js';
import type { ConversationChannel } from './conversation-channel.js';
import { playPcm16 } from './decibri-audio.js';
import type { Diagnostics } from './diagnostics.js';
import { errorToneSamples, readyCueSamples } from './ready-cue.js';
import type { ResponsePlayback } from './response-playback.js';
import type { SherpaSpeechDetector, SpeechEvents } from './sherpa-speech-detector.js';

/**
 * Implements the session's outbound ports on the persistent `ambrogio.v1` channel: an
 * interaction opens on the session, and ends locally without closing the session.
 */
export function createConversationCallAdapter(options: Readonly<{
  channel: ConversationChannel;
  vad: SherpaSpeechDetector;
  speech: SpeechEvents;
  playback: ResponsePlayback;
  speaker?: string;
  wake: Readonly<{ waitUntilIdle(): Promise<void>; reset(): void }>;
  isStopping(): boolean;
  diagnostics: Pick<Diagnostics, 'failure'>;
}>): VoiceSessionPorts & Readonly<{ shutdown(): Promise<void> }> {
  const { channel, vad, playback, wake, diagnostics } = options;
  const errorToneAbort = new AbortController();
  let cueAbort: AbortController | undefined;
  let cueWork: Promise<void> | undefined;
  let errorToneWork: Promise<void> | undefined;
  const errorToneErrors: unknown[] = [];
  let shutdownPromise: Promise<void> | undefined;

  function endInteraction(): void {
    vad.reset();
    playback.cancel();
    channel.forgetRequest();
  }

  return {
    async openCall() {
      if (options.isStopping()) return;
      await channel.ensure();
      channel.newConversation();
    },
    async closeCall() {
      endInteraction();
      cueAbort?.abort();
      if (cueWork) await cueWork;
      if (options.isStopping()) return;
      await wake.waitUntilIdle();
      if (!options.isStopping()) wake.reset();
    },
    setSpeechEnabled(enabled) {
      if (enabled && !options.isStopping()) vad.start(options.speech);
      else vad.reset();
    },
    async playReadyCue() {
      if (options.isStopping()) return;
      const controller = new AbortController();
      cueAbort = controller;
      const work = playPcm16((async function* () { yield readyCueSamples(); })(), options.speaker, controller.signal)
        .catch(error => {
          if (!controller.signal.aborted) diagnostics.failure('satellite_ready_cue_failed', error);
        });
      cueWork = work;
      try { await work; }
      finally {
        if (cueWork === work) cueWork = undefined;
        if (cueAbort === controller) cueAbort = undefined;
      }
    },
    async reportFailure(error) {
      if (options.isStopping()) return;
      diagnostics.failure('satellite_failure', error);
      const work = playPcm16((async function* () { yield errorToneSamples(); })(), options.speaker, errorToneAbort.signal)
        .catch(playbackError => {
          if (errorToneAbort.signal.aborted) { errorToneErrors.push(playbackError); return; }
          diagnostics.failure('satellite_error_tone_failed', playbackError);
        });
      errorToneWork = work;
      try { await work; } finally { if (errorToneWork === work) errorToneWork = undefined; }
    },
    shutdown() {
      return shutdownPromise ??= (async () => {
        errorToneAbort.abort();
        cueAbort?.abort();
        endInteraction();
        const errors: unknown[] = [];
        try { await channel.close(); } catch (error) { errors.push(error); }
        if (errorToneWork) await errorToneWork;
        if (cueWork) await cueWork;
        errors.push(...errorToneErrors);
        if (errors.length) throw new AggregateError(errors, 'Conversation channel shutdown failed');
      })();
    },
  };
}

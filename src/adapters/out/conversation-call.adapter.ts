import type { VoiceSessionPorts } from '../../application/voice-session.use-case.js';
import type { ConversationChannel } from './conversation-channel.js';
import { playPcm16 } from './decibri-audio.js';
import { diagnostics } from './diagnostics.js';
import { readyCueSamples } from './ready-cue.js';
import type { ResponsePlayback } from './response-playback.js';
import type { SileroVad, SpeechEvents } from './silero-vad.js';

/**
 * Implements the session's outbound ports on the persistent `ambrogio.v1` channel: an
 * interaction opens on the session, and ends locally without closing the session.
 */
export function createConversationCallAdapter(options: Readonly<{
  channel: ConversationChannel;
  vad: SileroVad;
  speech: SpeechEvents;
  playback: ResponsePlayback;
  speaker?: string;
  notice: Int16Array;
  wake: Readonly<{ waitUntilIdle(): Promise<void>; reset(): void }>;
  isStopping(): boolean;
}>): VoiceSessionPorts & Readonly<{ shutdown(): Promise<void> }> {
  const { channel, vad, playback, wake, notice } = options;
  const noticeAbort = new AbortController();
  let cueAbort: AbortController | undefined;
  let cueWork: Promise<void> | undefined;
  let noticeWork: Promise<void> | undefined;
  const noticeErrors: unknown[] = [];
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
      const work = playPcm16((async function* () { yield notice; })(), options.speaker, noticeAbort.signal)
        .catch(playbackError => {
          if (noticeAbort.signal.aborted) { noticeErrors.push(playbackError); return; }
          diagnostics.failure('satellite_notice_failed', playbackError);
        });
      noticeWork = work;
      try { await work; } finally { if (noticeWork === work) noticeWork = undefined; }
    },
    shutdown() {
      return shutdownPromise ??= (async () => {
        noticeAbort.abort();
        cueAbort?.abort();
        endInteraction();
        const errors: unknown[] = [];
        try { await channel.close(); } catch (error) { errors.push(error); }
        if (noticeWork) await noticeWork;
        if (cueWork) await cueWork;
        errors.push(...noticeErrors);
        if (errors.length) throw new AggregateError(errors, 'Conversation channel shutdown failed');
      })();
    },
  };
}

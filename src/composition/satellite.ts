import { NodeDeadlineScheduler } from '../adapters/out/node-deadline-scheduler.adapter.js';
import { VoiceSession } from '../application/voice-session.use-case.js';
import { createConversationEventsAdapter } from '../adapters/in/conversation-events.adapter.js';
import { createConversationCallAdapter } from '../adapters/out/conversation-call.adapter.js';
import { AudioReserve } from '../adapters/out/audio-reserve.js';
import { ConversationChannel } from '../adapters/out/conversation-channel.js';
import { diagnostics } from '../adapters/out/diagnostics.js';
import { noticeSamples, voiceUnavailableSamples } from '../adapters/out/local-notice.js';
import { MicrophoneInput } from '../adapters/out/microphone-input.js';
import { OnnxWakeWord } from '../adapters/out/onnx-wake-word.js';
import { ResponsePlayback } from '../adapters/out/response-playback.js';
import { SileroVad } from '../adapters/out/silero-vad.js';
import { wakeWordFiles } from '../adapters/out/wake-word-catalog.js';
import type { SatelliteConfig } from '../adapters/out/configuration.js';

const WAKE_COOLDOWN_MS = 2_000;
const WAKE_MAX_QUEUED_CHUNKS = 32;
/** 1500 ms of 16 kHz audio kept before confirmed speech. */
const AUDIO_RESERVE_SAMPLES = 1_500 * 16;
const ANSWER_TIMEOUT_MS = 60_000;

/** Assemble a single Linux satellite process after configuration validation. */
export async function startSatellite(config: SatelliteConfig, signal?: AbortSignal): Promise<Readonly<{ stop(): Promise<void> }>> {
  const [notice, voiceUnavailable] = await Promise.all([noticeSamples(), voiceUnavailableSamples()]);
  let session: VoiceSession | undefined;
  let stopping = signal?.aborted ?? false;
  let wake: OnnxWakeWord | undefined;
  let vad: SileroVad | undefined;
  let call: ReturnType<typeof createConversationCallAdapter> | undefined;
  let stopped: Promise<void> | undefined;
  const abort = () => { stopping = true; };
  signal?.addEventListener('abort', abort, { once: true });
  const checkStopping = () => { if (stopping) throw new DOMException('Satellite stopped', 'AbortError'); };
  const playback = new ResponsePlayback({ speaker: config.audio.speaker, voiceUnavailable,
    failed: error => events.failed(error) });
  const channel = new ConversationChannel({ url: config.backend.sessionUrl, identity: config.client,
    lost: () => events.sessionLost() });
  const events = createConversationEventsAdapter({
    getSession: () => session,
    isStopping: () => stopping,
    channel: () => channel,
    vad: () => vad,
    reserve: new AudioReserve(AUDIO_RESERVE_SAMPLES),
    playback,
    pushWakeFrames: frames => { wake?.push(frames); },
  });
  const microphone = new MicrophoneInput(config.audio.microphone);
  function stop(): Promise<void> {
    if (stopped) return stopped;
    stopping = true;
    stopped = (async () => {
      const errors: unknown[] = [];
      const attempt = async (close: () => unknown) => { try { await close(); } catch (error) { errors.push(error); } };
      await attempt(() => playback.cancel());
      // Start independent cleanup even if another operation is still pending.
      await Promise.all([
        attempt(() => session?.stop()), attempt(() => call?.shutdown() ?? channel.close()),
        attempt(() => microphone.close()), attempt(() => wake?.close()), attempt(() => vad?.close()),
      ]);
      signal?.removeEventListener('abort', abort);
      if (errors.length) throw new AggregateError(errors, 'Satellite shutdown failed');
    })();
    return stopped;
  }
  try {
    checkStopping();
    wake = await OnnxWakeWord.open(wakeWordFiles(config.wakeWord.model), {
      threshold: config.wakeWord.threshold,
      cooldownMs: WAKE_COOLDOWN_MS,
      maxQueuedChunks: WAKE_MAX_QUEUED_CHUNKS,
      detected: events.wakeDetected,
      failed: events.failed,
    });
    checkStopping();
    vad = await SileroVad.open();
    checkStopping();
    call = createConversationCallAdapter({
      channel, vad, speech: events.speech, playback,
      speaker: config.audio.speaker, notice, wake,
      isStopping: () => stopping,
    });
    session = new VoiceSession(call, config.interaction.replyTimeoutMs, ANSWER_TIMEOUT_MS, new NodeDeadlineScheduler());
    await microphone.start(events.frames, events.failed);
    checkStopping();
    // The session is persistent: open it now; an unreachable backend is retried at the next activation.
    void channel.ensure().catch(error => {
      if (!stopping) diagnostics.info('satellite_session_unavailable');
      void error;
    });
  } catch (error) {
    try { await stop(); }
    catch (cleanup) { throw new AggregateError([error, cleanup], 'Satellite startup and cleanup failed', { cause: error }); }
    throw error;
  }
  return { stop };
}

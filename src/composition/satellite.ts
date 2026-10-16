import { Mic, Speaker, setMicdropStorage } from '@micdrop/client';
import { NodeDeadlineScheduler } from '../adapters/out/node-deadline-scheduler.adapter.js';
import { VoiceSession } from '../application/voice-session.use-case.js';
import { createMicdropEventsAdapter } from '../adapters/in/micdrop-events.adapter.js';
import { createMicdropCallAdapter } from '../adapters/out/micdrop-call.adapter.js';
import { noticeSamples } from '../adapters/out/local-notice.js';
import { DecibriMicDriver, DecibriSpeakerDriver } from '../adapters/out/micdrop-decibri-drivers.js';
import { MicdropPlaybackBoundary } from '../adapters/out/micdrop-playback.js';
import { OnnxWakeWord } from '../adapters/out/onnx-wake-word.js';
import { installNodeSilero } from '../adapters/out/silero-node.js';
import { wakeWordFiles, type DistributedWakeWord } from '../adapters/out/wake-word-catalog.js';
import type { SatelliteConfig } from '../adapters/out/configuration.js';

const WAKE_THRESHOLD = 0.5;
const WAKE_COOLDOWN_MS = 2_000;
const WAKE_MAX_QUEUED_CHUNKS = 32;
const AUDIO_RESERVE_MS = 1_500;
const ANSWER_TIMEOUT_MS = 60_000;
const PLAYBACK_QUIET_MS = 1_000;

/** Assemble a single Linux satellite process after configuration validation. */
export async function startSatellite(config: SatelliteConfig, signal?: AbortSignal): Promise<Readonly<{ stop(): Promise<void> }>> {
  const notice = await noticeSamples();
  setMicdropStorage({ getItem: () => null, setItem: () => {}, removeItem: () => {} });
  const silero = installNodeSilero();
  let session: VoiceSession | undefined;
  let stopping = signal?.aborted ?? false;
  let wake: OnnxWakeWord | undefined;
  let call: ReturnType<typeof createMicdropCallAdapter> | undefined;
  let stopped: Promise<void> | undefined;
  const abort = () => { stopping = true; };
  signal?.addEventListener('abort', abort, { once: true });
  const checkStopping = () => { if (stopping) throw new DOMException('Satellite stopped', 'AbortError'); };
  const playback = new MicdropPlaybackBoundary(PLAYBACK_QUIET_MS,
    () => events.responsePlayed());
  const events = createMicdropEventsAdapter({
    getSession: () => session,
    isStopping: () => stopping,
    pushWakeFrames: frames => { wake?.push(frames); },
    playback,
  });
  const mic = new DecibriMicDriver(config.audio.microphone);
  const speaker = new DecibriSpeakerDriver(config.audio.speaker, events.failed);
  function stop(): Promise<void> {
    if (stopped) return stopped;
    stopping = true;
    stopped = (async () => {
      const errors: unknown[] = [];
      const attempt = async (close: () => unknown) => { try { await close(); } catch (error) { errors.push(error); } };
      await attempt(() => events.detach());
      await attempt(() => playback.cancel());
      // Start independent cleanup even if another operation is still pending.
      await Promise.all([
        attempt(() => session?.stop()), attempt(() => call?.shutdown()),
        attempt(() => mic.close()), attempt(() => speaker.close()),
        attempt(() => wake?.close()),
      ]);
      await attempt(() => silero.close());
      signal?.removeEventListener('abort', abort);
      if (errors.length) throw new AggregateError(errors, 'Satellite shutdown failed');
    })();
    return stopped;
  }
  try {
    checkStopping();
    Mic.setDriver(mic);
    Speaker.setDriver(speaker);
    wake = await OnnxWakeWord.open(wakeWordFiles(config.wakeWord.model as DistributedWakeWord), {
      threshold: WAKE_THRESHOLD,
      cooldownMs: WAKE_COOLDOWN_MS,
      maxQueuedChunks: WAKE_MAX_QUEUED_CHUNKS,
      detected: events.wakeDetected,
      failed: events.failed,
    });
    checkStopping();
    call = createMicdropCallAdapter({
      voiceUrl: config.backend.voiceUrl.toString(),
      speaker: config.audio.speaker,
      audioReserveMs: AUDIO_RESERVE_MS,
      notice, playback, wake,
      isStopping: () => stopping,
    });
    session = new VoiceSession(call, config.interaction.replyTimeoutMs, ANSWER_TIMEOUT_MS, new NodeDeadlineScheduler());
    events.attach();
    await call.startListening();
    checkStopping();
  } catch (error) {
    try { await stop(); }
    catch (cleanup) { throw new AggregateError([error, cleanup], 'Satellite startup and cleanup failed', { cause: error }); }
    throw error;
  }
  return { stop };
}

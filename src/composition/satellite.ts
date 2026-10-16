import { Mic, Speaker, setMicdropStorage } from '@micdrop/client';
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
export async function startSatellite(config: SatelliteConfig): Promise<Readonly<{ stop(): Promise<void> }>> {
  const notice = await noticeSamples();
  setMicdropStorage({ getItem: () => null, setItem: () => {}, removeItem: () => {} });
  installNodeSilero();
  let session: VoiceSession | undefined;
  let stopping = false;
  const playback = new MicdropPlaybackBoundary(PLAYBACK_QUIET_MS,
    () => events.responsePlayed());
  const events = createMicdropEventsAdapter({
    getSession: () => session,
    isStopping: () => stopping,
    pushWakeFrames: frames => { wake.push(frames); },
    playback,
  });
  Mic.setDriver(new DecibriMicDriver(config.audio.microphone));
  Speaker.setDriver(new DecibriSpeakerDriver(config.audio.speaker, events.failed));
  const wake = await OnnxWakeWord.open(wakeWordFiles(config.wakeWord.model as DistributedWakeWord), {
    threshold: WAKE_THRESHOLD,
    cooldownMs: WAKE_COOLDOWN_MS,
    maxQueuedChunks: WAKE_MAX_QUEUED_CHUNKS,
    detected: events.wakeDetected,
    failed: events.failed,
  });
  const call = createMicdropCallAdapter({
    voiceUrl: config.backend.voiceUrl.toString(),
    speaker: config.audio.speaker,
    audioReserveMs: AUDIO_RESERVE_MS,
    notice, playback, wake,
    isStopping: () => stopping,
  });
  session = new VoiceSession(call, config.interaction.replyTimeoutMs, ANSWER_TIMEOUT_MS);
  events.attach();
  try {
    await call.startListening();
  } catch (error) {
    events.detach();
    await wake.close();
    throw error;
  }
  return {
    async stop() {
      stopping = true;
      playback.cancel();
      events.detach();
      await session.stop();
      await wake.close();
    },
  };
}

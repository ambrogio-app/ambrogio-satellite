import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Mic, Micdrop, SileroVAD, Speaker, setMicdropStorage,
  type MicdropState } from '@micdrop/client';
import { VoiceSession } from '../application/voice-session.js';
import { playPcm16 } from '../adapters/out/decibri-audio.js';
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
const NOTICE_FILE = fileURLToPath(new URL('../../assets/backend-unavailable.wav', import.meta.url));

function logFailure(error: Error): void {
  const code = 'code' in error && typeof error.code === 'string' ? error.code : error.name;
  console.log(JSON.stringify({ level: 'error', event: 'satellite_failure', code }));
}

/** WAV is a bundled, known-format asset, but validate its header before playback. */
async function noticeSamples(): Promise<Int16Array> {
  const wav = await readFile(NOTICE_FILE);
  if (wav.toString('ascii', 0, 4) !== 'RIFF' || wav.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('Invalid local notice WAV');
  }
  let offset = 12;
  let formatOk = false;
  let audio: Buffer | undefined;
  while (offset + 8 <= wav.length) {
    const kind = wav.toString('ascii', offset, offset + 4);
    const length = wav.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (start + length > wav.length) throw new Error('Truncated local notice WAV');
    if (kind === 'fmt ' && length >= 16) {
      formatOk = wav.readUInt16LE(start) === 1 && wav.readUInt16LE(start + 2) === 1
        && wav.readUInt32LE(start + 4) === 16_000 && wav.readUInt16LE(start + 14) === 16;
    }
    if (kind === 'data') audio = wav.subarray(start, start + length);
    offset = start + length + (length % 2);
  }
  if (!formatOk || !audio || audio.length === 0 || audio.length % 2 !== 0) {
    throw new Error('Unsupported local notice WAV');
  }
  const samples = new Int16Array(audio.length / 2);
  for (let i = 0; i < samples.length; i++) samples[i] = audio.readInt16LE(i * 2);
  return samples;
}

/** Assemble a single Linux satellite process after configuration validation. */
export async function startSatellite(config: SatelliteConfig): Promise<Readonly<{ stop(): Promise<void> }>> {
  const notice = await noticeSamples();
  // Micdrop's browser store has no meaning on a headless satellite.
  setMicdropStorage({ getItem: () => null, setItem: () => {}, removeItem: () => {} });
  installNodeSilero();
  let session: VoiceSession | undefined;
  let stopping = false;
  const playback = new MicdropPlaybackBoundary(PLAYBACK_QUIET_MS,
    () => session?.dispatch({ kind: 'response_played' }));
  Mic.setDriver(new DecibriMicDriver(config.audio.microphone));
  Speaker.setDriver(new DecibriSpeakerDriver(config.audio.speaker, error => {
    if (!stopping) void session?.fail(error);
  }));
  const wake = await OnnxWakeWord.open(wakeWordFiles(config.wakeWord.model as DistributedWakeWord), {
    threshold: WAKE_THRESHOLD,
    cooldownMs: WAKE_COOLDOWN_MS,
    maxQueuedChunks: WAKE_MAX_QUEUED_CHUNKS,
    detected: () => session?.dispatch({ kind: 'wake_detected' }),
    failed: error => { if (!stopping) void session?.fail(error); },
  });

  function setReserve(): void {
    if (!(Micdrop.vad instanceof SileroVAD)) throw new Error('Silero VAD was not installed');
    Micdrop.vad.delay = AUDIO_RESERVE_MS;
    Micdrop.vad.setOptions({ redemptionFrames: 20 });
  }

  session = new VoiceSession({
    async openCall() {
      await Micdrop.start({
        url: config.backend.voiceUrl.toString(),
        disableInterruption: true,
        reconnect: { maxAttempts: 0, connectionTimeout: 5_000 },
      });
    },
    async closeCall() {
      playback.cancel();
      await Micdrop.stop();
      if (stopping) return;
      await Micdrop.startMic({ vad: 'silero' });
      setReserve();
      Micdrop.mute();
      await wake.waitUntilIdle();
      wake.reset();
    },
    setSpeechEnabled(enabled) {
      if (enabled) Micdrop.unmute();
      else Micdrop.mute();
    },
    async reportFailure(error) {
      logFailure(error);
      try { await playPcm16((async function* () { yield notice; })(), config.audio.speaker); }
      catch (playbackError) {
        logFailure(playbackError instanceof Error ? playbackError : new Error(String(playbackError)));
      }
    },
  }, config.interaction.replyTimeoutMs, ANSWER_TIMEOUT_MS);

  const onFrames = (frames: Float32Array) => {
    if (session?.state.phase === 'waiting_wake_word') wake.push(frames);
  };
  const onStateChange = (state: MicdropState, previous: MicdropState) => {
    playback.update(state.isAssistantSpeaking);
    if (!previous.isUserSpeaking && state.isUserSpeaking) {
      session?.dispatch({ kind: 'speech_started' });
    }
    if (previous.isUserSpeaking && !state.isUserSpeaking) {
      queueMicrotask(() => {
        if (session?.state.phase !== 'recording') return;
        playback.begin();
        session.dispatch({ kind: 'speech_ended' });
      });
    }
    if (previous.isStarted && !state.isStarted && !stopping
      && session && !['waiting_wake_word', 'closing_call'].includes(session.state.phase)) {
      void session.fail(new Error('Micdrop call closed unexpectedly'));
    }
  };
  const onMessage = (message: { role: string; metadata?: Record<string, unknown> }) => {
    if (message.role === 'assistant') {
      session?.dispatch({ kind: 'assistant_message', expectsReply: message.metadata?.expectsReply });
    }
  };
  const onError = (error: Error) => {
    if (session && !['waiting_wake_word', 'closing_call'].includes(session.state.phase)) {
      void session.fail(error);
    }
  };

  Mic.on('Frames', onFrames);
  Micdrop.on('StateChange', onStateChange);
  Micdrop.on('Message', onMessage);
  Micdrop.on('Error', onError);
  try {
    await Micdrop.startMic({ vad: 'silero' });
    setReserve();
    Micdrop.mute();
  } catch (error) {
    Mic.off('Frames', onFrames);
    Micdrop.off('StateChange', onStateChange);
    Micdrop.off('Message', onMessage);
    Micdrop.off('Error', onError);
    await wake.close();
    throw error;
  }

  return {
    async stop() {
      stopping = true;
      playback.cancel();
      Mic.off('Frames', onFrames);
      Micdrop.off('StateChange', onStateChange);
      Micdrop.off('Message', onMessage);
      Micdrop.off('Error', onError);
      await session.stop();
      await wake.close();
    },
  };
}

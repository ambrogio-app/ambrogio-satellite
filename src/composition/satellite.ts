import { NodeDeadlineScheduler } from '../adapters/out/node-deadline-scheduler.adapter.js';
import { VoiceSession } from '../application/voice-session.use-case.js';
import { createConversationEventsAdapter } from '../adapters/in/conversation-events.adapter.js';
import { createConversationCallAdapter } from '../adapters/out/conversation-call.adapter.js';
import { AmixerAttenuation } from '../adapters/out/amixer-attenuation.adapter.js';
import { AudioReserve } from '../adapters/out/audio-reserve.js';
import { ConversationChannel } from '../adapters/out/conversation-channel.js';
import type { Diagnostics } from '../adapters/out/diagnostics.js';
import { MicrophoneInput } from '../adapters/out/microphone-input.js';
import { OnnxWakeWord } from '../adapters/out/onnx-wake-word.js';
import { ResponsePlayback } from '../adapters/out/response-playback.js';
import { SileroVad } from '../adapters/out/silero-vad.js';
import { wakeWordFiles } from '../adapters/out/wake-word-catalog.js';
import type { SatelliteConfig } from '../runtime/configuration.js';
import { combineFaults, createResourceStack, faultOutcome } from '../runtime/lifecycle.js';
import { ProjectError } from '../runtime/project-error.js';

const WAKE_COOLDOWN_MS = 2_000;
const WAKE_MAX_QUEUED_CHUNKS = 32;
/** 1500 ms of 16 kHz audio kept before confirmed speech. */
const AUDIO_RESERVE_SAMPLES = 1_500 * 16;
const ANSWER_TIMEOUT_MS = 60_000;

export type Satellite = Readonly<{
  /** Restore the attenuation, start the microphone and open the session: the satellite then waits for the wake word. */
  activate(): Promise<void>;
  /** The single shutdown: stop new work, cancel playback, then close every resource in reverse order. */
  close(): Promise<void>;
  /** Faults observed by the shutdown so far, also while it is still pending. */
  readonly faults: readonly unknown[];
}>;

const isAbort = (error: unknown) => error instanceof DOMException && error.name === 'AbortError';

/** Name the phase of an external failure; project errors and interruptions pass unchanged. */
async function phase<T>(message: string, work: () => Promise<T>): Promise<T> {
  try { return await work(); }
  catch (error) {
    if (error instanceof ProjectError || isAbort(error)) throw error;
    throw new ProjectError(message, { cause: error });
  }
}

/**
 * Build a single Linux satellite process after configuration validation: load the models and prepare channel,
 * call and voice session, registering each closing right after the acquisition. Nothing is activated here.
 */
export async function createSatellite(config: SatelliteConfig, diagnostics: Diagnostics,
  signal?: AbortSignal): Promise<Satellite> {
  let session: VoiceSession | undefined;
  let stopping = signal?.aborted ?? false;
  let wake: OnnxWakeWord | undefined;
  let vad: SileroVad | undefined;
  let closed: Promise<void> | undefined;
  const resources = createResourceStack();
  const cancelFaults: unknown[] = [];
  const observed = () => [...cancelFaults, ...resources.faults];
  const abort = () => { stopping = true; };
  signal?.addEventListener('abort', abort, { once: true });
  const checkStopping = () => { if (stopping) throw new DOMException('Satellite stopped', 'AbortError'); };
  const playback = new ResponsePlayback({ speaker: config.audio.speaker, diagnostics,
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
  const attenuation = config.audio.attenuation
    ? new AmixerAttenuation(config.audio.attenuation, (operation, reason) => diagnostics.attenuationFailed(operation, reason))
    : undefined;
  function close(): Promise<void> {
    closed ??= (async () => {
      stopping = true;
      try { playback.cancel(); }
      catch (error) { cancelFaults.push(new ProjectError('Playback could not be cancelled', { cause: error })); }
      try { await resources.close(); } catch { /* every fault is in resources.faults */ }
      signal?.removeEventListener('abort', abort);
      const outcome = faultOutcome('Satellite shutdown failed', observed());
      if (outcome !== undefined) throw outcome;
    })();
    return closed;
  }
  try {
    checkStopping();
    const opened = await phase('Wake word model could not be loaded', () => OnnxWakeWord.open(wakeWordFiles(config.wakeWord.model), {
      threshold: config.wakeWord.threshold,
      patience: config.wakeWord.patience,
      cooldownMs: WAKE_COOLDOWN_MS,
      maxQueuedChunks: WAKE_MAX_QUEUED_CHUNKS,
      detected: (score, chunks) => {
        diagnostics.wakeDetected(score, chunks);
        events.wakeDetected();
      },
      failed: events.failed,
    }));
    wake = opened;
    resources.defer('Wake word model could not be closed', () => opened.close());
    checkStopping();
    const activity = await phase('Voice activity model could not be loaded', () => SileroVad.open());
    vad = activity;
    resources.defer('Voice activity model could not be closed', () => activity.close());
    checkStopping();
    const call = createConversationCallAdapter({
      channel, vad: activity, speech: events.speech, playback,
      speaker: config.audio.speaker, wake: opened, diagnostics,
      isStopping: () => stopping,
    });
    // The call adapter owns the channel: its shutdown closes it. Before activation the channel is never opened.
    resources.defer('Conversation channel could not be closed', () => call.shutdown());
    const voice = new VoiceSession(call, config.interaction.replyTimeoutMs, ANSWER_TIMEOUT_MS, new NodeDeadlineScheduler(),
      attenuation);
    session = voice;
    resources.defer('Voice session could not be stopped', () => voice.stop());
  } catch (error) {
    try { await close(); }
    catch { /* the cleanup faults are kept below */ }
    throw combineFaults('Satellite startup failed', error, observed());
  }
  let activated = false;
  return {
    get faults() { return observed(); },
    close,
    async activate() {
      if (activated) return;
      activated = true;
      checkStopping();
      // A previous process may have stopped while other local audio was lowered.
      await attenuation?.restore();
      resources.defer('Microphone could not be closed', () => microphone.close());
      await phase('Microphone could not be started', () => microphone.start(events.frames, events.failed));
      checkStopping();
      // The session is persistent: open it now; an unreachable backend is retried at the next activation.
      void channel.ensure().catch(error => {
        if (!stopping) diagnostics.info('satellite_session_unavailable');
        void error;
      });
    },
  };
}

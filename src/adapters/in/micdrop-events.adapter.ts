import { Mic, Micdrop, type MicdropState } from '@micdrop/client';
import type { VoiceSession } from '../../application/voice-session.use-case.js';

/** Translates microphone, wake-word and Micdrop events into the session use case. */
export function createMicdropEventsAdapter(options: Readonly<{
  getSession(): VoiceSession | undefined;
  isStopping(): boolean;
  pushWakeFrames(frames: Float32Array): void;
  playback: Readonly<{ update(playing: boolean): void; begin(): void }>;
}>) {
  const { playback } = options;
  const onFrames = (frames: Float32Array) => {
    if (!options.isStopping() && options.getSession()?.status.acceptsWakeWord) options.pushWakeFrames(frames);
  };
  const onStateChange = (state: MicdropState, previous: MicdropState) => {
    if (options.isStopping()) return;
    const session = options.getSession();
    playback.update(state.isAssistantSpeaking);
    if (!previous.isUserSpeaking && state.isUserSpeaking) {
      session?.dispatch({ kind: 'speech_started' });
    }
    if (previous.isUserSpeaking && !state.isUserSpeaking) {
      queueMicrotask(() => {
        if (options.isStopping() || !session?.status.acceptsSpeechEnd) return;
        playback.begin();
        session.dispatch({ kind: 'speech_ended' });
      });
    }
    if (previous.isStarted && !state.isStarted && !options.isStopping()
      && session?.status.interactionActive) {
      void session.fail(new Error('Micdrop call closed unexpectedly'));
    }
  };
  const onMessage = (message: { role: string; metadata?: Record<string, unknown> }) => {
    if (options.isStopping()) return;
    const session = options.getSession();
    if (message.role === 'assistant') {
      const value = message.metadata?.expectsReply;
      session?.dispatch({ kind: 'assistant_message', expectsReply: typeof value === 'boolean' ? value : undefined });
    }
  };
  const onError = (error: Error) => {
    if (options.isStopping()) return;
    const session = options.getSession();
    if (session?.status.interactionActive) {
      void session.fail(error);
    }
  };

  return {
    wakeDetected() { if (!options.isStopping()) options.getSession()?.dispatch({ kind: 'wake_detected' }); },
    responsePlayed() { if (!options.isStopping()) options.getSession()?.dispatch({ kind: 'response_played' }); },
    failed(error: unknown) {
      if (!options.isStopping()) void options.getSession()?.fail(error);
    },
    attach() {
      Mic.on('Frames', onFrames);
      Micdrop.on('StateChange', onStateChange);
      Micdrop.on('Message', onMessage);
      Micdrop.on('Error', onError);
    },
    detach() {
      Mic.off('Frames', onFrames);
      Micdrop.off('StateChange', onStateChange);
      Micdrop.off('Message', onMessage);
      Micdrop.off('Error', onError);
    },
  };
}

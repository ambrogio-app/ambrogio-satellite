import type { VoiceSession } from '../../application/voice-session.use-case.js';
import type { RequestEvents, TurnOutcome } from '../../adapters/out/ambrogio-session.js';
import type { AudioReserve } from '../../adapters/out/audio-reserve.js';
import type { ConversationChannel } from '../../adapters/out/conversation-channel.js';
import type { ResponsePlayback } from '../../adapters/out/response-playback.js';
import type { SherpaSpeechDetector, SpeechEvents } from '../../adapters/out/sherpa-speech-detector.js';

/** Translates microphone, speech detection and `ambrogio.v1` events into the session use case. */
export function createConversationEventsAdapter(options: Readonly<{
  getSession(): VoiceSession | undefined;
  isStopping(): boolean;
  channel(): ConversationChannel | undefined;
  vad(): SherpaSpeechDetector | undefined;
  reserve: AudioReserve;
  playback: ResponsePlayback;
  pushWakeFrames(frames: Float32Array): void;
}>) {
  const { reserve, playback } = options;
  /** Bumped for every request, so late events of an abandoned one are ignored. */
  let request = 0;

  const active = (id: number) => id === request && !options.isStopping();

  function fail(error: unknown): void {
    if (!options.isStopping()) void options.getSession()?.fail(error);
  }

  function requestEvents(id: number): RequestEvents {
    return {
      accepted() { /* the channel keeps the conversation of the turn */ },
      outputStart(stream, content) { if (active(id)) playback.start(stream, content); },
      outputAudio(stream, samples) { if (active(id)) playback.audio(stream, samples); },
      outputEnd(stream) { if (active(id)) playback.end(stream); },
      outcome(outcome: TurnOutcome) {
        if (!active(id)) return;
        const session = options.getSession();
        // Failed, rejected and interrupted turns are conclusive: no reply is awaited.
        session?.dispatch({ kind: 'assistant_message',
          expectsReply: outcome.kind === 'completed' ? outcome.expectsReply : false });
        void playback.idle().then(() => {
          if (active(id)) options.getSession()?.dispatch({ kind: 'response_played' });
        });
      },
      rejectedByProtocol(code) {
        if (active(id)) fail(new Error(`Conversation request refused by the protocol: ${code}`));
      },
    };
  }

  const speech: SpeechEvents = {
    confirmed() {
      const channel = options.channel();
      if (options.isStopping() || !channel) return;
      const id = ++request;
      try { channel.startRequest(reserve.take(), requestEvents(id)); }
      catch (error) { fail(error); return; }
      options.getSession()?.dispatch({ kind: 'speech_started' });
    },
    ended() {
      const channel = options.channel();
      if (options.isStopping() || !channel?.isTransmitting) return;
      channel.endRequest();
      options.getSession()?.dispatch({ kind: 'speech_ended' });
    },
    failed(error) { fail(error); },
  };

  return {
    speech,
    /** Every microphone frame: reserve, wake word, speech detection and the open request. */
    frames(samples: Float32Array) {
      if (options.isStopping()) return;
      const session = options.getSession();
      const channel = options.channel();
      if (channel?.isTransmitting) {
        if (!channel.send(samples)) speech.ended();
      } else {
        reserve.push(samples);
      }
      if (session?.status.acceptsWakeWord) options.pushWakeFrames(samples);
      options.vad()?.push(samples);
    },
    wakeDetected() { if (!options.isStopping()) options.getSession()?.dispatch({ kind: 'wake_detected' }); },
    sessionLost() {
      if (options.isStopping()) return;
      const session = options.getSession();
      if (session?.status.interactionActive) fail(new Error('Conversation session closed unexpectedly'));
    },
    failed: fail,
  };
}

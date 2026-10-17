export type VoiceTurnPhase =
  | 'waiting_wake_word'
  | 'opening_call'
  | 'listening'
  | 'recording'
  | 'waiting_answer'
  | 'waiting_metadata'
  | 'signalling_listening'
  | 'waiting_reply'
  | 'closing_call';

export type VoiceTurnState = Readonly<{
  phase: VoiceTurnPhase;
  reply?: boolean;
  expectsReply?: boolean;
  responsePlayed?: boolean;
}>;

export type VoiceTurnEvent =
  | Readonly<{ kind: 'wake_detected' }>
  | Readonly<{ kind: 'call_opened' }>
  | Readonly<{ kind: 'speech_started' }>
  | Readonly<{ kind: 'speech_ended' }>
  | Readonly<{ kind: 'assistant_message'; expectsReply: unknown }>
  | Readonly<{ kind: 'response_played' }>
  | Readonly<{ kind: 'ready_cue_played' }>
  | Readonly<{ kind: 'timeout' }>
  | Readonly<{ kind: 'call_closed' }>;

export type VoiceTurnAction = 'open_call' | 'close_call' | 'arm_timeout' | 'clear_timeout'
  | 'arm_answer_timeout' | 'clear_answer_timeout' | 'enable_speech' | 'disable_speech'
  | 'play_ready_cue';
export type VoiceTurnTransition = Readonly<{ state: VoiceTurnState; actions: readonly VoiceTurnAction[] }>;

export const initialVoiceTurnState: VoiceTurnState = { phase: 'waiting_wake_word' };

function decide(expectsReply: boolean): VoiceTurnTransition {
  return expectsReply
    ? { state: { phase: 'signalling_listening', reply: true }, actions: ['play_ready_cue'] }
    : { state: { phase: 'closing_call' }, actions: ['close_call'] };
}

/** Turn policy independent of Micdrop events and audio device timing. */
export function advanceVoiceTurn(state: VoiceTurnState, event: VoiceTurnEvent): VoiceTurnTransition {
  if (event.kind === 'call_closed') {
    return { state: initialVoiceTurnState, actions: ['clear_timeout', 'clear_answer_timeout'] };
  }
  switch (state.phase) {
    case 'waiting_wake_word':
      return event.kind === 'wake_detected'
        ? { state: { phase: 'opening_call' }, actions: ['open_call'] }
        : { state, actions: [] };
    case 'opening_call':
      return event.kind === 'call_opened'
        ? { state: { phase: 'signalling_listening', reply: false }, actions: ['play_ready_cue'] }
        : { state, actions: [] };
    case 'listening':
      return event.kind === 'speech_started'
        ? { state: { phase: 'recording' }, actions: [] }
        : { state, actions: [] };
    case 'recording':
      return event.kind === 'speech_ended'
        ? { state: { phase: 'waiting_answer' }, actions: ['disable_speech', 'arm_answer_timeout'] }
        : { state, actions: [] };
    case 'waiting_answer':
    case 'waiting_metadata': {
      if (event.kind === 'assistant_message' && typeof event.expectsReply === 'boolean') {
        if (state.responsePlayed) {
          const decision = decide(event.expectsReply);
          return { ...decision, actions: ['clear_timeout', 'clear_answer_timeout', ...decision.actions] };
        }
        return { state: { ...state, expectsReply: event.expectsReply }, actions: [] };
      }
      if (event.kind === 'response_played') {
        if (typeof state.expectsReply === 'boolean') {
          const decision = decide(state.expectsReply);
          return { ...decision, actions: ['clear_answer_timeout', ...decision.actions] };
        }
        return { state: { phase: 'waiting_metadata', responsePlayed: true }, actions: ['clear_answer_timeout', 'arm_timeout'] };
      }
      if (event.kind === 'timeout' && state.phase === 'waiting_answer') {
        return { state: { phase: 'closing_call' }, actions: ['clear_answer_timeout', 'close_call'] };
      }
      if (event.kind === 'timeout' && state.phase === 'waiting_metadata') {
        return { state: { phase: 'closing_call' }, actions: ['clear_timeout', 'close_call'] };
      }
      return { state, actions: [] };
    }
    case 'signalling_listening':
      if (event.kind !== 'ready_cue_played') return { state, actions: [] };
      return state.reply
        ? { state: { phase: 'waiting_reply' }, actions: ['arm_timeout', 'enable_speech'] }
        : { state: { phase: 'listening' }, actions: ['enable_speech'] };
    case 'waiting_reply':
      if (event.kind === 'speech_started') {
        return { state: { phase: 'recording' }, actions: ['clear_timeout'] };
      }
      if (event.kind === 'timeout') {
        return { state: { phase: 'closing_call' }, actions: ['clear_timeout', 'close_call'] };
      }
      return { state, actions: [] };
    case 'closing_call':
      return { state, actions: [] };
  }
}

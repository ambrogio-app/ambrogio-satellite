import { describe, expect, it } from 'vitest';
import { advanceVoiceTurn, initialVoiceTurnState, type VoiceTurnEvent, type VoiceTurnState } from '../../src/domain/voice-turn.js';

function replay(events: VoiceTurnEvent[]): VoiceTurnState {
  return events.reduce((state, event) => advanceVoiceTurn(state, event).state, initialVoiceTurnState);
}

const start: VoiceTurnEvent[] = [
  { kind: 'wake_detected' }, { kind: 'call_opened' }, { kind: 'ready_cue_played' },
  { kind: 'speech_started' }, { kind: 'speech_ended' },
];

describe('voice turn policy', () => {
  it('opens a call only after the wake word', () => {
    expect(advanceVoiceTurn(initialVoiceTurnState, { kind: 'speech_started' }).actions).toEqual([]);
    expect(advanceVoiceTurn(initialVoiceTurnState, { kind: 'wake_detected' }))
      .toEqual({ state: { phase: 'opening_call' }, actions: ['open_call'] });
    expect(advanceVoiceTurn({ phase: 'opening_call' }, { kind: 'call_opened' }))
      .toEqual({ state: { phase: 'signalling_listening', reply: false }, actions: ['play_ready_cue'] });
    expect(advanceVoiceTurn({ phase: 'signalling_listening', reply: false }, { kind: 'ready_cue_played' }))
      .toEqual({ state: { phase: 'listening' }, actions: ['enable_speech'] });
  });

  it('closes after a played final answer, for either metadata order', () => {
    for (const answer of [
      [{ kind: 'assistant_message', expectsReply: false }, { kind: 'response_played' }],
      [{ kind: 'response_played' }, { kind: 'assistant_message', expectsReply: false }],
    ] as VoiceTurnEvent[][]) {
      const state = replay([...start, answer[0]!]);
      const result = advanceVoiceTurn(state, answer[1]!);
      expect(result.state.phase).toBe('closing_call');
      expect(result.actions).toContain('close_call');
    }
  });

  it('admits a reply without a second wake word after the answer is played', () => {
    const state = replay([...start,
      { kind: 'assistant_message', expectsReply: true }, { kind: 'response_played' },
    ]);
    expect(state.phase).toBe('signalling_listening');
    expect(advanceVoiceTurn(state, { kind: 'speech_started' }).actions).toEqual([]);
    const ready = advanceVoiceTurn(state, { kind: 'ready_cue_played' });
    expect(ready).toEqual({ state: { phase: 'waiting_reply' }, actions: ['arm_timeout', 'enable_speech'] });
    expect(advanceVoiceTurn(ready.state, { kind: 'speech_started' }))
      .toEqual({ state: { phase: 'recording' }, actions: ['clear_timeout'] });
  });

  it('turns a missing outcome after the request into the local recovery', () => {
    const state = replay(start);
    expect(state.phase).toBe('waiting_answer');
    expect(advanceVoiceTurn(state, { kind: 'timeout' }))
      .toEqual({ state: { phase: 'closing_call' }, actions: ['clear_answer_timeout', 'fail_interaction'] });
    const withOutcome = replay([...start, { kind: 'assistant_message', expectsReply: true }]);
    expect(advanceVoiceTurn(withOutcome, { kind: 'timeout' }).actions)
      .toEqual(['clear_answer_timeout', 'fail_interaction']);
  });

  it('never infers a reply from missing or invalid metadata', () => {
    const state = replay([...start,
      { kind: 'assistant_message', expectsReply: 'true' }, { kind: 'response_played' },
    ]);
    expect(state.phase).toBe('waiting_metadata');
    expect(advanceVoiceTurn(state, { kind: 'timeout' }))
      .toEqual({ state: { phase: 'closing_call' }, actions: ['clear_timeout', 'close_call'] });
  });
});

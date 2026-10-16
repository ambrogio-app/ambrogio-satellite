import type { DeadlineScheduler, ScheduledDeadline } from './deadline-scheduler.js';
import { advanceVoiceTurn, initialVoiceTurnState, type VoiceTurnEvent,
  type VoiceTurnState } from '../domain/voice-turn.js';

export type VoiceSessionPorts = Readonly<{
  openCall(): Promise<void>;
  closeCall(): Promise<void>;
  setSpeechEnabled(enabled: boolean): void;
  reportFailure(error: Error): Promise<void>;
}>;

/** External observations accepted by Application, independent of Domain events. */
export type VoiceSessionEvent =
  | Readonly<{ kind: 'wake_detected' }>
  | Readonly<{ kind: 'speech_started' }>
  | Readonly<{ kind: 'speech_ended' }>
  | Readonly<{ kind: 'assistant_message'; expectsReply: boolean | undefined }>
  | Readonly<{ kind: 'response_played' }>;

export type VoiceSessionStatus = Readonly<{
  acceptsWakeWord: boolean;
  acceptsSpeechEnd: boolean;
  interactionActive: boolean;
}>;

/** Coordinates one local interaction; all backend and device work stays in ports. */
export class VoiceSession {
  private current: VoiceTurnState = initialVoiceTurnState;
  private replyTimer?: ScheduledDeadline;
  private answerTimer?: ScheduledDeadline;
  private generation = 0;
  private failureInProgress = false;

  constructor(
    private readonly ports: VoiceSessionPorts,
    private readonly replyTimeoutMs: number,
    private readonly answerTimeoutMs: number,
    private readonly deadlines: DeadlineScheduler,
  ) {
    if (!Number.isSafeInteger(replyTimeoutMs) || replyTimeoutMs <= 0
      || !Number.isSafeInteger(answerTimeoutMs) || answerTimeoutMs <= 0) {
      throw new Error('Invalid voice session timeout');
    }
  }

  get status(): VoiceSessionStatus {
    return {
      acceptsWakeWord: this.current.phase === 'waiting_wake_word',
      acceptsSpeechEnd: this.current.phase === 'recording',
      interactionActive: this.current.phase !== 'waiting_wake_word' && this.current.phase !== 'closing_call',
    };
  }

  dispatch(event: VoiceSessionEvent): void {
    switch (event.kind) {
      case 'wake_detected': this.applyEvent({ kind: 'wake_detected' }); break;
      case 'speech_started': this.applyEvent({ kind: 'speech_started' }); break;
      case 'speech_ended': this.applyEvent({ kind: 'speech_ended' }); break;
      case 'assistant_message':
        this.applyEvent({ kind: 'assistant_message', expectsReply: event.expectsReply }); break;
      case 'response_played': this.applyEvent({ kind: 'response_played' }); break;
      default: { const unexpected: never = event; throw new Error('Unsupported session event', { cause: unexpected }); }
    }
  }

  private applyEvent(event: VoiceTurnEvent): void {
    if (this.failureInProgress) return;
    const transition = advanceVoiceTurn(this.current, event);
    this.current = transition.state;
    for (const action of transition.actions) {
      switch (action) {
        case 'open_call': {
          const generation = ++this.generation;
          void this.ports.openCall().then(() => {
            if (generation === this.generation) this.applyEvent({ kind: 'call_opened' });
          }, error => { if (generation === this.generation) void this.fail(error); });
          break;
        }
        case 'close_call': {
          const generation = ++this.generation;
          void this.ports.closeCall().then(() => {
            if (generation === this.generation) this.applyEvent({ kind: 'call_closed' });
          }, error => { if (generation === this.generation) void this.fail(error); });
          break;
        }
        case 'arm_timeout':
          this.clearReplyTimer();
          this.replyTimer = this.deadlines.schedule(this.replyTimeoutMs, () => this.applyEvent({ kind: 'timeout' }));
          break;
        case 'clear_timeout': this.clearReplyTimer(); break;
        case 'arm_answer_timeout':
          this.clearAnswerTimer();
          this.answerTimer = this.deadlines.schedule(this.answerTimeoutMs, () => this.applyEvent({ kind: 'timeout' }));
          break;
        case 'clear_answer_timeout': this.clearAnswerTimer(); break;
        case 'enable_speech': this.ports.setSpeechEnabled(true); break;
        case 'disable_speech': this.ports.setSpeechEnabled(false); break;
      }
    }
  }

  /** Connection and device errors have one diagnostic boundary in the adapter. */
  async fail(error: unknown): Promise<void> {
    if (this.failureInProgress) return;
    this.failureInProgress = true;
    this.generation++;
    this.clearReplyTimer();
    this.clearAnswerTimer();
    this.current = { phase: 'closing_call' };
    const cause = error instanceof Error ? error : new Error(String(error));
    try { await this.ports.closeCall(); }
    catch { /* The original failure remains the useful diagnostic. */ }
    try { await this.ports.reportFailure(cause); }
    finally {
      this.current = initialVoiceTurnState;
      this.failureInProgress = false;
    }
  }

  async stop(): Promise<void> {
    this.generation++;
    this.clearReplyTimer();
    this.clearAnswerTimer();
    this.current = { phase: 'closing_call' };
    await this.ports.closeCall();
    this.current = initialVoiceTurnState;
  }

  private clearReplyTimer(): void {
    this.replyTimer?.cancel();
    this.replyTimer = undefined;
  }

  private clearAnswerTimer(): void {
    this.answerTimer?.cancel();
    this.answerTimer = undefined;
  }
}

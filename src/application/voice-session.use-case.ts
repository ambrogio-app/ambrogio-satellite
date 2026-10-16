import type { DeadlineScheduler, ScheduledDeadline } from './deadline-scheduler.js';
import { advanceVoiceTurn, initialVoiceTurnState, type VoiceTurnEvent,
  type VoiceTurnState } from '../domain/voice-turn.js';

export type VoiceSessionPorts = Readonly<{
  openCall(): Promise<void>;
  closeCall(): Promise<void>;
  setSpeechEnabled(enabled: boolean): void;
  reportFailure(error: Error): Promise<void>;
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

  get state(): VoiceTurnState { return this.current; }

  dispatch(event: VoiceTurnEvent): void {
    if (this.failureInProgress) return;
    const transition = advanceVoiceTurn(this.current, event);
    this.current = transition.state;
    for (const action of transition.actions) {
      switch (action) {
        case 'open_call': {
          const generation = ++this.generation;
          void this.ports.openCall().then(() => {
            if (generation === this.generation) this.dispatch({ kind: 'call_opened' });
          }, error => { if (generation === this.generation) void this.fail(error); });
          break;
        }
        case 'close_call': {
          const generation = ++this.generation;
          void this.ports.closeCall().then(() => {
            if (generation === this.generation) this.dispatch({ kind: 'call_closed' });
          }, error => { if (generation === this.generation) void this.fail(error); });
          break;
        }
        case 'arm_timeout':
          this.clearReplyTimer();
          this.replyTimer = this.deadlines.schedule(this.replyTimeoutMs, () => this.dispatch({ kind: 'timeout' }));
          break;
        case 'clear_timeout': this.clearReplyTimer(); break;
        case 'arm_answer_timeout':
          this.clearAnswerTimer();
          this.answerTimer = this.deadlines.schedule(this.answerTimeoutMs, () => this.dispatch({ kind: 'timeout' }));
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

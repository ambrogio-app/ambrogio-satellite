/** Cancellation is idempotent and never exposes a runtime timer handle. */
export interface ScheduledDeadline {
  readonly cancel: () => void;
}

/** Schedules one future callback; cancellation before firing suppresses it. */
export interface DeadlineScheduler {
  readonly schedule: (delayMs: number, callback: () => void) => ScheduledDeadline;
}

/** Cancellation is idempotent and never exposes a runtime timer handle. */
export type ScheduledDeadline = Readonly<{ cancel(): void }>;

/** Schedules one future callback; cancellation before firing suppresses it. */
export interface DeadlineScheduler {
  schedule(delayMs: number, callback: () => void): ScheduledDeadline;
}

import type { DeadlineScheduler, ScheduledDeadline } from '../../src/application/deadline-scheduler.port.js';

export class ManualDeadlines implements DeadlineScheduler {
  private now = 0;
  private deadlines = new Set<{ at: number; callback(): void }>();
  get pending(): number { return this.deadlines.size; }
  schedule(delayMs: number, callback: () => void): ScheduledDeadline {
    const deadline = { at: this.now + delayMs, callback };
    this.deadlines.add(deadline);
    return { cancel: () => { this.deadlines.delete(deadline); } };
  }
  advanceBy(ms: number): void {
    const until = this.now + ms;
    for (;;) {
      const next = [...this.deadlines].filter(d => d.at <= until).sort((a, b) => a.at - b.at)[0];
      if (!next) break;
      this.now = next.at;
      this.deadlines.delete(next);
      next.callback();
    }
    this.now = until;
  }
}

import { setTimeout, clearTimeout } from 'node:timers';
import type { DeadlineScheduler, ScheduledDeadline } from '../../application/deadline-scheduler.port.js';

export class NodeDeadlineScheduler implements DeadlineScheduler {
  schedule(delayMs: number, callback: () => void): ScheduledDeadline {
    let active = true;
    const timer = setTimeout(() => {
      if (!active) return;
      active = false;
      callback();
    }, delayMs);
    return { cancel() {
      if (!active) return;
      active = false;
      clearTimeout(timer);
    } };
  }
}

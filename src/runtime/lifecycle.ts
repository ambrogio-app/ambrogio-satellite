import { LifecycleError, ProjectError } from './project-error.js';

/** The closings of the resources owned by a composition root, registered right after each acquisition. */
export type ResourceStack = Readonly<{
  /** Register the closing of a resource just acquired; `failureMessage` names the resource. */
  defer(failureMessage: string, close: () => unknown): void;
  /** Close every resource once, in reverse order of acquisition; repeated calls share the same closing. */
  close(): Promise<void>;
  /** Faults observed so far, also while the closing is still pending. */
  readonly faults: readonly unknown[];
}>;

/** The single fault itself, or every fault in a `LifecycleError`; nothing when there is none. */
export function faultOutcome(message: string, faults: readonly unknown[]): unknown {
  return faults.length === 1 ? faults[0] : faults.length > 1 ? new LifecycleError(message, faults) : undefined;
}

/** The startup failure unchanged, or with the cleanup faults that followed it. */
export function combineFaults(message: string, primary: unknown, cleanup: readonly unknown[]): unknown {
  return cleanup.length === 0 ? primary : new LifecycleError(message, [primary, ...cleanup]);
}

export function createResourceStack(failureMessage = 'Satellite shutdown failed'): ResourceStack {
  const closings: Array<Readonly<{ message: string; close: () => unknown }>> = [];
  const faults: unknown[] = [];
  let closing: Promise<void> | undefined;
  return {
    defer(message, close) { closings.push({ message, close }); },
    faults,
    close() {
      closing ??= (async () => {
        while (closings.length > 0) {
          const { message, close } = closings.pop()!;
          try { await close(); }
          catch (error) { faults.push(new ProjectError(message, { cause: error })); }
        }
        const outcome = faultOutcome(failureMessage, faults);
        if (outcome !== undefined) throw outcome;
      })();
      return closing;
    },
  };
}

/** An error created by satellite code: its type, message and stack may be logged. */
export class ProjectError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ProjectError';
  }
}

/** Independent faults of the process lifecycle, kept by identity in the order they were observed. */
export class LifecycleError extends ProjectError {
  readonly faults: readonly unknown[];

  constructor(message: string, faults: readonly unknown[]) {
    super(message);
    this.name = 'LifecycleError';
    this.faults = Object.freeze([...faults]);
  }
}

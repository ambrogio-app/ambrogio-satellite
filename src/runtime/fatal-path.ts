import { writeSync } from 'node:fs';

type FatalTarget = Readonly<{
  on(event: 'uncaughtException' | 'unhandledRejection', listener: () => void): unknown;
  exit(code: number): never | void;
}>;

/**
 * The fatal path: an error that escapes every controlled boundary, including an unhandled rejection, writes
 * one fixed line to stderr without reading the raised value and ends the process with 1.
 */
export function installFatalPath(message: string, target: FatalTarget = process): void {
  const fatal = () => {
    try { writeSync(2, `${message}\n`); } catch { /* the exit must happen anyway */ }
    target.exit(1);
  };
  target.on('uncaughtException', fatal);
  target.on('unhandledRejection', fatal);
}

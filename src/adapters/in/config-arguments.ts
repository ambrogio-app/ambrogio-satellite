export type InvalidArguments = Readonly<{ kind: 'invalid_arguments' }>;
export type ConfigArguments = Readonly<{ filename: string }>;

/** The configuration path is explicit and never taken from environment variables. */
export function parseConfigArguments(args: readonly string[]):
  Readonly<{ ok: true; value: ConfigArguments }> | Readonly<{ ok: false; error: InvalidArguments }> {
  if (args.length !== 2 || args[0] !== '--config' || !args[1]?.trim() || args[1].startsWith('--')) {
    return { ok: false, error: { kind: 'invalid_arguments' } };
  }
  return { ok: true, value: { filename: args[1] } };
}

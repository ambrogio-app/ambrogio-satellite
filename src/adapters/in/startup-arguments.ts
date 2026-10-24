export type InvalidArguments = Readonly<{ kind: 'invalid_arguments' }>;

/** The satellite takes no startup arguments: its configuration comes only from environment variables. */
export function parseStartupArguments(args: readonly string[]):
  Readonly<{ ok: true }> | Readonly<{ ok: false; error: InvalidArguments }> {
  return args.length === 0 ? { ok: true } : { ok: false, error: { kind: 'invalid_arguments' } };
}

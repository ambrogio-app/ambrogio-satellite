import { describe, expect, it } from 'vitest';
import { parseStartupArguments } from './startup-arguments.js';

describe('startup arguments', () => {
  it('accepts a start without arguments', () => {
    expect(parseStartupArguments([])).toEqual({ ok: true });
  });

  it.each([[['--config', '/etc/ambrogio/satellite.ts']], [['satellite.ts']], [['--config']], [['--debug']]])
  ('rejects any argument %j', args => {
    expect(parseStartupArguments(args)).toEqual({ ok: false, error: { kind: 'invalid_arguments' } });
  });
});

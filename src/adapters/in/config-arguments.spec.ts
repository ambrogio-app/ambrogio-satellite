import { describe, expect, it } from 'vitest';
import { parseConfigArguments } from './config-arguments.js';

describe('configuration CLI option', () => {
  it('requires one explicit --config path', () => {
    expect(parseConfigArguments(['--config', '/etc/ambrogio/satellite.ts']))
      .toEqual({ ok: true, value: { filename: '/etc/ambrogio/satellite.ts' } });
  });

  it.each([[[]], [['satellite.ts']], [['--config']], [['--config', '']],
    [['--config', '--debug']], [['--config', 'one.ts', '--config', 'two.ts']]])
  ('rejects invalid arguments', args => {
    expect(parseConfigArguments(args)).toEqual({ ok: false, error: { kind: 'invalid_arguments' } });
  });
});

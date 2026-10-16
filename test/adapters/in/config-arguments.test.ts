import { describe, expect, it } from 'vitest';
import { parseConfigArguments } from '../../../src/adapters/in/config-arguments.js';

describe('configuration CLI option', () => {
  it('requires one explicit --config path', () => {
    expect(parseConfigArguments(['--config', '/etc/ambrogio/satellite.json']))
      .toEqual({ ok: true, value: { filename: '/etc/ambrogio/satellite.json' } });
  });

  it.each([[[]], [['satellite.json']], [['--config']], [['--config', '']],
    [['--config', '--debug']], [['--config', 'one.json', '--config', 'two.json']]])
  ('rejects invalid arguments', args => {
    expect(parseConfigArguments(args)).toEqual({ ok: false, error: { kind: 'invalid_arguments' } });
  });
});

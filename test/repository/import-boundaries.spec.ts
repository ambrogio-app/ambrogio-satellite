import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  analyse, describeViolation, exceptions, repositoryWorkspace, ruleNames, workspaceOf, type ArchitectureException,
  type RuleName,
} from './architecture-rules.js';
import { readSpecifiers } from './import-specifiers.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const tracked = execFileSync('git', ['-C', root, 'ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean);
const workspace = repositoryWorkspace(root);
const filesOf = (prefix: string) => workspace.files.filter(path => path.startsWith(prefix));

/** One negative fixture per rule: a small in-memory workspace that breaks only that rule. */
const negativeFixtures: Record<RuleName, Readonly<Record<string, string>>> = {
  'production-layer-classification': { 'src/helpers/format.ts': 'export const format = (text: string) => text;\n' },
  'core-layer-imports': {
    'src/domain/turn.ts': "import type { ParsedPath } from 'node:path';\nexport type Turn = { path: ParsedPath };\n",
  },
  'composition-root-assembly': {
    'src/application/voice-session.use-case.ts': 'export class VoiceSession {}\n',
    'src/adapters/in/wake-word.adapter.ts':
      "import { VoiceSession } from '../../application/voice-session.use-case.js';\nexport const session = new VoiceSession();\n",
  },
  'layer-test-imports': {
    'src/application/voice-session.use-case.ts': 'export class VoiceSession {}\n',
    'src/domain/voice-turn.ts': 'export type VoiceTurn = Readonly<{ phase: string }>;\n',
    'src/domain/voice-turn.spec.ts':
      "import type { VoiceSession } from '../application/voice-session.use-case.js';\nexport type Seen = VoiceSession;\n",
    'src/domain/missing.spec.ts': 'export {};\n',
    'test/domain/voice-turn.test.ts': 'export {};\n',
    'src/adapters/out/ready-cue.ts': 'export const cue = 1;\n',
    'src/adapters/out/response-playback.ts': "import { cue } from './ready-cue.js';\nexport const play = () => cue;\n",
    'src/adapters/out/sherpa-speech-detector.ts': 'export const vad = 1;\n',
    'src/adapters/out/response-playback.spec.ts':
      "import { play } from './response-playback.js';\nimport { cue } from './ready-cue.js';\nimport { vad } from './sherpa-speech-detector.js';\nexport const seen = [play, cue, vad];\n",
  },
  'technical-factory-imports': {
    'src/application/voice-session.use-case.ts': 'export class VoiceSession {}\n',
    'src/runtime/satellite-process.ts':
      "import type { VoiceSession } from '../application/voice-session.use-case.js';\nexport type Seen = VoiceSession;\n",
  },
  'no-dependency-container': {
    'test/support/container.ts': "import { createContainer } from 'awilix';\nexport const container = createContainer();\n",
  },
  'pino-only-in-logger': {
    'src/adapters/out/diagnostics.ts': "import pino from 'pino';\nexport const logger = pino();\n",
  },
  'no-backend-imports': {
    'src/composition/satellite.ts': "import { reply } from '@ambrogio/conversations/application';\nexport { reply };\n",
  },
};

describe('central architecture rules', () => {
  it('reads the self-check sample exactly', () => {
    const sample = readFileSync(new URL('./import-sample.txt', import.meta.url), 'utf8');
    expect(readSpecifiers(sample)).toEqual([
      { specifier: './value.js', typeOnly: false },
      { specifier: './only-type.js', typeOnly: true },
      { specifier: './all-types.js', typeOnly: true },
      { specifier: './mixed.js', typeOnly: false },
      { specifier: './multi-line.js', typeOnly: false },
      { specifier: 'node:path', typeOnly: false },
      { specifier: './side-effect.js', typeOnly: false },
      { specifier: './reexport.js', typeOnly: false },
      { specifier: './reexport-type.js', typeOnly: true },
      { specifier: './star.js', typeOnly: false },
      { specifier: './dynamic.js', typeOnly: false },
      { specifier: '<computed>', typeOnly: false },
      { specifier: './required.js', typeOnly: false },
    ]);
  });

  it('analyses the whole import graph of src and test, type-only imports included', () => {
    expect(workspace.imports.length).toBeGreaterThan(workspace.files.length);
    expect(workspace.imports.some(edge => edge.typeOnly)).toBe(true);
    for (const layerPrefix of ['src/domain/', 'src/application/', 'src/adapters/in/', 'src/adapters/out/',
      'src/composition/', 'test/repository/', 'test/support/']) {
      expect(filesOf(layerPrefix).length, layerPrefix).toBeGreaterThan(0);
    }
    for (const layerPrefix of ['src/domain/', 'src/application/', 'src/adapters/in/', 'src/adapters/out/']) {
      expect(filesOf(layerPrefix).filter(path => path.endsWith('.spec.ts')).length, layerPrefix).toBeGreaterThan(0);
    }
    for (const edge of workspace.imports.filter(edge => edge.target)) {
      expect(workspace.files, `${edge.from} -> ${edge.specifier}`).toContain(edge.target);
    }
  });

  it('finds no violation of any rule in the repository', () => {
    expect(analyse(workspace).map(describeViolation)).toEqual([]);
  });

  it.each(ruleNames)('fails the negative fixture of %s with the rule name', rule => {
    const violations = analyse(workspaceOf(negativeFixtures[rule], ['pino']), []);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations.map(violation => violation.rule)).toEqual(violations.map(() => rule));
  });

  it('lists every exception with an existing rule, an import, a reason, and a matching violation', () => {
    const unexcepted = analyse(workspace, []);
    for (const exception of exceptions) {
      expect(ruleNames).toContain(exception.rule);
      expect(exception.from).toMatch(/^(src|test)\/.+\.ts$/);
      expect(exception.specifier.length).toBeGreaterThan(0);
      expect(exception.reason.trim().length).toBeGreaterThan(20);
      expect(unexcepted.filter(violation => violation.rule === exception.rule && violation.from === exception.from
        && violation.specifier === exception.specifier), JSON.stringify(exception)).toHaveLength(1);
    }
  });

  it('lets an exception suppress only its own violation', () => {
    const fixture = workspaceOf({
      'src/domain/a.ts': "import 'node:fs';\n",
      'src/domain/b.ts': "import 'node:fs';\n",
    });
    const exception: ArchitectureException = {
      rule: 'core-layer-imports', from: 'src/domain/a.ts', specifier: 'node:fs', reason: 'Fixture exception for one file only.',
    };
    expect(analyse(fixture, []).map(violation => violation.from)).toEqual(['src/domain/a.ts', 'src/domain/b.ts']);
    expect(analyse(fixture, [exception]).map(violation => violation.from)).toEqual(['src/domain/b.ts']);
    expect(analyse(fixture, [{ ...exception, rule: 'composition-root-assembly' }])).toHaveLength(2);
  });
});

describe('single project', () => {
  it('tracks one package manifest without workspaces', () => {
    expect(tracked.filter(path => path.split('/').at(-1) === 'package.json')).toEqual(['package.json']);
    const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    expect(manifest).not.toHaveProperty('workspaces');
    expect(readFileSync(join(root, 'pnpm-workspace.yaml'), 'utf8')).not.toMatch(/^packages:/m);
    expect(tracked).toContain('pnpm-workspace.yaml');
  });
});

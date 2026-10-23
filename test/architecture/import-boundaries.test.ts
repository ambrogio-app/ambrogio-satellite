import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../', import.meta.url));
const tracked = execFileSync('git', ['-C', root, 'ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean);
const sources = tracked.filter(path => /^(src|test)\/.*\.ts$/.test(path));

type Specifier = Readonly<{ specifier: string; typeOnly: boolean }>;
type Import = Readonly<{ from: string; specifier: string; target?: string; typeOnly: boolean }>;

/**
 * Reads import specifiers as text. Comments are removed and every string or template literal becomes a
 * numbered token first, so text inside comments and strings never looks like an import.
 */
function readSpecifiers(source: string): Specifier[] {
  const literals: string[] = [];
  let code = '';
  for (let index = 0; index < source.length;) {
    const char = source[index]!;
    const next = source[index + 1];
    if (char === '/' && next === '/') {
      while (index < source.length && source[index] !== '\n') index++;
    } else if (char === '/' && next === '*') {
      const close = source.indexOf('*/', index + 2);
      index = close < 0 ? source.length : close + 2;
      code += ' ';
    } else if (char === "'" || char === '"' || char === '`') {
      let end = index + 1;
      while (end < source.length && source[end] !== char) end += source[end] === '\\' ? 2 : 1;
      literals.push(char === '`' ? '<computed>' : source.slice(index + 1, end));
      code += `"#${literals.length - 1}"`;
      index = end + 1;
    } else {
      code += char;
      index++;
    }
  }
  const literal = (token: string) => literals[Number(token)]!;
  const found: Array<Specifier & { at: number }> = [];
  for (const match of code.matchAll(/\b(import|export)\s+(type\s+)?([^";]*?)\bfrom\s*"#(\d+)"/g)) {
    const [, keyword, typeKeyword, clause] = match;
    const named = /^\{([^}]*)\}$/.exec(clause!.trim());
    const elements = named?.[1]!.split(',').map(element => element.trim()).filter(Boolean) ?? [];
    const allTypes = elements.length > 0 && elements.every(element => element.startsWith('type '));
    found.push({ at: match.index, specifier: literal(match[4]!),
      typeOnly: !!typeKeyword || (keyword === 'import' && allTypes) || (keyword === 'export' && allTypes) });
  }
  for (const match of code.matchAll(/\bimport\s*"#(\d+)"/g)) {
    found.push({ at: match.index, specifier: literal(match[1]!), typeOnly: false });
  }
  for (const match of code.matchAll(/\bimport\s*\(\s*(?:"#(\d+)"\s*)?/g)) {
    found.push({ at: match.index, specifier: match[1] === undefined ? '<computed>' : literal(match[1]), typeOnly: false });
  }
  return found.sort((a, b) => a.at - b.at).map(({ specifier, typeOnly }) => ({ specifier, typeOnly }));
}

let imports: Import[] = [];

function collect(): void {
  imports = sources.flatMap(path => readSpecifiers(readFileSync(join(root, path), 'utf8')).map(({ specifier, typeOnly }) => ({
    from: path, specifier, typeOnly,
    target: specifier.startsWith('.') ? normalize(join(dirname(path), specifier)).replace(/\.js$/, '.ts') : undefined,
  })));
}

/** Production layer of a file under `src`. */
function layer(path: string): string {
  if (path === 'src/main.ts') return 'main';
  const match = /^src\/(domain|application|composition|runtime|adapters\/in|adapters\/out)\//.exec(path);
  if (!match) throw new Error(`Unclassified production file ${path}`);
  return match[1]!;
}
const production = (from: string) => imports.filter(entry => entry.from === from && entry.target?.startsWith('src/'));
const filesOf = (prefix: string) => sources.filter(path => path.startsWith(prefix));

beforeAll(collect);

describe('import boundaries', () => {
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
    ]);
  });

  it('finds layer files and resolves every relative import inside the repository', () => {
    expect(imports.length).toBeGreaterThan(sources.length);
    for (const layerPrefix of ['src/domain/', 'src/application/', 'src/adapters/in/', 'src/adapters/out/',
      'src/composition/', 'test/domain/', 'test/application/', 'test/adapters/in/', 'test/adapters/out/']) {
      expect(filesOf(layerPrefix).length, layerPrefix).toBeGreaterThan(0);
    }
    for (const entry of imports.filter(entry => entry.target)) {
      expect(tracked, `${entry.from} -> ${entry.specifier}`).toContain(entry.target);
    }
  });

  it('keeps Domain and Application free of other layers and of every external or node: module', () => {
    for (const path of [...filesOf('src/domain/'), ...filesOf('src/application/')]) {
      const allowed = path.startsWith('src/domain/') ? ['domain'] : ['domain', 'application'];
      for (const entry of imports.filter(entry => entry.from === path)) {
        expect(entry.target, `${path} imports ${entry.specifier}`).toBeDefined();
        expect(allowed, `${path} imports ${entry.specifier}`).toContain(layer(entry.target!));
      }
    }
  });

  it('assembles use cases and adapters only in the composition root', () => {
    for (const entry of imports.filter(entry => entry.from.startsWith('src/') && !entry.typeOnly && entry.target)) {
      if (/\.(use-case|adapter)\.ts$/.test(entry.target!)) {
        expect(layer(entry.from), `${entry.from} imports ${entry.specifier}`).toBe('composition');
      }
    }
  });

  it('limits the production imports of each layer test', () => {
    const rules: ReadonlyArray<readonly [string, readonly string[]]> = [
      ['test/domain/', ['domain']],
      ['test/application/', ['domain', 'application']],
      ['test/adapters/in/', ['adapters/in', 'application']],
      ['test/adapters/out/', ['adapters/out', 'application', 'domain']],
    ];
    for (const [prefix, allowed] of rules) {
      for (const path of filesOf(prefix)) {
        for (const entry of production(path)) {
          expect(allowed, `${path} imports ${entry.specifier}`).toContain(layer(entry.target!));
          if (prefix === 'test/adapters/in/' && layer(entry.target!) === 'adapters/in') {
            const name = path.slice(prefix.length).replace(/\.test\.ts$/, '');
            expect([`src/adapters/in/${name}.ts`, `src/adapters/in/${name}.adapter.ts`],
              `${path} imports ${entry.specifier}`).toContain(entry.target);
          }
        }
      }
    }
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

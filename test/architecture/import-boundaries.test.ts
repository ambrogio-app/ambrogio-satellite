import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Node, SyntaxKind } from 'typescript/unstable/ast';
import { API } from 'typescript/unstable/sync';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../', import.meta.url));
const tracked = execFileSync('git', ['-C', root, 'ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean);
const sources = tracked.filter(path => /^(src|test)\/.*\.ts$/.test(path));

type Import = Readonly<{ from: string; specifier: string; target?: string; typeOnly: boolean }>;
let imports: Import[] = [];
let read: string[] = [];

/** Reads every import, export, dynamic import and import type with the TypeScript 7 compiler API. */
function collect(): void {
  const api = new API({ cwd: root });
  try {
    const [project] = api.updateSnapshot({ openProject: join(root, 'tsconfig.json') }).getProjects();
    if (!project) throw new Error('tsconfig.json was not loaded');
    for (const path of sources) {
      const file = project.program.getSourceFile(join(root, path));
      if (!file) continue;
      read.push(path);
      const add = (specifier: string, typeOnly: boolean) => {
        const target = specifier.startsWith('.')
          ? normalize(join(dirname(path), specifier)).replace(/\.js$/, '.ts') : undefined;
        imports.push({ from: path, specifier, target, typeOnly });
      };
      const visit = (node: Node): void => {
        const any = node as any;
        if (node.kind === SyntaxKind.ImportDeclaration) {
          const clause = any.importClause;
          const named = clause?.namedBindings?.kind === SyntaxKind.NamedImports ? clause.namedBindings.elements : undefined;
          const typeOnly = clause?.phaseModifier === SyntaxKind.TypeKeyword || clause?.isTypeOnly === true
            || (!!named && !clause.name && named.length > 0 && named.every((element: any) => element.isTypeOnly));
          add(any.moduleSpecifier.text, typeOnly);
        } else if (node.kind === SyntaxKind.ExportDeclaration && any.moduleSpecifier) {
          add(any.moduleSpecifier.text, any.isTypeOnly === true);
        } else if (node.kind === SyntaxKind.CallExpression && any.expression.kind === SyntaxKind.ImportKeyword) {
          const argument = any.arguments[0];
          // A computed specifier, such as the configuration module chosen at run time, has no layer.
          add(argument?.kind === SyntaxKind.StringLiteral ? argument.text : '<computed>', false);
        } else if (node.kind === SyntaxKind.ImportType) {
          add(any.argument.literal.text, true);
        } else if (node.kind === SyntaxKind.ImportEqualsDeclaration
          && any.moduleReference.kind === SyntaxKind.ExternalModuleReference) {
          add(any.moduleReference.expression.text, false);
        }
        node.forEachChild(visit);
      };
      file.forEachChild(visit);
    }
  } finally { api.close(); }
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

beforeAll(collect, 60_000);
afterAll(() => { imports = []; read = []; });

describe('import boundaries', () => {
  it('reads every tracked TypeScript file and resolves every relative import inside the repository', () => {
    expect(read).toEqual(sources);
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
    expect(relative(root, join(root, 'pnpm-workspace.yaml'))).toBe('pnpm-workspace.yaml');
  });
});

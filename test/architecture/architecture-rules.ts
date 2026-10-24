// Central source of the blocking architecture rules of the satellite («Regole di architettura del satellite»).
// Every rule has a stable name and runs over the whole import graph of `src` and `test`, type-only imports
// included; an exception is an explicit entry of `exceptions`, recorded with its reason in the model.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { dirname, join, normalize } from 'node:path';
import { readSpecifiers } from './import-specifiers.js';

export type ImportEdge = Readonly<{ from: string; specifier: string; target?: string; typeOnly: boolean }>;

/** The files under analysis, their imports and the runtime dependencies declared by the manifest. */
export type Workspace = Readonly<{ files: readonly string[]; imports: readonly ImportEdge[]; dependencies: readonly string[] }>;

export type Violation = Readonly<{ rule: RuleName; from: string; specifier: string; message: string }>;

export type ArchitectureException = Readonly<{ rule: RuleName; from: string; specifier: string; reason: string }>;

/** Resolve the imports of a source text; relative specifiers become repository paths of `.ts` files. */
export function importsOf(path: string, source: string): ImportEdge[] {
  return readSpecifiers(source).map(({ specifier, typeOnly }) => ({
    from: path, specifier, typeOnly,
    ...(specifier.startsWith('.')
      ? { target: normalize(join(dirname(path), specifier)).split('\\').join('/').replace(/\.js$/, '.ts') }
      : {}),
  }));
}

/** A workspace built from in-memory sources: the negative fixtures use it. */
export function workspaceOf(sources: Readonly<Record<string, string>>, dependencies: readonly string[] = []): Workspace {
  const files = Object.keys(sources).sort();
  return { files, imports: files.flatMap(path => importsOf(path, sources[path]!)), dependencies };
}

/** The TypeScript files of `src` and `test` seen by Git (tracked, or new and not ignored). */
export function repositoryWorkspace(root: string): Workspace {
  const listed = execFileSync('git', ['-C', root, 'ls-files', '--cached', '--others', '--exclude-standard'],
    { encoding: 'utf8' }).split('\n').filter(path => /^(src|test)\/.*\.ts$/.test(path));
  const sources = Object.fromEntries([...new Set(listed)].map(path => [path, readFileSync(join(root, path), 'utf8')]));
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { dependencies?: Record<string, string> };
  return workspaceOf(sources, Object.keys(manifest.dependencies ?? {}));
}

/** Production layer of a file under `src`, or undefined when the file is in no known layer. */
export function layerOf(path: string): string | undefined {
  if (path === 'src/main.ts') return 'main';
  return /^src\/(domain|application|composition|runtime|adapters\/in|adapters\/out)\//.exec(path)?.[1];
}

const production = (edge: ImportEdge) => edge.target !== undefined && edge.target.startsWith('src/');

/** Package name of a bare specifier: `@scope/name/sub` -> `@scope/name`, `name/sub` -> `name`. */
function packageName(specifier: string): string {
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]!;
}

/** Why a production specifier would reach code outside the satellite, or undefined when it stays inside. */
export function backendReach(from: string, specifier: string, dependencies: readonly string[]): string | undefined {
  if (specifier === '<computed>') return 'is a computed import that cannot be resolved';
  if (/ambrogio-backend/.test(specifier)) return 'names the ambrogio-backend repository';
  if (/^@ambrogio\//.test(specifier)) return 'names a package of the backend';
  if (specifier.startsWith('/') || /^file:/.test(specifier)) return 'is an absolute path';
  if (specifier.startsWith('.')) {
    const target = normalize(join(dirname(from), specifier)).split('\\').join('/');
    if (target.startsWith('..')) return `resolves outside the repository (${target})`;
    if (!target.startsWith('src/')) return `resolves outside src (${target})`;
    return undefined;
  }
  if (specifier.startsWith('node:') || builtinModules.includes(specifier)) return undefined;
  if (dependencies.includes(packageName(specifier))) return undefined;
  return 'is not a Node.js module or a runtime dependency of the satellite';
}

const testLayers: ReadonlyArray<readonly [string, readonly string[]]> = [
  ['test/domain/', ['domain']],
  ['test/application/', ['domain', 'application']],
  ['test/adapters/in/', ['adapters/in', 'application']],
  ['test/adapters/out/', ['adapters/out', 'application', 'domain']],
];

type Finding = Readonly<{ from: string; specifier: string; message: string }>;
type Rule = (workspace: Workspace) => Finding[];

/** The rules, by stable name. Renaming a rule is a change of «Regole di architettura del satellite». */
export const rules = {
  /** Every production file belongs to a known layer. */
  'production-layer-classification': ({ files }) => files
    .filter(path => path.startsWith('src/') && layerOf(path) === undefined)
    .map(path => ({ from: path, specifier: '', message: 'is in no known production layer' })),

  /** Domain imports only Domain, Application only Domain and Application: no other layer, package or node: module. */
  'core-layer-imports': ({ imports }) => imports.flatMap(edge => {
    const layer = layerOf(edge.from);
    if (layer !== 'domain' && layer !== 'application') return [];
    const allowed = layer === 'domain' ? ['domain'] : ['domain', 'application'];
    const target = edge.target === undefined ? undefined : layerOf(edge.target);
    return target !== undefined && allowed.includes(target) ? []
      : [{ from: edge.from, specifier: edge.specifier, message: `${layer} may import only ${allowed.join(' and ')}` }];
  }),

  /** Only the composition root imports use cases and adapters as values. */
  'composition-root-assembly': ({ imports }) => imports
    .filter(edge => edge.from.startsWith('src/') && !edge.typeOnly && edge.target !== undefined
      && /\.(use-case|adapter)\.ts$/.test(edge.target) && layerOf(edge.from) !== 'composition')
    .map(edge => ({ from: edge.from, specifier: edge.specifier, message: 'only the composition root assembles use cases and adapters' })),

  /** Domain, Application, inbound and outbound adapter tests import only the production layers allowed to them. */
  'layer-test-imports': ({ imports }) => imports.flatMap(edge => {
    const kind = testLayers.find(([prefix]) => edge.from.startsWith(prefix));
    if (kind === undefined || !production(edge)) return [];
    const [prefix, allowed] = kind;
    const target = layerOf(edge.target!);
    if (target === undefined || !allowed.includes(target)) {
      return [{ from: edge.from, specifier: edge.specifier, message: `${prefix} tests may import only ${allowed.join(', ')}` }];
    }
    if (prefix === 'test/adapters/in/' && target === 'adapters/in') {
      const name = edge.from.slice(prefix.length).replace(/\.test\.ts$/, '');
      if (![`src/adapters/in/${name}.ts`, `src/adapters/in/${name}.adapter.ts`].includes(edge.target!)) {
        return [{ from: edge.from, specifier: edge.specifier, message: 'an inbound adapter test imports only its own adapter' }];
      }
    }
    return [];
  }),

  /** Production code stays inside the satellite and its runtime dependencies: no backend code. */
  'no-backend-imports': ({ imports, dependencies }) => imports.flatMap(edge => {
    if (!edge.from.startsWith('src/')) return [];
    const reason = backendReach(edge.from, edge.specifier, dependencies);
    return reason === undefined ? [] : [{ from: edge.from, specifier: edge.specifier, message: reason }];
  }),
} satisfies Record<string, Rule>;

export type RuleName = keyof typeof rules;
export const ruleNames = Object.keys(rules) as RuleName[];

/** Accepted violations, each recorded with its reason in «Regole di architettura del satellite». */
export const exceptions: readonly ArchitectureException[] = [
  {
    rule: 'no-backend-imports',
    from: 'src/adapters/out/config-file.ts',
    specifier: '<computed>',
    reason: 'The configuration loader imports the configuration module of the installation, chosen at start-up; it is not backend code.',
  },
];

const excepted = (violation: Violation, list: readonly ArchitectureException[]) => list.some(exception =>
  exception.rule === violation.rule && exception.from === violation.from && exception.specifier === violation.specifier);

/** Every violation of every rule, minus the listed exceptions. */
export function analyse(workspace: Workspace, list: readonly ArchitectureException[] = exceptions): Violation[] {
  return ruleNames.flatMap(rule => (rules[rule] as Rule)(workspace).map(finding => ({ rule, ...finding })))
    .filter(violation => !excepted(violation, list));
}

export const describeViolation = (violation: Violation) =>
  `[${violation.rule}] ${violation.from}${violation.specifier ? ` -> ${violation.specifier}` : ''}: ${violation.message}`;

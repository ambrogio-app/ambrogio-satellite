import { readFile, rename, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const dist = dirname(require.resolve('@micdrop/client'));
const packageInfo = JSON.parse(await readFile(join(dist, '..', 'package.json'), 'utf8'));
if (packageInfo.version !== '3.4.0') {
  throw new Error(`Micdrop patch expects 3.4.0, found ${packageInfo.version}`);
}

const files = await Promise.all(['index.js', 'index.mjs'].map(async name => {
  const filename = join(dist, name);
  const source = await readFile(filename, 'utf8');
  const occurrences = source.match(/this\.ws\?\.send\(/g)?.length ?? 0;
  if (occurrences !== 5) throw new Error(`Unexpected Micdrop send sites in ${name}: ${occurrences}`);

  let patched = 0;
  const output = source.split('\n').map(line => {
    if (!line.includes('this.ws?.send(')) return line;
    if (line.includes('this.isWSStarted && this.ws?.send(')) {
      patched++;
      return line;
    }
    const next = line.replace('this.ws?.send(', 'this.isWSStarted && this.ws?.send(');
    if (next !== line) patched++;
    return next;
  }).join('\n');
  if (patched !== 5) throw new Error(`Unexpected Micdrop guards in ${name}: ${patched}`);
  return { filename, source, output };
}));

for (const { filename, source, output } of files) {
  if (source === output) continue;
  const temporary = `${filename}.ambrogio-${process.pid}.tmp`;
  await writeFile(temporary, output);
  await rename(temporary, filename);
}

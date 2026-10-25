// Verification: Prova dei modelli sherpa-onnx registrati
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

// «Modelli sherpa-onnx distribuiti con il satellite»: the files and SHA-256 hashes recorded in the model are the
// files the satellite distributes and the ones its provenance note lists.
const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (path: string) => readFileSync(join(root, path), 'utf8');

/** The `file → hash` pairs of the Markdown table rows that start with a file of `kws/` or `vad/`. */
function tableFiles(markdown: string): Map<string, string> {
  const rows = markdown.matchAll(/^\| `((?:kws|vad)\/[^`]+)` \|(?:.*\|)? `([0-9a-f]{64})` \|$/gm);
  return new Map([...rows].map(([, file, hash]) => [file!, hash!]));
}

function sourceElement(): string {
  const contracts = read('system-model/Contracts/ExternalContracts.md');
  const start = contracts.indexOf('### Modelli sherpa-onnx distribuiti con il satellite\n');
  expect(start).toBeGreaterThanOrEqual(0);
  return contracts.slice(start, contracts.indexOf('\n---', start));
}

/** Every distributed model file, without the license texts. */
function distributedFiles(): Map<string, string> {
  return new Map(['kws', 'vad'].flatMap(folder => readdirSync(join(root, 'models', folder))
    .filter(file => file !== 'LICENSE')
    .map(file => [`${folder}/${file}`,
      createHash('sha256').update(readFileSync(join(root, 'models', folder, file))).digest('hex')] as const)));
}

test('the recorded speech models match the distributed files and the provenance note', () => {
  const recorded = tableFiles(sourceElement());
  expect(recorded.size).toBe(6);
  expect(distributedFiles()).toEqual(recorded);
  expect(tableFiles(read('models/README.md'))).toEqual(recorded);
});

test('each model folder carries the text of its license', () => {
  expect(read('models/kws/LICENSE')).toContain('Apache License');
  expect(read('models/vad/LICENSE')).toContain('MIT License');
});

// Verification: Prova dei modelli openWakeWord registrati
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

// «Modelli openWakeWord distribuiti»: the files and SHA-256 hashes recorded in the model are the files the
// satellite distributes and the ones its provenance note lists.
const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (path: string) => readFileSync(join(root, path), 'utf8');

/** The `file → hash` pairs of the Markdown table rows that start with an ONNX file name. */
function tableFiles(markdown: string): Map<string, string> {
  const rows = markdown.matchAll(/^\| `([^`]+\.onnx)` \|(?:.*\|)? `([0-9a-f]{64})` \|$/gm);
  return new Map([...rows].map(([, file, hash]) => [file!, hash!]));
}

function sourceElement(): string {
  const contracts = read('system-model/Contracts/ExternalContracts.md');
  const start = contracts.indexOf('### Modelli openWakeWord distribuiti\n');
  expect(start).toBeGreaterThanOrEqual(0);
  return contracts.slice(start, contracts.indexOf('\n---', start));
}

function distributedFiles(): Map<string, string> {
  const directory = join(root, 'models/wakeword');
  return new Map(readdirSync(directory).filter(file => file.endsWith('.onnx')).map(file =>
    [file, createHash('sha256').update(readFileSync(join(directory, file))).digest('hex')]));
}

test('the recorded wake word models match the distributed files and the provenance note', () => {
  const recorded = tableFiles(sourceElement());
  expect(recorded.size).toBe(5);
  expect(distributedFiles()).toEqual(recorded);
  expect(tableFiles(read('models/wakeword/README.md'))).toEqual(recorded);
});

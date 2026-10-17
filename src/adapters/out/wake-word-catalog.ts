import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { WakeWordModelFiles } from './onnx-wake-word.js';

const directory = fileURLToPath(new URL('../../../models/wakeword/', import.meta.url));
const builtInFiles = {
  alexa: 'alexa_v0.1.onnx',
  hey_jarvis: 'hey_jarvis_v0.1.onnx',
  hey_mycroft: 'hey_mycroft_v0.1.onnx',
} as const;
const sharedFiles = ['melspectrogram.onnx', 'embedding_model.onnx'] as const;
const safeId = /^[a-z0-9][a-z0-9_-]*$/;
const reservedIds = new Set(['melspectrogram', 'embedding_model']);

export type DistributedWakeWord = keyof typeof builtInFiles;
export const distributedWakeWordIds: ReadonlySet<string> = new Set(Object.keys(builtInFiles));

export function isWakeWordId(id: string): boolean {
  return safeId.test(id) && !reservedIds.has(id);
}

export function availableWakeWordIds(modelDirectory = directory): ReadonlySet<string> {
  let files: Set<string>;
  try {
    files = new Set(readdirSync(modelDirectory, { withFileTypes: true })
      .filter(entry => entry.isFile()).map(entry => entry.name));
  } catch { return new Set(); }
  if (!sharedFiles.every(file => files.has(file))) return new Set();

  const ids = new Set<string>();
  for (const [id, filename] of Object.entries(builtInFiles)) {
    if (files.has(filename)) ids.add(id);
  }
  for (const filename of files) {
    if (!filename.endsWith('.onnx')) continue;
    const id = filename.slice(0, -'.onnx'.length);
    if (isWakeWordId(id) && !distributedWakeWordIds.has(id)) ids.add(id);
  }
  return ids;
}

export function wakeWordFiles(id: string, modelDirectory = directory): WakeWordModelFiles {
  if (!isWakeWordId(id)) throw new Error('Invalid wake word model identifier');
  const builtIn = Object.hasOwn(builtInFiles, id) ? builtInFiles[id as DistributedWakeWord] : undefined;
  return {
    mel: join(modelDirectory, sharedFiles[0]),
    embedding: join(modelDirectory, sharedFiles[1]),
    classifier: join(modelDirectory, builtIn ?? `${id}.onnx`),
  };
}

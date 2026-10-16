import { fileURLToPath } from 'node:url';
import type { WakeWordModelFiles } from './onnx-wake-word.js';

const root = new URL('../../../models/wakeword/', import.meta.url);
const shared = {
  mel: fileURLToPath(new URL('melspectrogram.onnx', root)),
  embedding: fileURLToPath(new URL('embedding_model.onnx', root)),
};

const models = {
  hey_jarvis: { ...shared, classifier: fileURLToPath(new URL('hey_jarvis_v0.1.onnx', root)) },
  hey_mycroft: { ...shared, classifier: fileURLToPath(new URL('hey_mycroft_v0.1.onnx', root)) },
} satisfies Record<string, WakeWordModelFiles>;

export type DistributedWakeWord = keyof typeof models;
export const distributedWakeWordIds: ReadonlySet<string> = new Set(Object.keys(models));

export function wakeWordFiles(id: DistributedWakeWord): WakeWordModelFiles {
  return models[id];
}

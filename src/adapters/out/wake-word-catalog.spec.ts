import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { availableWakeWordIds, wakeWordFiles } from './wake-word-catalog.js';

describe('mounted wake word catalog', () => {
  it('discovers a compatible classifier by its safe filename with the shared resources present', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'ambrogio-wake-catalog-'));
    try {
      await writeFile(join(directory, 'personalizzato.onnx'), 'classifier');
      expect([...availableWakeWordIds(directory)]).toEqual([]);
      await writeFile(join(directory, 'melspectrogram.onnx'), 'shared');
      await writeFile(join(directory, 'embedding_model.onnx'), 'shared');
      await writeFile(join(directory, 'Upper.onnx'), 'ignored');
      expect([...availableWakeWordIds(directory)]).toEqual(['personalizzato']);
      expect(wakeWordFiles('personalizzato', directory).classifier).toBe(join(directory, 'personalizzato.onnx'));
    } finally { await rm(directory, { recursive: true, force: true }); }
  });

  it('keeps built-in identifiers and rejects traversal or common-model names', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'ambrogio-wake-catalog-'));
    try {
      for (const name of ['melspectrogram.onnx', 'embedding_model.onnx', 'alexa_v0.1.onnx']) {
        await writeFile(join(directory, name), 'model');
      }
      expect([...availableWakeWordIds(directory)]).toEqual(['alexa']);
      expect(wakeWordFiles('alexa', directory).classifier).toBe(join(directory, 'alexa_v0.1.onnx'));
      expect(() => wakeWordFiles('../outside', directory)).toThrow('Invalid wake word model identifier');
      expect(() => wakeWordFiles('melspectrogram', directory)).toThrow('Invalid wake word model identifier');
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
});

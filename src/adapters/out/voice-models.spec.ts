// Verification: Prova del modello di keyword spotting montato
import { copyFileSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { installedWakeWordVocabulary, KEYWORD_SPOTTING_DIRECTORY, keywordSpotterFiles, readableFile, VAD_MODEL,
  wakeWordVocabulary } from './voice-models.js';

const made: string[] = [];
afterEach(() => { for (const directory of made.splice(0)) rmSync(directory, { recursive: true, force: true }); });

/** A copy of the distributed model directory, as an installation would mount it. */
function mountedCopy(change?: (directory: string) => void): string {
  const directory = mkdtempSync(join(tmpdir(), 'satellite-kws-'));
  made.push(directory);
  for (const file of readdirSync(KEYWORD_SPOTTING_DIRECTORY)) copyFileSync(join(KEYWORD_SPOTTING_DIRECTORY, file), join(directory, file));
  change?.(directory);
  return directory;
}

describe('keyword spotting model files', () => {
  it('finds the distributed files and the same files in a mounted copy', () => {
    const files = keywordSpotterFiles();
    expect(files.encoder).toMatch(/\/encoder-[^/]*\.onnx$/);
    expect(files.decoder).toMatch(/\/decoder-[^/]*\.onnx$/);
    expect(files.joiner).toMatch(/\/joiner-[^/]*\.onnx$/);
    const mounted = mountedCopy();
    expect(keywordSpotterFiles(mounted).encoder.startsWith(mounted)).toBe(true);
  });

  it('rejects a directory without bpe.model or with two encoders', () => {
    expect(() => keywordSpotterFiles(mountedCopy(d => rmSync(join(d, 'bpe.model'))))).toThrow();
    expect(() => keywordSpotterFiles(mountedCopy(d => writeFileSync(join(d, 'encoder-second.onnx'), 'x')))).toThrow();
    expect(() => keywordSpotterFiles(mountedCopy(d => { for (const f of readdirSync(d)) if (f.startsWith('joiner')) rmSync(join(d, f)); })))
      .toThrow();
  });

  it('checks that the speech detection model is a readable file', () => {
    expect(() => readableFile(VAD_MODEL)).not.toThrow();
    expect(() => readableFile(join(KEYWORD_SPOTTING_DIRECTORY, 'missing.onnx'))).toThrow();
    expect(() => readableFile(KEYWORD_SPOTTING_DIRECTORY)).toThrow();
  });
});

describe('wake word vocabulary', () => {
  it('splits the default wake word and refuses text that is not accepted', () => {
    const vocabulary = installedWakeWordVocabulary();
    expect(vocabulary?.tokens('Alexa')).toEqual(['▁A', 'LE', 'X', 'A']);
    expect(vocabulary?.tokens('Alexa  ')).toBeUndefined();
  });

  it('refuses a wake word with a token missing from tokens.txt', () => {
    const directory = mountedCopy(d => writeFileSync(join(d, 'tokens.txt'), '<blk> 0\n▁A 1\nLE 2\nX 3\n'));
    const vocabulary = wakeWordVocabulary(keywordSpotterFiles(directory));
    expect(vocabulary.tokens('Alexa')).toBeUndefined();
  });

  it('is unavailable when the model directory cannot be read', () => {
    expect(installedWakeWordVocabulary(mountedCopy(d => rmSync(join(d, 'bpe.model'))))).toBeUndefined();
  });
});

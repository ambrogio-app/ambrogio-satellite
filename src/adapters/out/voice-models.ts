import { accessSync, constants, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { KeywordTokenizer } from './keyword-tokens.js';

/** The keyword spotting model directory: distributed with the satellite, replaceable with a mount. */
export const KEYWORD_SPOTTING_DIRECTORY = fileURLToPath(new URL('../../../models/kws/', import.meta.url));
/** The Silero model used for speech detection. */
export const VAD_MODEL = fileURLToPath(new URL('../../../models/vad/silero_vad.onnx', import.meta.url));

export type KeywordSpotterFiles = Readonly<{
  encoder: string;
  decoder: string;
  joiner: string;
  tokens: string;
  bpeModel: string;
}>;

/** A readable regular file, checked before a native library opens it. */
export function readableFile(path: string): void {
  if (!statSync(path).isFile()) throw new Error('Model file is not a regular file');
  accessSync(path, constants.R_OK);
}

function only(files: readonly string[], prefix: string): string {
  const matches = files.filter(file => file.startsWith(prefix) && file.endsWith('.onnx'));
  if (matches.length !== 1) throw new Error(`Expected exactly one ${prefix} model`);
  return matches[0]!;
}

/** Exactly one `encoder*.onnx`, `decoder*.onnx` and `joiner*.onnx`, plus `tokens.txt` and `bpe.model`, all readable. */
export function keywordSpotterFiles(directory = KEYWORD_SPOTTING_DIRECTORY): KeywordSpotterFiles {
  const files = readdirSync(directory, { withFileTypes: true }).filter(entry => entry.isFile()).map(entry => entry.name);
  const found = {
    encoder: join(directory, only(files, 'encoder')),
    decoder: join(directory, only(files, 'decoder')),
    joiner: join(directory, only(files, 'joiner')),
    tokens: join(directory, 'tokens.txt'),
    bpeModel: join(directory, 'bpe.model'),
  };
  for (const path of Object.values(found)) readableFile(path);
  return found;
}

/** The tokens of `tokens.txt`: the first field of every non-empty line. */
function modelTokens(path: string): ReadonlySet<string> {
  return new Set(readFileSync(path, 'utf8').split('\n').map(line => line.trim().split(/\s+/)[0] ?? '').filter(Boolean));
}

/** Splits a wake word into model tokens: `undefined` when the text is not accepted or a token is unknown. */
export type WakeWordVocabulary = Readonly<{ tokens(text: string): readonly string[] | undefined }>;

/**
 * The vocabulary of a keyword spotting model. sherpa-onnx ends the process when a keyword has a token missing
 * from `tokens.txt`, so every token is checked here.
 */
export function wakeWordVocabulary(files: Pick<KeywordSpotterFiles, 'tokens' | 'bpeModel'>): WakeWordVocabulary {
  const tokenizer = KeywordTokenizer.fromModelFile(files.bpeModel);
  const known = modelTokens(files.tokens);
  return {
    tokens(text) {
      const tokens = tokenizer.tokens(text);
      return tokens?.every(token => known.has(token)) ? tokens : undefined;
    },
  };
}

/** The vocabulary of the configured model, or `undefined` when its files cannot be read: loading then fails. */
export function installedWakeWordVocabulary(directory = KEYWORD_SPOTTING_DIRECTORY): WakeWordVocabulary | undefined {
  try { return wakeWordVocabulary(keywordSpotterFiles(directory)); }
  catch { return undefined; }
}

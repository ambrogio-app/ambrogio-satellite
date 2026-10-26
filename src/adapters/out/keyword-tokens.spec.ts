// Verification: Prova del modello di keyword spotting montato
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { isWakeWordText, KeywordTokenizer, MAX_WAKE_WORD_LENGTH, readSentencePieces } from './keyword-tokens.js';

const bpeModel = fileURLToPath(new URL('../../../models/kws/bpe.model', import.meta.url));

describe('wake word text', () => {
  it.each(['Alexa', 'Hey Siri', "Don't stop", 'a'.repeat(MAX_WAKE_WORD_LENGTH)])('accepts %j', text => {
    expect(isWakeWordText(text)).toBe(true);
  });

  it.each(['', ' Alexa', 'Alexa ', 'Hey  Siri', 'Città', 'Alexa!', 'R2D2', "'quoted'", 'a'.repeat(MAX_WAKE_WORD_LENGTH + 1)])(
    'rejects %j', text => { expect(isWakeWordText(text)).toBe(false); });
});

describe('SentencePiece unigram tokenizer', () => {
  const tokenizer = KeywordTokenizer.fromModelFile(bpeModel);

  // The keyword examples distributed with the model, as tokenized by its authors.
  it.each([
    ['Alexa', '▁A LE X A'],
    ['Hello world', '▁HE LL O ▁WORLD'],
    ['Hi Google', '▁HI ▁GO O G LE'],
    ['Hey Siri', '▁HE Y ▁S I RI'],
    ['Love and peace', '▁LOVE ▁AND ▁P E A CE'],
    ['Play music', '▁PLAY ▁MU S IC'],
    ['Go home', '▁GO ▁HOME'],
    ['Happy new year', '▁HA PP Y ▁NEW ▁YEAR'],
  ])('splits %j as the model examples', (text, tokens) => {
    expect(tokenizer.tokens(text)?.join(' ')).toBe(tokens);
  });

  it('ignores the case of the text', () => {
    expect(tokenizer.tokens('aLeXa')).toEqual(tokenizer.tokens('ALEXA'));
  });

  it('returns nothing for text that is not accepted or has no pieces', () => {
    expect(tokenizer.tokens('Hey  Siri')).toBeUndefined();
    expect(new KeywordTokenizer([{ piece: '▁A', score: -1 }]).tokens('Ab')).toBeUndefined();
  });

  it('chooses the split with the highest total score', () => {
    const pieces = [{ piece: '▁AB', score: -5 }, { piece: '▁A', score: -1 }, { piece: 'B', score: -1 }];
    expect(new KeywordTokenizer(pieces).tokens('ab')).toEqual(['▁A', 'B']);
    expect(new KeywordTokenizer(pieces.map(p => p.piece === '▁AB' ? { ...p, score: -1.5 } : p)).tokens('ab')).toEqual(['▁AB']);
  });

  it('reads every piece of the model and rejects a truncated file', () => {
    const bytes = readFileSync(bpeModel);
    expect(readSentencePieces(bytes)).toHaveLength(500);
    expect(() => readSentencePieces(bytes.subarray(0, 25))).toThrow();
  });
});

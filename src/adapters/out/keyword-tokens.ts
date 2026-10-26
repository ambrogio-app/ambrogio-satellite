import { readFileSync } from 'node:fs';

/** One SentencePiece piece and its log-probability score. */
type Piece = Readonly<{ piece: string; score: number }>;

/** The longest wake word accepted by the configuration. */
export const MAX_WAKE_WORD_LENGTH = 64;
const wakeWordShape = /^[A-Za-z]+(?:'[A-Za-z]+)*(?: [A-Za-z]+(?:'[A-Za-z]+)*)*$/;
const WORD_START = '▁';

/** Words of ASCII letters with inner apostrophes, separated by single spaces, at most 64 characters. */
export function isWakeWordText(text: string): boolean {
  return text.length <= MAX_WAKE_WORD_LENGTH && wakeWordShape.test(text);
}

function varint(bytes: Uint8Array, cursor: { at: number }): number {
  let value = 0;
  let factor = 1;
  for (;;) {
    if (cursor.at >= bytes.length) throw new Error('Truncated SentencePiece model');
    const byte = bytes[cursor.at++]!;
    value += (byte & 0x7f) * factor;
    if ((byte & 0x80) === 0) return value;
    factor *= 128;
  }
}

function skip(bytes: Uint8Array, cursor: { at: number }, wire: number): void {
  if (wire === 0) varint(bytes, cursor);
  else if (wire === 1) cursor.at += 8;
  else if (wire === 2) { const size = varint(bytes, cursor); cursor.at += size; }
  else if (wire === 5) cursor.at += 4;
  else throw new Error('Unsupported SentencePiece model field');
  if (cursor.at > bytes.length) throw new Error('Truncated SentencePiece model');
}

/** The pieces of a SentencePiece `ModelProto`: field 1, each with `piece` (1) and `score` (2). */
export function readSentencePieces(bytes: Uint8Array): Piece[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const pieces: Piece[] = [];
  const cursor = { at: 0 };
  while (cursor.at < bytes.length) {
    const key = varint(bytes, cursor);
    const field = Math.floor(key / 8);
    const wire = key % 8;
    if (field !== 1 || wire !== 2) { skip(bytes, cursor, wire); continue; }
    const size = varint(bytes, cursor);
    const end = cursor.at + size;
    if (end > bytes.length) throw new Error('Truncated SentencePiece model');
    let piece = '';
    let score = 0;
    while (cursor.at < end) {
      const innerKey = varint(bytes, cursor);
      const innerField = Math.floor(innerKey / 8);
      const innerWire = innerKey % 8;
      if (innerField === 1 && innerWire === 2) {
        const length = varint(bytes, cursor);
        piece = new TextDecoder().decode(bytes.subarray(cursor.at, cursor.at + length));
        cursor.at += length;
      } else if (innerField === 2 && innerWire === 5) {
        score = view.getFloat32(cursor.at, true);
        cursor.at += 4;
      } else skip(bytes, cursor, innerWire);
    }
    if (cursor.at !== end) throw new Error('Malformed SentencePiece piece');
    pieces.push({ piece, score });
  }
  if (pieces.length === 0) throw new Error('SentencePiece model without pieces');
  return pieces;
}

/** Splits text into the pieces of a SentencePiece unigram vocabulary with the highest total score. */
export class KeywordTokenizer {
  private readonly scores = new Map<string, number>();
  private readonly longest: number;

  constructor(pieces: readonly Piece[]) {
    for (const { piece, score } of pieces) if (piece) this.scores.set(piece, score);
    this.longest = Math.max(...[...this.scores.keys()].map(piece => [...piece].length));
  }

  static fromModelFile(path: string): KeywordTokenizer {
    return new KeywordTokenizer(readSentencePieces(readFileSync(path)));
  }

  /** The tokens of an accepted wake word, or `undefined` when a character has no piece. */
  tokens(text: string): string[] | undefined {
    if (!isWakeWordText(text)) return undefined;
    const symbols = [...text.toUpperCase().split(' ').map(word => WORD_START + word).join('')];
    const best: Array<{ score: number; from: number } | undefined> = [{ score: 0, from: -1 }];
    for (let end = 1; end <= symbols.length; end++) {
      for (let start = Math.max(0, end - this.longest); start < end; start++) {
        const previous = best[start];
        if (!previous) continue;
        const score = this.scores.get(symbols.slice(start, end).join(''));
        if (score === undefined) continue;
        const total = previous.score + score;
        if (!best[end] || total > best[end]!.score) best[end] = { score: total, from: start };
      }
    }
    if (!best[symbols.length]) return undefined;
    const tokens: string[] = [];
    for (let end = symbols.length; end > 0;) {
      const from = best[end]!.from;
      tokens.unshift(symbols.slice(from, end).join(''));
      end = from;
    }
    return tokens;
  }
}

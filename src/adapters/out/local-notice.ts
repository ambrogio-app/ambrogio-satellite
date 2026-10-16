import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const NOTICE_FILE = fileURLToPath(new URL('../../../assets/backend-unavailable.wav', import.meta.url));

/** WAV is a bundled, known-format asset, but validate its header before playback. */
export async function noticeSamples(): Promise<Int16Array> {
  const wav = await readFile(NOTICE_FILE);
  if (wav.toString('ascii', 0, 4) !== 'RIFF' || wav.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('Invalid local notice WAV');
  }
  let offset = 12;
  let formatOk = false;
  let audio: Buffer | undefined;
  while (offset + 8 <= wav.length) {
    const kind = wav.toString('ascii', offset, offset + 4);
    const length = wav.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (start + length > wav.length) throw new Error('Truncated local notice WAV');
    if (kind === 'fmt ' && length >= 16) {
      formatOk = wav.readUInt16LE(start) === 1 && wav.readUInt16LE(start + 2) === 1
        && wav.readUInt32LE(start + 4) === 16_000 && wav.readUInt16LE(start + 14) === 16;
    }
    if (kind === 'data') audio = wav.subarray(start, start + length);
    offset = start + length + (length % 2);
  }
  if (!formatOk || !audio || audio.length === 0 || audio.length % 2 !== 0) {
    throw new Error('Unsupported local notice WAV');
  }
  const samples = new Int16Array(audio.length / 2);
  for (let i = 0; i < samples.length; i++) samples[i] = audio.readInt16LE(i * 2);
  return samples;
}

import { Microphone, Speaker, type MicrophoneOptions, type SpeakerOptions } from 'decibri';

const SAMPLE_RATE = 16_000;

function selectedDevice(selector?: string): Pick<MicrophoneOptions, 'device'> {
  if (selector === undefined) return {};
  return { device: selector.startsWith('alsa:') ? { id: selector } : selector };
}

/** The caller owns the returned stream and must stop it when capture ends. */
export function openConfiguredMicrophone(selector?: string): Promise<Microphone> {
  return Microphone.open({
    sampleRate: SAMPLE_RATE,
    channels: 1,
    dtype: 'float32',
    ...selectedDevice(selector),
  });
}

function openConfiguredSpeaker(selector?: string, sampleRate = SAMPLE_RATE): Promise<Speaker> {
  const options: SpeakerOptions = {
    sampleRate,
    channels: 1,
    dtype: 'int16',
    ...selectedDevice(selector),
  };
  return Speaker.open(options);
}

/** Resolves only after every PCM16 mono chunk has finished playing at `sampleRate`. */
export async function playPcm16(chunks: AsyncIterable<Int16Array>, selector?: string, signal?: AbortSignal,
  sampleRate = SAMPLE_RATE): Promise<void> {
  if (signal?.aborted) return;
  const speaker = await openConfiguredSpeaker(selector, sampleRate);
  let stopped = false;
  let stopError: unknown;
  let playbackError: unknown;
  let playbackFailed = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    try { speaker.stop(); } catch (error) { stopError = error; }
  };
  let cancelled!: () => void;
  const cancellation = new Promise<void>(resolve => { cancelled = resolve; });
  const abort = () => { stop(); cancelled(); };
  signal?.addEventListener('abort', abort, { once: true });
  try {
    if (signal?.aborted) return;
    for await (const chunk of chunks) {
      if (signal?.aborted) return;
      const bytes = Buffer.from(new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength));
      await Promise.race([speaker.writeAsync(bytes), cancellation]);
    }
    if (!signal?.aborted) await Promise.race([speaker.drainAsync(), cancellation]);
  } catch (error) {
    playbackError = error;
    playbackFailed = true;
    throw error;
  } finally {
    signal?.removeEventListener('abort', abort);
    stop();
    if (stopError) {
      if (playbackFailed) throw new AggregateError([playbackError, stopError], 'Playback and release failed', { cause: playbackError });
      throw stopError;
    }
  }
}

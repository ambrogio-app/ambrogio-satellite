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

function openConfiguredSpeaker(selector?: string): Promise<Speaker> {
  const options: SpeakerOptions = {
    sampleRate: SAMPLE_RATE,
    channels: 1,
    dtype: 'int16',
    ...selectedDevice(selector),
  };
  return Speaker.open(options);
}

/** Resolves only after every PCM16 mono chunk has finished playing. */
export async function playPcm16(chunks: AsyncIterable<Int16Array>, selector?: string): Promise<void> {
  const speaker = await openConfiguredSpeaker(selector);
  try {
    for await (const chunk of chunks) {
      const bytes = Buffer.from(new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength));
      await speaker.writeAsync(bytes);
    }
    await speaker.drainAsync();
  } finally {
    speaker.stop();
  }
}

import type { Microphone } from 'decibri';
import { openConfiguredMicrophone } from './decibri-audio.js';

/** The continuously open microphone; frames are float32 mono at 16 kHz. */
export class MicrophoneInput {
  private microphone?: Microphone;
  private closing?: Promise<void>;

  constructor(private readonly selector?: string) {}

  async start(frames: (samples: Float32Array) => void, failed: (error: unknown) => void): Promise<void> {
    if (this.closing || this.microphone) return;
    const microphone = await openConfiguredMicrophone(this.selector);
    if (this.closing) { microphone.stop(); return; }
    this.microphone = microphone;
    microphone.on('data', (chunk: Buffer) => {
      if (this.microphone !== microphone) return;
      if (chunk.byteLength % Float32Array.BYTES_PER_ELEMENT !== 0) {
        failed(new Error('Decibri returned an incomplete float32 frame'));
        return;
      }
      const samples = new Float32Array(chunk.byteLength / Float32Array.BYTES_PER_ELEMENT);
      new Uint8Array(samples.buffer).set(chunk);
      frames(samples);
    });
    microphone.on('error', error => { if (this.microphone === microphone) failed(error); });
  }

  close(): Promise<void> {
    return this.closing ??= (async () => {
      const microphone = this.microphone;
      this.microphone = undefined;
      microphone?.stop();
    })();
  }
}

import { MicDriver, SpeakerDriver, type MicdropDevice } from '@micdrop/client';
import { Microphone, Speaker } from 'decibri';
import { openConfiguredMicrophone } from './decibri-audio.js';

const SAMPLE_RATE = 16_000;

function devices(items: ReadonlyArray<{ id: string; name: string }>, kind: MicdropDevice['kind']): MicdropDevice[] {
  return items.map(item => ({ id: item.id, label: item.name, kind }));
}

function speakerOptions(selector?: string): Parameters<typeof Speaker.open>[0] {
  return {
    sampleRate: SAMPLE_RATE,
    channels: 1,
    dtype: 'int16',
    ...(selector === undefined ? {} : {
      device: selector.startsWith('alsa:') ? { id: selector } : selector,
    }),
  };
}

export class DecibriMicDriver extends MicDriver {
  private microphone?: Microphone;

  constructor(private readonly selector?: string) { super(); }

  get isStarted(): boolean { return this.microphone !== undefined; }
  get deviceId(): string | undefined { return this.selector; }
  get echoCancellation(): boolean { return false; }

  async getDevices(): Promise<MicdropDevice[]> {
    return devices(Microphone.devices(), 'audioinput');
  }

  async start(deviceId?: string): Promise<void> {
    if (this.microphone) return;
    const mic = await openConfiguredMicrophone(this.selector ?? deviceId);
    this.microphone = mic;
    mic.on('data', chunk => {
      if (this.microphone !== mic) return;
      if (chunk.byteLength % Float32Array.BYTES_PER_ELEMENT !== 0) {
        this.emit('Error', new Error('Decibri returned an incomplete float32 frame'));
        return;
      }
      const samples = new Float32Array(chunk.byteLength / Float32Array.BYTES_PER_ELEMENT);
      new Uint8Array(samples.buffer).set(chunk);
      this.emit('Frames', samples, SAMPLE_RATE);
    });
    mic.on('error', error => { if (this.microphone === mic) this.emit('Error', error); });
  }

  async stop(): Promise<void> {
    const mic = this.microphone;
    this.microphone = undefined;
    mic?.stop();
  }
}

export class DecibriSpeakerDriver extends SpeakerDriver {
  private speaker?: Speaker;
  private tail: Promise<void> = Promise.resolve();
  private pending = 0;
  private playing = false;
  private generation = 0;

  constructor(private selector?: string, private readonly onFailure?: (error: Error) => void) { super(); }

  get isPlaying(): boolean { return this.playing; }
  get deviceId(): string | undefined { return this.selector; }

  async getDevices(): Promise<MicdropDevice[]> {
    return devices(Speaker.devices(), 'audiooutput');
  }

  async start(): Promise<void> {
    // Opening at the first chunk avoids leaving an idle ALSA output open.
  }

  async changeDevice(deviceId: string): Promise<void> {
    this.stopAudio();
    this.selector = deviceId;
  }

  play(pcm: Int16Array, sampleRate: number): void {
    if (sampleRate !== SAMPLE_RATE) {
      this.onFailure?.(new Error(`Unsupported playback sample rate: ${sampleRate}`));
      return;
    }
    const generation = this.generation;
    const bytes = Buffer.from(new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength));
    this.pending++;
    if (!this.playing) {
      this.playing = true;
      this.emit('StartPlaying');
    }
    this.tail = this.tail.then(async () => {
      if (generation !== this.generation) return;
      const speaker = await this.ensureSpeaker(generation);
      if (!speaker || generation !== this.generation) return;
      await speaker.writeAsync(bytes);
      if (generation !== this.generation) return;
      this.pending--;
      if (this.pending > 0) return;
      await speaker.drainAsync();
      if (generation !== this.generation || this.pending > 0) return;
      speaker.stop();
      if (this.speaker === speaker) this.speaker = undefined;
      this.playing = false;
      this.emit('StopPlaying');
    }).catch(error => {
      if (generation !== this.generation) return;
      this.stopAudio();
      this.onFailure?.(error instanceof Error ? error : new Error(String(error)));
    });
  }

  private async ensureSpeaker(generation: number): Promise<Speaker | undefined> {
    if (this.speaker) return this.speaker;
    const speaker = await Speaker.open(speakerOptions(this.selector));
    if (generation !== this.generation) {
      speaker.stop();
      return undefined;
    }
    speaker.on('error', error => {
      if (this.speaker !== speaker) return;
      this.stopAudio();
      this.onFailure?.(error);
    });
    this.speaker = speaker;
    return speaker;
  }

  stopAudio(): void {
    this.generation++;
    this.pending = 0;
    this.tail = Promise.resolve();
    this.speaker?.stop();
    this.speaker = undefined;
    if (this.playing) {
      this.playing = false;
      this.emit('StopPlaying');
    }
  }

  async stop(): Promise<void> { this.stopAudio(); }
}

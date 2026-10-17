import { playPcm16 } from './decibri-audio.js';

/** Ordered PCM16 chunks of one transmission; iteration ends once the transmission ends. */
class ChunkQueue implements AsyncIterable<Int16Array> {
  private readonly items: Int16Array[] = [];
  private ended = false;
  private wake?: () => void;

  push(samples: Int16Array): void {
    if (this.ended) return;
    this.items.push(samples);
    this.wake?.();
  }

  end(): void {
    this.ended = true;
    this.wake?.();
  }

  async *[Symbol.asyncIterator](): AsyncIterator<Int16Array> {
    for (;;) {
      if (this.items.length) { yield this.items.shift()!; continue; }
      if (this.ended) return;
      await new Promise<void>(resolve => { this.wake = resolve; });
      this.wake = undefined;
    }
  }
}

export type PlaybackContent = Readonly<{ type: 'audio'; sampleRate: number }> | Readonly<{ type: 'text' }>;

/**
 * Plays the transmissions of a turn one after the other. A text-only transmission, which the
 * satellite cannot speak, is replaced by the local voice-unavailable notice.
 */
export class ResponsePlayback {
  private tail: Promise<void> = Promise.resolve();
  private controller = new AbortController();
  private readonly queues = new Map<number, ChunkQueue>();

  constructor(private readonly options: Readonly<{
    speaker?: string;
    voiceUnavailable: Int16Array;
    failed(error: unknown): void;
  }>) {}

  start(stream: number, content: PlaybackContent): void {
    const queue = new ChunkQueue();
    const { signal } = this.controller;
    let sampleRate = 16_000;
    if (content.type === 'audio') {
      this.queues.set(stream, queue);
      sampleRate = content.sampleRate;
    } else {
      queue.push(this.options.voiceUnavailable);
      queue.end();
    }
    this.tail = this.tail.then(() => signal.aborted ? undefined
      : playPcm16(queue, this.options.speaker, signal, sampleRate).catch(error => {
        if (!signal.aborted) this.options.failed(error);
      }));
  }

  audio(stream: number, samples: Int16Array): void { this.queues.get(stream)?.push(samples); }

  end(stream: number): void {
    this.queues.get(stream)?.end();
    this.queues.delete(stream);
  }

  /** Resolves once every transmission started so far has been played to the end. */
  idle(): Promise<void> { return this.tail; }

  cancel(): void {
    this.controller.abort();
    this.controller = new AbortController();
    for (const queue of this.queues.values()) queue.end();
    this.queues.clear();
    this.tail = Promise.resolve();
  }
}

import { AmbrogioSession, type RequestEvents, type SessionIdentity } from './ambrogio-session.js';
import { toPcm16 } from './audio-reserve.js';

/** 60 seconds of 16 kHz audio, the backend limit of one request. */
export const MAX_REQUEST_SAMPLES = 60 * 16_000;

/**
 * The satellite's persistent session and its conversation rule: each activation starts a new
 * conversation, while replies continue the conversation of the previous turn.
 */
export class ConversationChannel {
  private session?: AmbrogioSession;
  private opening?: Promise<AmbrogioSession>;
  private conversationId?: string;
  private sentSamples = 0;
  private transmitting = false;
  private closed = false;

  constructor(private readonly options: Readonly<{
    url: URL;
    identity: SessionIdentity;
    /** The session closed while it was open. */
    lost(): void;
  }>) {}

  get isTransmitting(): boolean { return this.transmitting; }

  /** Reuse the open session or open a new one; rejects when the backend cannot be reached. */
  async ensure(): Promise<void> {
    if (this.closed) throw new Error('Conversation channel closed');
    if (this.session && !this.session.closed) return;
    this.opening ??= AmbrogioSession.open(this.options.url, this.options.identity).then(session => {
      if (this.closed) { session.close(); throw new Error('Conversation channel closed'); }
      this.session = session;
      session.onClose(() => {
        if (this.session !== session) return;
        this.session = undefined;
        this.transmitting = false;
        if (!this.closed) this.options.lost();
      });
      return session;
    }).finally(() => { this.opening = undefined; });
    await this.opening;
  }

  /** The next request starts a new conversation. */
  newConversation(): void { this.conversationId = undefined; }

  /** Open a request with the reserved audio that precedes the confirmed speech. */
  startRequest(reserve: Float32Array, events: RequestEvents): void {
    const session = this.session;
    if (!session || session.closed) throw new Error('Conversation session unavailable');
    session.startRequest(this.conversationId, { ...events, accepted: conversationId => {
      this.conversationId = conversationId;
      events.accepted(conversationId);
    } });
    this.transmitting = true;
    this.sentSamples = 0;
    this.send(reserve);
  }

  /** Send microphone frames; returns false once the request has reached the backend limit. */
  send(frames: Float32Array): boolean {
    if (!this.transmitting || !this.session) return false;
    const room = MAX_REQUEST_SAMPLES - this.sentSamples;
    const part = frames.length > room ? frames.subarray(0, room) : frames;
    this.session.sendAudio(toPcm16(part));
    this.sentSamples += part.length;
    return this.sentSamples < MAX_REQUEST_SAMPLES;
  }

  endRequest(): void {
    if (!this.transmitting) return;
    this.transmitting = false;
    this.session?.endRequest();
  }

  /** Stop following the current request, e.g. when the interaction ends locally. */
  forgetRequest(): void {
    this.transmitting = false;
    this.session?.forgetRequest();
  }

  async close(): Promise<void> {
    this.closed = true;
    this.transmitting = false;
    const session = this.session ?? await this.opening?.catch(() => undefined);
    this.session = undefined;
    session?.close();
  }
}

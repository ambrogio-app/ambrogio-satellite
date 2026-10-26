import { randomUUID } from 'node:crypto';

export const SESSION_PROTOCOL = 'ambrogio.v1';
const READY_TIMEOUT_MS = 5_000;

export type SessionIdentity = Readonly<{ clientId: string; name: string }>;

export type TurnOutcome =
  | Readonly<{ kind: 'completed'; expectsReply: boolean }>
  | Readonly<{ kind: 'failed' | 'rejected' | 'interrupted' }>;

/** Protocol events of the request in progress, already matched by `requestId`, `turnId` and `stream`. */
export type RequestEvents = Readonly<{
  accepted(conversationId: string): void;
  outputStart(stream: number, content: Readonly<{ type: 'audio'; sampleRate: number }> | Readonly<{ type: 'text' }>): void;
  outputAudio(stream: number, samples: Int16Array): void;
  outputEnd(stream: number): void;
  outcome(outcome: TurnOutcome): void;
  /** `session.error` for this request: the request cannot complete. */
  rejectedByProtocol(code: string): void;
}>;

type Message = Record<string, unknown>;

function record(value: unknown): Message | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Message : undefined;
}

/** One `ambrogio.v1` WebSocket session; it carries at most one satellite request at a time. */
export class AmbrogioSession {
  private request?: Readonly<{ id: string; stream: number; events: RequestEvents }> & { turnId?: string };
  private readonly outputs = new Set<number>();
  private nextStream = 1;
  private closedFlag = false;
  private readonly closeListeners = new Set<() => void>();

  private constructor(private readonly socket: WebSocket) {
    socket.addEventListener('message', event => this.receive(event.data));
    socket.addEventListener('close', () => this.release());
    socket.addEventListener('error', () => { /* the close event releases the session */ });
  }

  /** Open a session and resolve after `session.ready`; reject if the backend is unreachable. */
  static open(url: URL, identity: SessionIdentity): Promise<AmbrogioSession> {
    const socket = new WebSocket(url, SESSION_PROTOCOL);
    socket.binaryType = 'arraybuffer';
    const session = new AmbrogioSession(socket);
    return new Promise((resolve, reject) => {
      const fail = () => { clearTimeout(timer); reject(new Error('Conversation session unavailable')); };
      const timer = setTimeout(() => { socket.close(); fail(); }, READY_TIMEOUT_MS);
      socket.addEventListener('close', fail, { once: true });
      socket.addEventListener('open', () => {
        if (socket.protocol !== SESSION_PROTOCOL) { socket.close(); return; }
        socket.send(JSON.stringify({ type: 'session.hello', clientId: identity.clientId, name: identity.name }));
      }, { once: true });
      const ready = (event: MessageEvent) => {
        if (typeof event.data !== 'string') return;
        let message: unknown;
        try { message = JSON.parse(event.data); } catch { return; }
        if (record(message)?.type !== 'session.ready') return;
        clearTimeout(timer);
        socket.removeEventListener('close', fail);
        socket.removeEventListener('message', ready);
        resolve(session);
      };
      socket.addEventListener('message', ready);
    });
  }

  get closed(): boolean { return this.closedFlag; }

  onClose(listener: () => void): () => void {
    this.closeListeners.add(listener);
    return () => this.closeListeners.delete(listener);
  }

  /** Open an audio request whose reply is spoken; `conversationId` continues a conversation. */
  startRequest(conversationId: string | undefined, events: RequestEvents): void {
    const id = randomUUID();
    const stream = this.nextStream;
    this.nextStream = stream === 0xffff_ffff ? 1 : stream + 1;
    this.request = { id, stream, events };
    this.outputs.clear();
    this.write({ type: 'input.start', requestId: id, stream, content: { type: 'audio', sampleRate: 16_000 },
      reply: 'audio', ...(conversationId === undefined ? {} : { conversationId }) });
  }

  sendAudio(samples: Int16Array): void {
    const request = this.request;
    if (!request || samples.length === 0 || this.socket.readyState !== WebSocket.OPEN) return;
    const frame = new Uint8Array(4 + samples.byteLength);
    new DataView(frame.buffer).setUint32(0, request.stream, false);
    const pcm = new DataView(frame.buffer, 4);
    for (let index = 0; index < samples.length; index++) pcm.setInt16(index * 2, samples[index]!, true);
    this.socket.send(frame);
  }

  endRequest(): void {
    if (this.request) this.write({ type: 'input.end', requestId: this.request.id });
  }

  /** Stop reporting events of the current request; its turn may still complete on the backend. */
  forgetRequest(): void {
    this.request = undefined;
    this.outputs.clear();
  }

  close(): void { this.socket.close(1000); }

  private write(message: Message): void {
    if (this.socket.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message));
  }

  private receive(data: unknown): void {
    const request = this.request;
    if (data instanceof ArrayBuffer) {
      if (!request || data.byteLength < 4) return;
      const stream = new DataView(data).getUint32(0, false);
      if (!this.outputs.has(stream)) return;
      const bytes = new DataView(data, 4);
      const samples = new Int16Array(Math.floor(bytes.byteLength / 2));
      for (let index = 0; index < samples.length; index++) samples[index] = bytes.getInt16(index * 2, true);
      request.events.outputAudio(stream, samples);
      return;
    }
    if (typeof data !== 'string') return;
    let value: unknown;
    try { value = JSON.parse(data); } catch { return; }
    const message = record(value);
    const type = message?.type;
    if (!message || typeof type !== 'string') return;
    if (!request) return;
    const ownTurn = request.turnId !== undefined && message.turnId === request.turnId;
    switch (type) {
      case 'turn.accepted':
        if (message.requestId === request.id && typeof message.turnId === 'string'
          && typeof message.conversationId === 'string') {
          request.turnId = message.turnId;
          request.events.accepted(message.conversationId);
        }
        return;
      case 'output.start': {
        const content = record(message.content);
        if (message.requestId !== request.id || typeof message.stream !== 'number' || !content) return;
        this.outputs.add(message.stream);
        if (content.type === 'audio' && typeof content.sampleRate === 'number') {
          request.events.outputStart(message.stream, { type: 'audio', sampleRate: content.sampleRate });
        } else request.events.outputStart(message.stream, { type: 'text' });
        return;
      }
      case 'output.end':
        if (typeof message.stream === 'number' && this.outputs.delete(message.stream)) {
          request.events.outputEnd(message.stream);
        }
        return;
      case 'turn.completed':
        if (ownTurn) request.events.outcome({ kind: 'completed', expectsReply: message.expectsReply === true });
        return;
      case 'turn.failed':
        if (ownTurn) request.events.outcome({ kind: 'failed' });
        return;
      case 'turn.interrupted':
        if (ownTurn) request.events.outcome({ kind: 'interrupted' });
        return;
      case 'turn.rejected':
        if (message.requestId === request.id) request.events.outcome({ kind: 'rejected' });
        return;
      case 'session.error':
        if (message.requestId === request.id) request.events.rejectedByProtocol(String(message.code));
        return;
    }
  }

  private release(): void {
    if (this.closedFlag) return;
    this.closedFlag = true;
    for (const listener of [...this.closeListeners]) listener();
  }
}

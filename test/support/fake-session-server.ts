import { createServer } from 'node:http';
import { once } from 'node:events';
import { WebSocketServer, type WebSocket } from 'ws';

export type ReceivedFrame = Readonly<{ stream: number; samples: Int16Array }>;
export type ServerSession = Readonly<{
  socket: WebSocket;
  messages: Array<Record<string, unknown>>;
  frames: ReceivedFrame[];
  send(message: Record<string, unknown>): void;
  sendAudio(stream: number, samples: readonly number[]): void;
}>;

/** A local `ambrogio.v1` WebSocket endpoint that records what a client sends. */
export async function startFakeSessionServer(options: Readonly<{
  onMessage?(session: ServerSession, message: Record<string, unknown>): void;
  rejectProtocol?: boolean;
}> = {}) {
  const sessions: ServerSession[] = [];
  const server = createServer((_request, response) => { response.writeHead(404).end(); });
  const wss = new WebSocketServer({ server, path: '/api/session',
    handleProtocols: protocols => !options.rejectProtocol && protocols.has('ambrogio.v1') ? 'ambrogio.v1' : false });
  wss.on('connection', socket => {
    const session: ServerSession = {
      socket, messages: [], frames: [],
      send: message => socket.send(JSON.stringify(message)),
      sendAudio(stream, samples) {
        const frame = Buffer.alloc(4 + samples.length * 2);
        frame.writeUInt32BE(stream, 0);
        samples.forEach((sample, index) => frame.writeInt16LE(sample, 4 + index * 2));
        socket.send(frame);
      },
    };
    sessions.push(session);
    socket.on('message', (data, isBinary) => {
      const buffer = Buffer.isBuffer(data) ? data : Buffer.concat(data as Buffer[]);
      if (isBinary) {
        const samples = new Int16Array((buffer.length - 4) / 2);
        for (let index = 0; index < samples.length; index++) samples[index] = buffer.readInt16LE(4 + index * 2);
        session.frames.push({ stream: buffer.readUInt32BE(0), samples });
        return;
      }
      const message = JSON.parse(buffer.toString('utf8')) as Record<string, unknown>;
      session.messages.push(message);
      if (message.type === 'session.hello') session.send({ type: 'session.ready', protocol: 'ambrogio.v1' });
      options.onMessage?.(session, message);
    });
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No address');
  return {
    url: new URL(`ws://127.0.0.1:${address.port}/api/session`),
    sessions,
    async close() {
      for (const client of wss.clients) client.terminate();
      wss.close();
      server.closeAllConnections();
      server.close();
      await once(server, 'close');
    },
  };
}

export async function until(check: () => boolean, label: string, timeoutMs = 3000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!check()) {
    if (Date.now() > deadline) throw new Error(`Timed out waiting for ${label}`);
    await new Promise(resolve => setTimeout(resolve, 5));
  }
}

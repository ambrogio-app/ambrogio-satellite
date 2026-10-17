import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Integration check of the satellite's ambrogio.v1 channel against the pinned backend revision.
// The backend validates every client message with the published schema; speech recognition and
// synthesis are replaced by deterministic components, and playback is captured instead of Decibri.
const satellite = fileURLToPath(new URL('..', import.meta.url));
const root = resolve(process.env.AMBROGIO_BACKEND_REPO ?? resolve(satellite, '../ambrogio-backend'));
const expectedCommit = 'f262e924f7fdaa6635c0f4486f5aec1aa484e0a3';
const actualCommit = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
assert.equal(actualCommit, expectedCommit, 'Il backend locale deve essere al commit dichiarato nel contratto del satellite.');

const { prepareConfiguredConversations } = await import(pathToFileURL(`${root}/apps/server/dist/composition/conversations.js`));
const { buildConversationServer } = await import(pathToFileURL(`${root}/apps/server/dist/runtime/consultation-server.js`));
const { ConversationChannel } = await import(pathToFileURL(`${satellite}/dist/adapters/out/conversation-channel.js`));
const { AmbrogioSession } = await import(pathToFileURL(`${satellite}/dist/adapters/out/ambrogio-session.js`));

const SAMPLE_RATE = 22_050;
const text = value => ({ kind: 'text', text: value });
const expectation = expectsReply => ({ kind: 'reply_expectation', expectsReply });

/** Float samples whose PCM16 little-endian encoding is the UTF-8 text, as the fake transcriber reads it. */
function pcm(value) {
  const bytes = Buffer.from(value, 'utf8');
  const padded = bytes.length % 2 ? Buffer.concat([bytes, Buffer.from(' ')]) : bytes;
  const samples = new Int16Array(padded.length / 2);
  for (let index = 0; index < samples.length; index++) samples[index] = padded.readInt16LE(index * 2);
  return samples;
}

function spoken(value) {
  return Float32Array.from(pcm(value), sample => sample < 0 ? sample / 32_768 : sample / 32_767);
}

let releaseSlow = () => {};
const slow = new Promise(resolve => { releaseSlow = resolve; });
const reply = { async *produce(history) {
  const last = history.turns.at(-1)?.text;
  if (last === 'guasto') { yield text('Inizio'); throw new Error('guasto controllato'); }
  if (last === 'lento') { yield text('Ci penso'); await slow; yield expectation(false); return; }
  yield text(`Hai detto: ${last}`);
  yield expectation(last.endsWith('?'));
} };
const speech = () => ({
  transcriber: { async transcribe(audio) {
    const parts = [];
    for await (const chunk of audio) parts.push(Buffer.from(chunk));
    return Buffer.concat(parts).toString('utf8').trim();
  } },
  synthesizer: { sampleRate: SAMPLE_RATE, async *synthesize(input, signal) {
    for await (const piece of input) {
      if (signal.aborted) return;
      // PCM16 frames carry whole samples: pad the UTF-8 bytes to an even length.
      const bytes = Buffer.from(piece, 'utf8');
      yield bytes.length % 2 ? Buffer.concat([bytes, Buffer.from(' ')]) : bytes;
    }
  } },
  async close() {},
});

/** Records what the satellite would play and how the turn ends. */
function capture() {
  const turn = { conversationId: undefined, outputs: [], outcome: undefined, protocolErrors: [] };
  let settle;
  turn.done = new Promise(resolve => { settle = resolve; });
  turn.events = {
    accepted(conversationId) { turn.conversationId = conversationId; },
    outputStart(stream, content) { turn.outputs.push({ stream, content, bytes: [], ended: false }); },
    outputAudio(stream, samples) {
      const output = turn.outputs.find(item => item.stream === stream && !item.ended);
      for (const sample of samples) output.bytes.push(sample & 0xff, (sample >> 8) & 0xff);
    },
    outputEnd(stream) { turn.outputs.find(item => item.stream === stream && !item.ended).ended = true; },
    outcome(outcome) { turn.outcome = outcome; settle(); },
    rejectedByProtocol(code) { turn.protocolErrors.push(code); settle(); },
  };
  turn.played = () => turn.outputs.map(output => Buffer.from(output.bytes).toString('utf8').trim());
  return turn;
}

async function ask(channel, words, { activation = false } = {}) {
  await channel.ensure();
  if (activation) channel.newConversation();
  const turn = capture();
  channel.startRequest(spoken(words), turn.events);
  channel.endRequest();
  await turn.done;
  assert.deepEqual(turn.protocolErrors, [], `session.error for «${words}»`);
  for (const output of turn.outputs) {
    assert.equal(output.ended, true);
    assert.deepEqual(output.content, { type: 'audio', sampleRate: SAMPLE_RATE });
  }
  return turn;
}

const directory = await mkdtemp(join(tmpdir(), 'ambrogio-satellite-backend-'));
let built;
let prepared;
const channels = [];
try {
  prepared = await prepareConfiguredConversations({ archivePath: join(directory, 'archive.sqlite'),
    listPageSize: 20, maxListPageSize: 100, language: 'it' }, new Date());
  built = await buildConversationServer({ host: '127.0.0.1', port: 0, allowedOrigins: [], publicHttps: false },
    prepared, reply, { voskModelPath: '/fake/vosk', piperModelPath: '/fake/voice.onnx', piperBinaryPath: '/fake/piper' },
    speech, { sessionPingIntervalMs: 30_000 });
  const address = await built.server.listen({ host: '127.0.0.1', port: 0 });
  const sessionUrl = new URL('api/session', `${address.replace('http:', 'ws:')}/`);
  const lost = [];
  const kitchen = new ConversationChannel({ url: sessionUrl, identity: { clientId: 'satellite-cucina', name: 'Cucina' },
    lost: () => lost.push('cucina') });
  channels.push(kitchen);

  // Activation: a new conversation; the answer asks for a reply.
  const first = await ask(kitchen, 'accendi la luce?', { activation: true });
  assert.deepEqual(first.outcome, { kind: 'completed', expectsReply: true });
  assert.deepEqual(first.played(), ['Hai detto: accendi la luce?']);

  // Reply without wake word: same conversation; the answer is conclusive.
  const replyTurn = await ask(kitchen, 'in cucina');
  assert.equal(replyTurn.conversationId, first.conversationId);
  assert.deepEqual(replyTurn.outcome, { kind: 'completed', expectsReply: false });

  // A new activation starts another conversation.
  const second = await ask(kitchen, 'che ore sono', { activation: true });
  assert.notEqual(second.conversationId, first.conversationId);

  // Failure after admission: the partial answer, then the spoken failure message.
  const failed = await ask(kitchen, 'guasto', { activation: true });
  assert.deepEqual(failed.outcome, { kind: 'failed' });
  assert.deepEqual(failed.played(), ['Inizio', 'Non riesco a completare la risposta.']);

  // Another satellite continuing a busy conversation is rejected with a spoken message.
  const slowTurn = capture();
  kitchen.newConversation();
  await kitchen.ensure();
  kitchen.startRequest(spoken('lento'), slowTurn.events);
  kitchen.endRequest();
  while (!slowTurn.conversationId) await new Promise(resolve => setTimeout(resolve, 5));
  const living = await AmbrogioSession.open(sessionUrl, { clientId: 'satellite-soggiorno', name: 'Soggiorno' });
  const occupied = capture();
  living.startRequest(slowTurn.conversationId, occupied.events);
  living.sendAudio(pcm('anche io'));
  living.endRequest();
  await occupied.done;
  assert.deepEqual(occupied.protocolErrors, []);
  assert.deepEqual(occupied.outcome, { kind: 'rejected' });
  assert.deepEqual(occupied.played(), ['Un altro turno è in corso.']);
  living.close();
  releaseSlow();
  await slowTurn.done;
  assert.deepEqual(slowTurn.outcome, { kind: 'completed', expectsReply: false });

  // The archive holds the transcribed requests of each conversation.
  const history = async id => (await built.server.inject({ method: 'GET', url: `/api/conversations/${id}` })).json();
  assert.deepEqual((await history(first.conversationId)).turns.map(turn => [turn.text, turn.status]),
    [['accendi la luce?', 'answered'], ['in cucina', 'answered']]);
  assert.deepEqual((await history(slowTurn.conversationId)).turns.map(turn => turn.text), ['lento']);
  assert.deepEqual(lost, []);
  process.stdout.write('Pinned ambrogio.v1 backend + satellite channel: activation, reply in the same conversation, '
    + 'new conversation per activation, expectsReply, spoken failure, occupied rejection, no protocol errors OK\n');
} finally {
  releaseSlow();
  await Promise.allSettled(channels.map(channel => channel.close()));
  if (built) {
    await built.turnIngress.stopAccepting();
    await built.turnIngress.closeSessions();
    await built.server.close();
  }
  await prepared?.archive.close();
  await rm(directory, { recursive: true, force: true });
}

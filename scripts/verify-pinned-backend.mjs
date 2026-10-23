import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Integration check of the satellite's ambrogio.v1 channel against the pinned backend revision.
// The backend validates every client message with the published schema; speech recognition and
// synthesis are replaced by deterministic components, and playback is captured instead of Decibri.
const satellite = fileURLToPath(new URL('..', import.meta.url));
const root = resolve(process.env.AMBROGIO_BACKEND_REPO ?? resolve(satellite, '../ambrogio-backend'));
const expectedCommit = 'a570c013617fe7b9e944063dfd67ce2c00da398e'; // ambrogio-backend v0.8.0
const actualCommit = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
assert.equal(actualCommit, expectedCommit, 'Il backend locale deve essere al commit dichiarato nel contratto del satellite.');

const { loadConversationConfig } = await import(pathToFileURL(`${root}/packages/conversations/dist/adapters/out/conversation-config.js`));
const { loadVoiceConfig } = await import(pathToFileURL(`${root}/packages/conversations/dist/adapters/out/voice-config.js`));
const { loadHttpConfig } = await import(pathToFileURL(`${root}/apps/server/dist/runtime/http-config.js`));
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
  // The backend reads each component's configuration from a TypeScript module: write placeholder
  // modules and load them with the backend's own loaders. The voice files only need to be readable,
  // because the deterministic speech components replace Vosk and the synthesizer.
  const voice = join(directory, 'voice');
  await mkdir(join(directory, 'vosk'));
  await mkdir(join(voice, 'espeak-ng-data'), { recursive: true });
  await writeFile(join(voice, 'voice.onnx'), '');
  await writeFile(join(voice, 'tokens.txt'), '');
  const configModule = (name, value) => {
    const filename = join(directory, name);
    return writeFile(filename, `export default ${JSON.stringify(value, null, 2)};\n`).then(() => filename);
  };
  const conversationConfig = await loadConversationConfig(await configModule('conversations.ts', {
    archivePath: join(directory, 'archive.sqlite'), language: 'it', timeZone: 'UTC', listPageSize: 20, maxListPageSize: 100 }));
  const httpConfig = await loadHttpConfig(await configModule('http.ts', { host: '127.0.0.1', port: 3000, allowedOrigins: [] }));
  const voiceConfig = await loadVoiceConfig(await configModule('voice.ts', {
    voskModelPath: join(directory, 'vosk'), voiceEngine: 'piper', voiceModelDir: voice }), conversationConfig.language);
  prepared = await prepareConfiguredConversations(conversationConfig, new Date());
  built = await buildConversationServer(httpConfig, prepared, reply, voiceConfig, speech, { sessionPingIntervalMs: 30_000 });
  const address = await built.server.listen({ host: '127.0.0.1', port: 0 });
  const sessionUrl = new URL('api/session', `${address.replace('http:', 'ws:')}/`);
  const lost = [];
  const satelliteA = new ConversationChannel({ url: sessionUrl, identity: { clientId: 'satellite-a', name: 'Satellite A' },
    lost: () => lost.push('satellite-a') });
  channels.push(satelliteA);

  // Activation: a new conversation; the answer asks for a reply.
  const first = await ask(satelliteA, 'accendi la luce?', { activation: true });
  assert.deepEqual(first.outcome, { kind: 'completed', expectsReply: true });
  assert.deepEqual(first.played(), ['Hai detto: accendi la luce?']);

  // Reply without wake word: same conversation; the answer is conclusive.
  const replyTurn = await ask(satelliteA, 'va bene');
  assert.equal(replyTurn.conversationId, first.conversationId);
  assert.deepEqual(replyTurn.outcome, { kind: 'completed', expectsReply: false });

  // A new activation starts another conversation.
  const second = await ask(satelliteA, 'che ore sono', { activation: true });
  assert.notEqual(second.conversationId, first.conversationId);

  // Failure after admission: the partial answer, then the spoken failure message.
  const failed = await ask(satelliteA, 'guasto', { activation: true });
  assert.deepEqual(failed.outcome, { kind: 'failed' });
  assert.deepEqual(failed.played(), ['Inizio', 'Non riesco a completare la risposta.']);

  // Another satellite continuing a busy conversation is rejected with a spoken message.
  const slowTurn = capture();
  satelliteA.newConversation();
  await satelliteA.ensure();
  satelliteA.startRequest(spoken('lento'), slowTurn.events);
  satelliteA.endRequest();
  while (!slowTurn.conversationId) await new Promise(resolve => setTimeout(resolve, 5));
  const satelliteB = await AmbrogioSession.open(sessionUrl, { clientId: 'satellite-b', name: 'Satellite B' });
  const occupied = capture();
  satelliteB.startRequest(slowTurn.conversationId, occupied.events);
  satelliteB.sendAudio(pcm('anche io'));
  satelliteB.endRequest();
  await occupied.done;
  assert.deepEqual(occupied.protocolErrors, []);
  assert.deepEqual(occupied.outcome, { kind: 'rejected' });
  assert.deepEqual(occupied.played(), ['Un altro turno è in corso.']);
  satelliteB.close();
  releaseSlow();
  await slowTurn.done;
  assert.deepEqual(slowTurn.outcome, { kind: 'completed', expectsReply: false });

  // The archive holds the transcribed requests of each conversation.
  const history = async id => (await built.server.inject({ method: 'GET', url: `/api/conversations/${id}` })).json();
  assert.deepEqual((await history(first.conversationId)).turns.map(turn => [turn.text, turn.status]),
    [['accendi la luce?', 'answered'], ['va bene', 'answered']]);
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

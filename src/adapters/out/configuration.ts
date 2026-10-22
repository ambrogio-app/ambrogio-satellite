import { hostname } from 'node:os';
import { sessionWebSocketUrl } from './backend-url.js';
import { isWakeWordId } from './wake-word-catalog.js';

export type InvalidConfiguration = Readonly<{
  kind: 'invalid_configuration';
  field: 'config' | 'backend.baseUrl' | 'client.id' | 'client.name' | 'audio.microphone' | 'audio.speaker'
    | 'audio.attenuation'
    | 'wakeWord.model' | 'wakeWord.threshold' | 'wakeWord.patience' | 'interaction.replyTimeoutMs';
}>;

type Result<T> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; error: InvalidConfiguration }>;

export type SatelliteConfig = Readonly<{
  backend: Readonly<{ baseUrl: URL; sessionUrl: URL }>;
  client: Readonly<{ clientId: string; name: string }>;
  audio: Readonly<{ microphone?: string; speaker?: string;
    attenuation?: Readonly<{ device: string; control: string; level: number }> }>;
  wakeWord: Readonly<{ model: string; threshold: number; patience: number }>;
  interaction: Readonly<{ replyTimeoutMs: number }>;
}>;

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : undefined;
}

function onlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).every(key => keys.includes(key));
}

function audioSelector(value: unknown, field: 'audio.microphone' | 'audio.speaker'): Result<string | undefined> {
  if (value === undefined) return { ok: true, value: undefined };
  if (typeof value !== 'string' || !value.trim() || value !== value.trim()) {
    return { ok: false, error: { kind: 'invalid_configuration', field } };
  }
  return { ok: true, value };
}

function nonEmptyTrimmed(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '' && value === value.trim();
}

/** The optional ALSA control lowered during an interaction, with its level in percent. */
export function parseAttenuation(value: unknown): Result<Readonly<{ device: string; control: string; level: number }> | undefined> {
  if (value === undefined) return { ok: true, value: undefined };
  const invalid = { ok: false as const, error: { kind: 'invalid_configuration' as const, field: 'audio.attenuation' as const } };
  const settings = record(value);
  if (!settings || !onlyKeys(settings, ['device', 'control', 'level'])) return invalid;
  const { device, control, level } = settings;
  if (!nonEmptyTrimmed(device) || !nonEmptyTrimmed(control)) return invalid;
  if (typeof level !== 'number' || !Number.isSafeInteger(level) || level < 0 || level > 100) return invalid;
  return { ok: true, value: { device, control, level } };
}

export function parseBackendBaseUrl(value: unknown): Result<Readonly<{ baseUrl: URL; sessionUrl: URL }>> {
  if (typeof value !== 'string' || !value || value.trim() !== value) {
    return { ok: false, error: { kind: 'invalid_configuration', field: 'backend.baseUrl' } };
  }
  let baseUrl: URL;
  try { baseUrl = new URL(value); }
  catch { return { ok: false, error: { kind: 'invalid_configuration', field: 'backend.baseUrl' } }; }
  if ((baseUrl.protocol !== 'http:' && baseUrl.protocol !== 'https:') || !baseUrl.hostname
    || baseUrl.username || baseUrl.password || baseUrl.search || baseUrl.hash) {
    return { ok: false, error: { kind: 'invalid_configuration', field: 'backend.baseUrl' } };
  }
  return { ok: true, value: { baseUrl, sessionUrl: sessionWebSocketUrl(baseUrl) } };
}

export function parseReplyTimeoutMs(value: unknown): Result<number> {
  if (value === undefined) return { ok: true, value: 15_000 };
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    return { ok: false, error: { kind: 'invalid_configuration', field: 'interaction.replyTimeoutMs' } };
  }
  return { ok: true, value };
}

function identityField(value: unknown, fallback: string, field: 'client.id' | 'client.name'): Result<string> {
  if (value === undefined) return { ok: true, value: fallback };
  if (typeof value !== 'string' || !value.trim()) return { ok: false, error: { kind: 'invalid_configuration', field } };
  return { ok: true, value };
}

/** Validate the whole JSON document before constructing audio or network resources. */
export function parseSatelliteConfig(input: unknown, availableModels: ReadonlySet<string>,
  host: string = hostname()): Result<SatelliteConfig> {
  const root = record(input);
  if (!root || !onlyKeys(root, ['backend', 'client', 'audio', 'wakeWord', 'interaction'])) {
    return { ok: false, error: { kind: 'invalid_configuration', field: 'config' } };
  }
  const backend = record(root.backend);
  if (!backend || !onlyKeys(backend, ['baseUrl'])) {
    return { ok: false, error: { kind: 'invalid_configuration', field: 'backend.baseUrl' } };
  }
  const base = parseBackendBaseUrl(backend.baseUrl);
  if (!base.ok) return base;

  const client = root.client === undefined ? {} : record(root.client);
  if (!client || !onlyKeys(client, ['id', 'name'])) {
    return { ok: false, error: { kind: 'invalid_configuration', field: 'client.id' } };
  }
  const clientId = identityField(client.id, `satellite-${host}`, 'client.id');
  if (!clientId.ok) return clientId;
  const name = identityField(client.name, host, 'client.name');
  if (!name.ok) return name;

  const audio = root.audio === undefined ? {} : record(root.audio);
  if (!audio || !onlyKeys(audio, ['microphone', 'speaker', 'attenuation'])) {
    return { ok: false, error: { kind: 'invalid_configuration', field: 'config' } };
  }
  const microphone = audioSelector(audio.microphone, 'audio.microphone');
  if (!microphone.ok) return microphone;
  const speaker = audioSelector(audio.speaker, 'audio.speaker');
  if (!speaker.ok) return speaker;
  const attenuation = parseAttenuation(audio.attenuation);
  if (!attenuation.ok) return attenuation;

  const wakeWord = root.wakeWord === undefined ? {} : record(root.wakeWord);
  if (!wakeWord || !onlyKeys(wakeWord, ['model', 'threshold', 'patience'])) {
    return { ok: false, error: { kind: 'invalid_configuration', field: 'wakeWord.model' } };
  }
  const model = wakeWord.model === undefined ? 'hey_jarvis' : wakeWord.model;
  if (typeof model !== 'string' || !isWakeWordId(model) || !availableModels.has(model)) {
    return { ok: false, error: { kind: 'invalid_configuration', field: 'wakeWord.model' } };
  }
  const threshold = wakeWord.threshold === undefined ? 0.5 : wakeWord.threshold;
  if (typeof threshold !== 'number' || !Number.isFinite(threshold) || threshold <= 0 || threshold > 1) {
    return { ok: false, error: { kind: 'invalid_configuration', field: 'wakeWord.threshold' } };
  }
  const patience = wakeWord.patience === undefined ? 2 : wakeWord.patience;
  if (typeof patience !== 'number' || !Number.isSafeInteger(patience) || patience < 1 || patience > 10) {
    return { ok: false, error: { kind: 'invalid_configuration', field: 'wakeWord.patience' } };
  }

  const interaction = root.interaction === undefined ? {} : record(root.interaction);
  if (!interaction || !onlyKeys(interaction, ['replyTimeoutMs'])) {
    return { ok: false, error: { kind: 'invalid_configuration', field: 'interaction.replyTimeoutMs' } };
  }
  const timeout = parseReplyTimeoutMs(interaction.replyTimeoutMs);
  if (!timeout.ok) return timeout;

  return { ok: true, value: {
    backend: base.value,
    client: { clientId: clientId.value, name: name.value },
    audio: {
      ...(microphone.value === undefined ? {} : { microphone: microphone.value }),
      ...(speaker.value === undefined ? {} : { speaker: speaker.value }),
      ...(attenuation.value === undefined ? {} : { attenuation: attenuation.value }),
    },
    wakeWord: { model, threshold, patience },
    interaction: { replyTimeoutMs: timeout.value },
  } };
}

import { voiceWebSocketUrl } from './backend-url.js';

export type InvalidConfiguration = Readonly<{
  kind: 'invalid_configuration';
  field: 'config' | 'backend.baseUrl' | 'audio.microphone' | 'audio.speaker'
    | 'wakeWord.model' | 'interaction.replyTimeoutMs';
}>;

type Result<T> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; error: InvalidConfiguration }>;

export type SatelliteConfig = Readonly<{
  backend: Readonly<{ baseUrl: URL; voiceUrl: URL }>;
  audio: Readonly<{ microphone?: string; speaker?: string }>;
  wakeWord: Readonly<{ model: string }>;
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

export function parseBackendBaseUrl(value: unknown): Result<Readonly<{ baseUrl: URL; voiceUrl: URL }>> {
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
  return { ok: true, value: { baseUrl, voiceUrl: voiceWebSocketUrl(baseUrl) } };
}

export function parseReplyTimeoutMs(value: unknown): Result<number> {
  if (value === undefined) return { ok: true, value: 15_000 };
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    return { ok: false, error: { kind: 'invalid_configuration', field: 'interaction.replyTimeoutMs' } };
  }
  return { ok: true, value };
}

/** Validate the whole JSON document before constructing audio or network resources. */
export function parseSatelliteConfig(input: unknown, distributedModels: ReadonlySet<string>): Result<SatelliteConfig> {
  const root = record(input);
  if (!root || !onlyKeys(root, ['backend', 'audio', 'wakeWord', 'interaction'])) {
    return { ok: false, error: { kind: 'invalid_configuration', field: 'config' } };
  }
  const backend = record(root.backend);
  if (!backend || !onlyKeys(backend, ['baseUrl'])) {
    return { ok: false, error: { kind: 'invalid_configuration', field: 'backend.baseUrl' } };
  }
  const base = parseBackendBaseUrl(backend.baseUrl);
  if (!base.ok) return base;

  const audio = root.audio === undefined ? {} : record(root.audio);
  if (!audio || !onlyKeys(audio, ['microphone', 'speaker'])) {
    return { ok: false, error: { kind: 'invalid_configuration', field: 'config' } };
  }
  const microphone = audioSelector(audio.microphone, 'audio.microphone');
  if (!microphone.ok) return microphone;
  const speaker = audioSelector(audio.speaker, 'audio.speaker');
  if (!speaker.ok) return speaker;

  const wakeWord = root.wakeWord === undefined ? {} : record(root.wakeWord);
  if (!wakeWord || !onlyKeys(wakeWord, ['model'])) {
    return { ok: false, error: { kind: 'invalid_configuration', field: 'wakeWord.model' } };
  }
  const model = wakeWord.model === undefined ? 'hey_jarvis' : wakeWord.model;
  if (typeof model !== 'string' || !distributedModels.has(model)) {
    return { ok: false, error: { kind: 'invalid_configuration', field: 'wakeWord.model' } };
  }

  const interaction = root.interaction === undefined ? {} : record(root.interaction);
  if (!interaction || !onlyKeys(interaction, ['replyTimeoutMs'])) {
    return { ok: false, error: { kind: 'invalid_configuration', field: 'interaction.replyTimeoutMs' } };
  }
  const timeout = parseReplyTimeoutMs(interaction.replyTimeoutMs);
  if (!timeout.ok) return timeout;

  return { ok: true, value: {
    backend: base.value,
    audio: {
      ...(microphone.value === undefined ? {} : { microphone: microphone.value }),
      ...(speaker.value === undefined ? {} : { speaker: speaker.value }),
    },
    wakeWord: { model },
    interaction: { replyTimeoutMs: timeout.value },
  } };
}

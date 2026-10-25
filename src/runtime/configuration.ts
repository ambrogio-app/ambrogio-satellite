import { hostname } from 'node:os';
import { sessionWebSocketUrl } from './backend-url.js';
import { isWakeWordText } from '../adapters/out/keyword-tokens.js';
import type { WakeWordVocabulary } from '../adapters/out/voice-models.js';

/** Every environment variable read by the configuration module of the satellite. */
export const configurationVariables = [
  'AMBROGIO_ENV',
  'AMBROGIO_BACKEND_URL',
  'AMBROGIO_CLIENT_ID',
  'AMBROGIO_CLIENT_NAME',
  'AMBROGIO_MICROPHONE',
  'AMBROGIO_SPEAKER',
  'AMBROGIO_ATTENUATION_DEVICE',
  'AMBROGIO_ATTENUATION_CONTROL',
  'AMBROGIO_ATTENUATION_LEVEL',
  'AMBROGIO_WAKE_WORD',
  'AMBROGIO_WAKE_WORD_THRESHOLD',
  'AMBROGIO_REPLY_TIMEOUT_MS',
] as const;

export type ConfigurationVariable = typeof configurationVariables[number];

/**
 * The defaults owned by this module, the same in every runtime environment. `AMBROGIO_CLIENT_ID` and
 * `AMBROGIO_CLIENT_NAME` also have defaults, derived from the host name when the configuration is read.
 */
export const configurationDefaults = {
  AMBROGIO_WAKE_WORD: 'Alexa',
  AMBROGIO_WAKE_WORD_THRESHOLD: 0.25,
  AMBROGIO_REPLY_TIMEOUT_MS: 15_000,
} as const;

/** Variables with a default: the examples must not set them. */
export const defaultedVariables: readonly ConfigurationVariable[] = [
  ...Object.keys(configurationDefaults) as ConfigurationVariable[], 'AMBROGIO_CLIENT_ID', 'AMBROGIO_CLIENT_NAME',
];

export const runtimeEnvironments = ['development', 'test', 'production'] as const;
export type RuntimeEnvironment = typeof runtimeEnvironments[number];

/** Only the variable and the violated condition: never the value. */
export type InvalidConfiguration = Readonly<{
  kind: 'invalid_configuration';
  variable: ConfigurationVariable;
  condition: 'missing' | 'invalid';
}>;
export type ConfigurationRejection = InvalidConfiguration;

type Result<T> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; error: ConfigurationRejection }>;

export type SatelliteConfig = Readonly<{
  backend: Readonly<{ baseUrl: URL; sessionUrl: URL }>;
  client: Readonly<{ clientId: string; name: string }>;
  audio: Readonly<{ microphone?: string; speaker?: string;
    attenuation?: Readonly<{ device: string; control: string; level: number }> }>;
  wakeWord: Readonly<{ text: string; threshold: number }>;
  interaction: Readonly<{ replyTimeoutMs: number }>;
}>;

export type Environment = Readonly<Record<string, string | undefined>>;

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const reject = (variable: ConfigurationVariable, condition: 'missing' | 'invalid'): Result<never> =>
  ({ ok: false, error: { kind: 'invalid_configuration', variable, condition } });

/** An empty variable counts as an absent one. */
function read(environment: Environment, name: ConfigurationVariable): string | undefined {
  const value = environment[name];
  return value === undefined || value === '' ? undefined : value;
}

const trimmed = (value: string) => value.trim() !== '' && value === value.trim();

function integer(value: string, min: number, max: number): number | undefined {
  if (!/^[0-9]+$/.test(value)) return undefined;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= min && number <= max ? number : undefined;
}

function backendUrl(value: string): Readonly<{ baseUrl: URL; sessionUrl: URL }> | undefined {
  if (value.trim() !== value) return undefined;
  let baseUrl: URL;
  try { baseUrl = new URL(value); } catch { return undefined; }
  if ((baseUrl.protocol !== 'http:' && baseUrl.protocol !== 'https:') || !baseUrl.hostname
    || baseUrl.username || baseUrl.password || baseUrl.search || baseUrl.hash) return undefined;
  return { baseUrl, sessionUrl: sessionWebSocketUrl(baseUrl) };
}

/** The optional ALSA control lowered during an interaction: all three variables or none. */
function attenuation(environment: Environment): Result<SatelliteConfig['audio']['attenuation']> {
  const device = read(environment, 'AMBROGIO_ATTENUATION_DEVICE');
  const control = read(environment, 'AMBROGIO_ATTENUATION_CONTROL');
  const level = read(environment, 'AMBROGIO_ATTENUATION_LEVEL');
  if (device === undefined && control === undefined && level === undefined) return ok(undefined);
  if (device === undefined) return reject('AMBROGIO_ATTENUATION_DEVICE', 'missing');
  if (!trimmed(device)) return reject('AMBROGIO_ATTENUATION_DEVICE', 'invalid');
  if (control === undefined) return reject('AMBROGIO_ATTENUATION_CONTROL', 'missing');
  if (!trimmed(control)) return reject('AMBROGIO_ATTENUATION_CONTROL', 'invalid');
  if (level === undefined) return reject('AMBROGIO_ATTENUATION_LEVEL', 'missing');
  const percent = integer(level, 0, 100);
  if (percent === undefined) return reject('AMBROGIO_ATTENUATION_LEVEL', 'invalid');
  return ok({ device, control, level: percent });
}

/**
 * The configuration module of the satellite: reads the process environment once, applies the defaults it
 * owns and validates every value before any audio or network resource is built.
 */
export function readSatelliteConfig(environment: Environment, vocabulary: WakeWordVocabulary | undefined,
  host: string = hostname()): Result<SatelliteConfig> {
  const runtime = read(environment, 'AMBROGIO_ENV');
  if (runtime === undefined) return reject('AMBROGIO_ENV', 'missing');
  if (!(runtimeEnvironments as readonly string[]).includes(runtime)) return reject('AMBROGIO_ENV', 'invalid');

  const url = read(environment, 'AMBROGIO_BACKEND_URL');
  if (url === undefined) return reject('AMBROGIO_BACKEND_URL', 'missing');
  const backend = backendUrl(url);
  if (!backend) return reject('AMBROGIO_BACKEND_URL', 'invalid');

  const clientId = read(environment, 'AMBROGIO_CLIENT_ID') ?? `satellite-${host}`;
  if (!clientId.trim()) return reject('AMBROGIO_CLIENT_ID', 'invalid');
  const name = read(environment, 'AMBROGIO_CLIENT_NAME') ?? host;
  if (!name.trim()) return reject('AMBROGIO_CLIENT_NAME', 'invalid');

  const microphone = read(environment, 'AMBROGIO_MICROPHONE');
  if (microphone !== undefined && !trimmed(microphone)) return reject('AMBROGIO_MICROPHONE', 'invalid');
  const speaker = read(environment, 'AMBROGIO_SPEAKER');
  if (speaker !== undefined && !trimmed(speaker)) return reject('AMBROGIO_SPEAKER', 'invalid');
  const lowered = attenuation(environment);
  if (!lowered.ok) return lowered;

  // Without a readable vocabulary only the form is checked here: loading the model then fails at startup.
  const text = read(environment, 'AMBROGIO_WAKE_WORD') ?? configurationDefaults.AMBROGIO_WAKE_WORD;
  if (!isWakeWordText(text) || (vocabulary !== undefined && vocabulary.tokens(text) === undefined)) {
    return reject('AMBROGIO_WAKE_WORD', 'invalid');
  }
  const thresholdText = read(environment, 'AMBROGIO_WAKE_WORD_THRESHOLD');
  const threshold = thresholdText === undefined ? configurationDefaults.AMBROGIO_WAKE_WORD_THRESHOLD
    : /^[0-9]+(\.[0-9]+)?$/.test(thresholdText) ? Number(thresholdText) : Number.NaN;
  if (!(threshold > 0 && threshold < 1)) return reject('AMBROGIO_WAKE_WORD_THRESHOLD', 'invalid');
  const timeoutText = read(environment, 'AMBROGIO_REPLY_TIMEOUT_MS');
  const replyTimeoutMs = timeoutText === undefined ? configurationDefaults.AMBROGIO_REPLY_TIMEOUT_MS
    : integer(timeoutText, 1, Number.MAX_SAFE_INTEGER);
  if (replyTimeoutMs === undefined) return reject('AMBROGIO_REPLY_TIMEOUT_MS', 'invalid');

  return ok({
    backend,
    client: { clientId, name },
    audio: {
      ...(microphone === undefined ? {} : { microphone }),
      ...(speaker === undefined ? {} : { speaker }),
      ...(lowered.value === undefined ? {} : { attenuation: lowered.value }),
    },
    wakeWord: { text, threshold },
    interaction: { replyTimeoutMs },
  });
}

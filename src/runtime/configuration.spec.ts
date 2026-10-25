import { describe, expect, it } from 'vitest';
import { readSatelliteConfig, type ConfigurationVariable } from './configuration.js';

/** A vocabulary that represents every word except those with the letter Q. */
const distributedModels = { tokens: (text: string) => /q/i.test(text) ? undefined : [text] };
const base = { AMBROGIO_ENV: 'production', AMBROGIO_BACKEND_URL: 'http://localhost:3000' };

const rejection = (variable: ConfigurationVariable, condition: 'missing' | 'invalid') =>
  ({ ok: false, error: { kind: 'invalid_configuration', variable, condition } });

describe('runtime environment', () => {
  it.each(['development', 'test', 'production'])('accepts %s', environment => {
    expect(readSatelliteConfig({ ...base, AMBROGIO_ENV: environment }, distributedModels, 'host').ok).toBe(true);
  });

  it('is required, without a default', () => {
    expect(readSatelliteConfig({ AMBROGIO_BACKEND_URL: 'http://localhost:3000' }, distributedModels))
      .toEqual(rejection('AMBROGIO_ENV', 'missing'));
    expect(readSatelliteConfig({ ...base, AMBROGIO_ENV: '' }, distributedModels))
      .toEqual(rejection('AMBROGIO_ENV', 'missing'));
  });

  it.each(['prod', 'Production', 'staging'])('rejects %s', environment => {
    expect(readSatelliteConfig({ ...base, AMBROGIO_ENV: environment }, distributedModels))
      .toEqual(rejection('AMBROGIO_ENV', 'invalid'));
  });

  it('gives the same defaults in every environment', () => {
    const results = ['development', 'test', 'production'].map(environment =>
      readSatelliteConfig({ ...base, AMBROGIO_ENV: environment }, distributedModels, 'host'));
    expect(results[0]).toEqual(results[1]);
    expect(results[1]).toEqual(results[2]);
  });
});

describe('backend base URL', () => {
  it('derives the WebSocket endpoint while preserving a proxy prefix', () => {
    const result = readSatelliteConfig({ ...base, AMBROGIO_BACKEND_URL: 'https://example.org/ambrogio/' },
      distributedModels);
    expect(result.ok && result.value.backend.sessionUrl.href).toBe('wss://example.org/ambrogio/api/session');
  });

  it('is required in every environment', () => {
    for (const environment of ['development', 'test', 'production']) {
      expect(readSatelliteConfig({ AMBROGIO_ENV: environment }, distributedModels))
        .toEqual(rejection('AMBROGIO_BACKEND_URL', 'missing'));
    }
  });

  it.each(['ws://example.org', 'https://name:secret@example.org',
    'https://example.org/?token=value', 'https://example.org/#voice', ' example.org ', 'not a url'])
  ('rejects non-base or credential-bearing URL %s', value => {
    expect(readSatelliteConfig({ ...base, AMBROGIO_BACKEND_URL: value }, distributedModels))
      .toEqual(rejection('AMBROGIO_BACKEND_URL', 'invalid'));
  });
});

describe('satellite configuration', () => {
  it('applies the defaults it owns and leaves the audio devices to the system', () => {
    const result = readSatelliteConfig(base, distributedModels, 'host-a');
    expect(result).toEqual({ ok: true, value: {
      backend: { baseUrl: new URL('http://localhost:3000'), sessionUrl: new URL('ws://localhost:3000/api/session') },
      client: { clientId: 'satellite-host-a', name: 'host-a' },
      audio: {},
      wakeWord: { text: 'Alexa', threshold: 0.25 },
      interaction: { replyTimeoutMs: 15_000 },
    } });
  });

  it('treats empty variables as absent', () => {
    const result = readSatelliteConfig({ ...base, AMBROGIO_CLIENT_ID: '', AMBROGIO_MICROPHONE: '',
      AMBROGIO_WAKE_WORD: '', AMBROGIO_WAKE_WORD_THRESHOLD: '', AMBROGIO_REPLY_TIMEOUT_MS: '', AMBROGIO_ATTENUATION_DEVICE: '' },
    distributedModels, 'host-a');
    expect(result.ok && result.value.client.clientId).toBe('satellite-host-a');
    expect(result.ok && result.value.audio).toEqual({});
    expect(result.ok && result.value.wakeWord).toEqual({ text: 'Alexa', threshold: 0.25 });
    expect(result.ok && result.value.interaction.replyTimeoutMs).toBe(15_000);
  });

  it.each(['Hey Siri', "Don't stop"])('preserves explicit audio devices, the wake word %j and timeout', text => {
    const result = readSatelliteConfig({ ...base, AMBROGIO_BACKEND_URL: 'https://example.org/ambrogio',
      AMBROGIO_MICROPHONE: 'alsa:mic-1', AMBROGIO_SPEAKER: 'USB Speaker', AMBROGIO_WAKE_WORD: text,
      AMBROGIO_WAKE_WORD_THRESHOLD: '0.7', AMBROGIO_REPLY_TIMEOUT_MS: '2500' },
    distributedModels);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.audio).toEqual({ microphone: 'alsa:mic-1', speaker: 'USB Speaker' });
      expect(result.value.wakeWord).toEqual({ text, threshold: 0.7 });
      expect(result.value.interaction.replyTimeoutMs).toBe(2_500);
      expect(result.value.backend.sessionUrl.href).toBe('wss://example.org/ambrogio/api/session');
    }
  });

  it('uses an explicit client identity', () => {
    const result = readSatelliteConfig({ ...base, AMBROGIO_CLIENT_ID: 'satellite-01', AMBROGIO_CLIENT_NAME: 'Studio' },
      distributedModels, 'host');
    expect(result.ok && result.value.client).toEqual({ clientId: 'satellite-01', name: 'Studio' });
    const partial = readSatelliteConfig({ ...base, AMBROGIO_CLIENT_NAME: 'Studio' }, distributedModels, 'host');
    expect(partial.ok && partial.value.client).toEqual({ clientId: 'satellite-host', name: 'Studio' });
  });

  it('rejects a wake word that the model vocabulary cannot represent', () => {
    expect(readSatelliteConfig({ ...base, AMBROGIO_WAKE_WORD: 'Quasar' }, distributedModels))
      .toEqual(rejection('AMBROGIO_WAKE_WORD', 'invalid'));
  });

  it('checks only the form of the wake word when the vocabulary cannot be read', () => {
    const result = readSatelliteConfig({ ...base, AMBROGIO_WAKE_WORD: 'Quasar' }, undefined);
    expect(result.ok && result.value.wakeWord.text).toBe('Quasar');
    expect(readSatelliteConfig({ ...base, AMBROGIO_WAKE_WORD: 'Quasar!' }, undefined))
      .toEqual(rejection('AMBROGIO_WAKE_WORD', 'invalid'));
  });

  it.each(['0.01', '0.5', '0.99'])('accepts the wake word threshold %s', threshold => {
    const result = readSatelliteConfig({ ...base, AMBROGIO_WAKE_WORD_THRESHOLD: threshold }, distributedModels);
    expect(result.ok && result.value.wakeWord.threshold).toBe(Number(threshold));
  });

  it.each([
    ['AMBROGIO_CLIENT_ID', '   '],
    ['AMBROGIO_CLIENT_NAME', ' \t'],
    ['AMBROGIO_MICROPHONE', ' alsa:mic'],
    ['AMBROGIO_SPEAKER', 'speaker '],
    ['AMBROGIO_WAKE_WORD', 'Hey  Alexa'],
    ['AMBROGIO_WAKE_WORD', ' Alexa'],
    ['AMBROGIO_WAKE_WORD', 'Città'],
    ['AMBROGIO_WAKE_WORD', '../outside'],
    ['AMBROGIO_WAKE_WORD', 'a'.repeat(65)],
    ['AMBROGIO_WAKE_WORD_THRESHOLD', '0'],
    ['AMBROGIO_WAKE_WORD_THRESHOLD', '1'],
    ['AMBROGIO_WAKE_WORD_THRESHOLD', '1.2'],
    ['AMBROGIO_WAKE_WORD_THRESHOLD', 'high'],
    ['AMBROGIO_WAKE_WORD_THRESHOLD', '-0.5'],
    ['AMBROGIO_REPLY_TIMEOUT_MS', '0'],
    ['AMBROGIO_REPLY_TIMEOUT_MS', '-1'],
    ['AMBROGIO_REPLY_TIMEOUT_MS', '1.5'],
    ['AMBROGIO_REPLY_TIMEOUT_MS', '15s'],
  ] as const)('rejects %s=%j naming only the variable', (variable, value) => {
    expect(readSatelliteConfig({ ...base, [variable]: value }, distributedModels, 'host'))
      .toEqual(rejection(variable, 'invalid'));
  });
});

describe('local attenuation configuration', () => {
  const full = { AMBROGIO_ATTENUATION_DEVICE: 'hw:CARD=Example', AMBROGIO_ATTENUATION_CONTROL: 'Music' };

  it('is absent when no attenuation variable is set', () => {
    const result = readSatelliteConfig(base, distributedModels, 'host');
    expect(result.ok && result.value.audio.attenuation).toBe(undefined);
  });

  it.each(['0', '25', '100'])('accepts a control with level %s', level => {
    const result = readSatelliteConfig({ ...base, ...full, AMBROGIO_SPEAKER: 'alsa:shared',
      AMBROGIO_ATTENUATION_LEVEL: level }, distributedModels, 'host');
    expect(result.ok && result.value.audio).toEqual({ speaker: 'alsa:shared',
      attenuation: { device: 'hw:CARD=Example', control: 'Music', level: Number(level) } });
  });

  it.each([
    [{ AMBROGIO_ATTENUATION_CONTROL: 'Music', AMBROGIO_ATTENUATION_LEVEL: '25' }, 'AMBROGIO_ATTENUATION_DEVICE', 'missing'],
    [{ AMBROGIO_ATTENUATION_DEVICE: 'hw:CARD=Example', AMBROGIO_ATTENUATION_LEVEL: '25' }, 'AMBROGIO_ATTENUATION_CONTROL', 'missing'],
    [full, 'AMBROGIO_ATTENUATION_LEVEL', 'missing'],
    [{ ...full, AMBROGIO_ATTENUATION_DEVICE: ' hw:0', AMBROGIO_ATTENUATION_LEVEL: '25' }, 'AMBROGIO_ATTENUATION_DEVICE', 'invalid'],
    [{ ...full, AMBROGIO_ATTENUATION_CONTROL: ' Music', AMBROGIO_ATTENUATION_LEVEL: '25' }, 'AMBROGIO_ATTENUATION_CONTROL', 'invalid'],
    [{ ...full, AMBROGIO_ATTENUATION_LEVEL: '-1' }, 'AMBROGIO_ATTENUATION_LEVEL', 'invalid'],
    [{ ...full, AMBROGIO_ATTENUATION_LEVEL: '101' }, 'AMBROGIO_ATTENUATION_LEVEL', 'invalid'],
    [{ ...full, AMBROGIO_ATTENUATION_LEVEL: '12.5' }, 'AMBROGIO_ATTENUATION_LEVEL', 'invalid'],
  ] as const)('rejects %j', (variables, variable, condition) => {
    expect(readSatelliteConfig({ ...base, ...variables }, distributedModels, 'host'))
      .toEqual(rejection(variable, condition));
  });
});

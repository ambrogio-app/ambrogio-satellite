import { describe, expect, it } from 'vitest';
import { parseBackendBaseUrl, parseReplyTimeoutMs, parseSatelliteConfig } from '../../../src/adapters/out/configuration.js';

const distributedModels = new Set(['alexa', 'hey_jarvis', 'hey_mycroft']);

describe('backend base URL', () => {
  it('derives the WebSocket endpoint while preserving a proxy prefix', () => {
    const result = parseBackendBaseUrl('https://example.org/ambrogio/');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.sessionUrl.href).toBe('wss://example.org/ambrogio/api/session');
  });

  it.each(['ws://example.org', 'https://name:secret@example.org',
    'https://example.org/?token=value', 'https://example.org/#voice', ' example.org '])
  ('rejects non-base or credential-bearing URL %s', value => {
    expect(parseBackendBaseUrl(value)).toEqual({ ok: false,
      error: { kind: 'invalid_configuration', field: 'backend.baseUrl' } });
  });
});

describe('reply timeout', () => {
  it('uses the documented default and accepts a positive integer', () => {
    expect(parseReplyTimeoutMs(undefined)).toEqual({ ok: true, value: 15_000 });
    expect(parseReplyTimeoutMs(2_500)).toEqual({ ok: true, value: 2_500 });
  });

  it.each([0, -1, 1.5, Infinity, '15000', null])('rejects %s', value => {
    expect(parseReplyTimeoutMs(value)).toEqual({ ok: false,
      error: { kind: 'invalid_configuration', field: 'interaction.replyTimeoutMs' } });
  });
});

describe('satellite configuration', () => {
  it('uses system audio defaults and local interaction defaults', () => {
    const result = parseSatelliteConfig({ backend: { baseUrl: 'http://localhost:3000' } }, distributedModels, 'cucina');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.client).toEqual({ clientId: 'satellite-cucina', name: 'cucina' });
      expect(result.value.audio).toEqual({});
      expect(result.value.wakeWord.model).toBe('hey_jarvis');
      expect(result.value.wakeWord.threshold).toBe(0.5);
      expect(result.value.wakeWord.patience).toBe(2);
      expect(result.value.interaction.replyTimeoutMs).toBe(15_000);
      expect(result.value.backend.sessionUrl.href).toBe('ws://localhost:3000/api/session');
    }
  });

  it.each(['alexa', 'hey_mycroft'])('preserves explicit audio devices, %s model and timeout', model => {
    const result = parseSatelliteConfig({
      backend: { baseUrl: 'https://example.org/ambrogio' },
      audio: { microphone: 'alsa:mic-1', speaker: 'USB Speaker' },
      wakeWord: { model, threshold: 0.7, patience: 3 },
      interaction: { replyTimeoutMs: 2_500 },
    }, distributedModels);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.audio).toEqual({ microphone: 'alsa:mic-1', speaker: 'USB Speaker' });
      expect(result.value.wakeWord).toEqual({ model, threshold: 0.7, patience: 3 });
      expect(result.value.interaction.replyTimeoutMs).toBe(2_500);
      expect(result.value.backend.sessionUrl.href).toBe('wss://example.org/ambrogio/api/session');
    }
  });

  it('uses an explicit client identity', () => {
    const result = parseSatelliteConfig({ backend: { baseUrl: 'http://localhost:3000' },
      client: { id: 'satellite-cucina-01', name: 'Cucina' } }, distributedModels, 'host');
    expect(result.ok && result.value.client).toEqual({ clientId: 'satellite-cucina-01', name: 'Cucina' });
    const partial = parseSatelliteConfig({ backend: { baseUrl: 'http://localhost:3000' },
      client: { name: 'Studio' } }, distributedModels, 'host');
    expect(partial.ok && partial.value.client).toEqual({ clientId: 'satellite-host', name: 'Studio' });
  });

  it.each([
    [{ id: '' }, 'client.id'],
    [{ id: '   ' }, 'client.id'],
    [{ id: 7 }, 'client.id'],
    [{ name: '' }, 'client.name'],
    [{ name: ' \t' }, 'client.name'],
    [{ name: null }, 'client.name'],
    [{ id: 'a', extra: true }, 'client.id'],
    ['cucina', 'client.id'],
  ] as const)('rejects an invalid client identity %j', (client, field) => {
    expect(parseSatelliteConfig({ backend: { baseUrl: 'http://localhost:3000' }, client },
      distributedModels, 'host')).toEqual({ ok: false, error: { kind: 'invalid_configuration', field } });
  });

  it('accepts an available custom wake word model', () => {
    const result = parseSatelliteConfig({
      backend: { baseUrl: 'http://localhost:3000' }, wakeWord: { model: 'personalizzato' },
    }, new Set([...distributedModels, 'personalizzato']));
    expect(result.ok && result.value.wakeWord.model).toBe('personalizzato');
  });

  it('rejects an unsafe identifier even if a catalog reports it available', () => {
    expect(parseSatelliteConfig({
      backend: { baseUrl: 'http://localhost:3000' }, wakeWord: { model: '../outside' },
    }, new Set(['../outside']))).toEqual({ ok: false,
      error: { kind: 'invalid_configuration', field: 'wakeWord.model' } });
  });

  it.each([1, 10])('accepts %i consecutive wake word chunks', patience => {
    const result = parseSatelliteConfig({ backend: { baseUrl: 'http://localhost:3000' }, wakeWord: { patience } },
      distributedModels);
    expect(result.ok && result.value.wakeWord.patience).toBe(patience);
  });

  it.each([
    [{ backend: { baseUrl: 'http://localhost:3000' }, audio: { microphone: '' } }, 'audio.microphone'],
    [{ backend: { baseUrl: 'http://localhost:3000' }, audio: { speaker: 42 } }, 'audio.speaker'],
    [{ backend: { baseUrl: 'http://localhost:3000' }, wakeWord: { model: 'hey_alexa' } }, 'wakeWord.model'],
    [{ backend: { baseUrl: 'http://localhost:3000' }, wakeWord: { model: '../outside' } }, 'wakeWord.model'],
    [{ backend: { baseUrl: 'http://localhost:3000' }, wakeWord: { model: 'melspectrogram' } }, 'wakeWord.model'],
    [{ backend: { baseUrl: 'http://localhost:3000' }, wakeWord: { model: null } }, 'wakeWord.model'],
    [{ backend: { baseUrl: 'http://localhost:3000' }, wakeWord: { threshold: 0 } }, 'wakeWord.threshold'],
    [{ backend: { baseUrl: 'http://localhost:3000' }, wakeWord: { threshold: 1.2 } }, 'wakeWord.threshold'],
    [{ backend: { baseUrl: 'http://localhost:3000' }, wakeWord: { threshold: '0.7' } }, 'wakeWord.threshold'],
    [{ backend: { baseUrl: 'http://localhost:3000' }, wakeWord: { patience: 0 } }, 'wakeWord.patience'],
    [{ backend: { baseUrl: 'http://localhost:3000' }, wakeWord: { patience: 11 } }, 'wakeWord.patience'],
    [{ backend: { baseUrl: 'http://localhost:3000' }, wakeWord: { patience: 1.5 } }, 'wakeWord.patience'],
    [{ backend: { baseUrl: 'http://localhost:3000' }, wakeWord: { patience: '2' } }, 'wakeWord.patience'],
    [{ backend: { baseUrl: 'http://localhost:3000' }, interaction: { replyTimeoutMs: 0 } }, 'interaction.replyTimeoutMs'],
    [{ backend: { baseUrl: 'http://localhost:3000' }, extra: true }, 'config'],
  ] as const)('rejects invalid or unavailable settings', (input, field) => {
    expect(parseSatelliteConfig(input, distributedModels)).toEqual({ ok: false,
      error: { kind: 'invalid_configuration', field } });
  });
});

describe('local attenuation configuration', () => {
  const base = { backend: { baseUrl: 'http://localhost:3000' } };

  it('is absent when the audio section does not name a control', () => {
    const result = parseSatelliteConfig(base, distributedModels, 'host');
    expect(result.ok && result.value.audio.attenuation).toBe(undefined);
  });

  it.each([0, 25, 100])('accepts a control with level %i', level => {
    const result = parseSatelliteConfig({ ...base,
      audio: { speaker: 'alsa:shared', attenuation: { device: 'hw:CARD=Example', control: 'Music', level } } },
    distributedModels, 'host');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.audio).toEqual({ speaker: 'alsa:shared',
        attenuation: { device: 'hw:CARD=Example', control: 'Music', level } });
    }
  });

  it.each([
    { control: 'Music', level: 25 },
    { device: 'hw:CARD=Example', level: 25 },
    { device: 'hw:CARD=Example', control: 'Music' },
    { device: '', control: 'Music', level: 25 },
    { device: 'hw:CARD=Example', control: ' Music', level: 25 },
    { device: 'hw:CARD=Example', control: 'Music', level: -1 },
    { device: 'hw:CARD=Example', control: 'Music', level: 101 },
    { device: 'hw:CARD=Example', control: 'Music', level: 12.5 },
    { device: 'hw:CARD=Example', control: 'Music', level: '25' },
    { device: 'hw:CARD=Example', control: 'Music', level: 25, mode: 'db' },
    'hw:CARD=Example',
  ])('rejects %j', attenuation => {
    expect(parseSatelliteConfig({ ...base, audio: { attenuation } }, distributedModels, 'host')).toEqual({
      ok: false, error: { kind: 'invalid_configuration', field: 'audio.attenuation' } });
  });
});

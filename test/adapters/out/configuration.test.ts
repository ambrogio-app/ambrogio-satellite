import { describe, expect, it } from 'vitest';
import { parseBackendBaseUrl, parseReplyTimeoutMs, parseSatelliteConfig } from '../../../src/adapters/out/configuration.js';

const distributedModels = new Set(['hey_jarvis', 'hey_mycroft']);

describe('backend base URL', () => {
  it('derives the WebSocket endpoint while preserving a proxy prefix', () => {
    const result = parseBackendBaseUrl('https://example.org/ambrogio/');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.voiceUrl.href).toBe('wss://example.org/ambrogio/api/voice');
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
    const result = parseSatelliteConfig({ backend: { baseUrl: 'http://localhost:3000' } }, distributedModels);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.audio).toEqual({});
      expect(result.value.wakeWord.model).toBe('hey_jarvis');
      expect(result.value.interaction.replyTimeoutMs).toBe(15_000);
      expect(result.value.backend.voiceUrl.href).toBe('ws://localhost:3000/api/voice');
    }
  });

  it('preserves explicit audio devices, model and timeout', () => {
    const result = parseSatelliteConfig({
      backend: { baseUrl: 'https://example.org/ambrogio' },
      audio: { microphone: 'alsa:mic-1', speaker: 'USB Speaker' },
      wakeWord: { model: 'hey_mycroft' },
      interaction: { replyTimeoutMs: 2_500 },
    }, distributedModels);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.audio).toEqual({ microphone: 'alsa:mic-1', speaker: 'USB Speaker' });
      expect(result.value.wakeWord.model).toBe('hey_mycroft');
      expect(result.value.interaction.replyTimeoutMs).toBe(2_500);
      expect(result.value.backend.voiceUrl.href).toBe('wss://example.org/ambrogio/api/voice');
    }
  });

  it.each([
    [{ backend: { baseUrl: 'http://localhost:3000' }, audio: { microphone: '' } }, 'audio.microphone'],
    [{ backend: { baseUrl: 'http://localhost:3000' }, audio: { speaker: 42 } }, 'audio.speaker'],
    [{ backend: { baseUrl: 'http://localhost:3000' }, wakeWord: { model: 'hey_alexa' } }, 'wakeWord.model'],
    [{ backend: { baseUrl: 'http://localhost:3000' }, wakeWord: { model: null } }, 'wakeWord.model'],
    [{ backend: { baseUrl: 'http://localhost:3000' }, interaction: { replyTimeoutMs: 0 } }, 'interaction.replyTimeoutMs'],
    [{ backend: { baseUrl: 'http://localhost:3000' }, extra: true }, 'config'],
  ] as const)('rejects invalid or undistributed settings', (input, field) => {
    expect(parseSatelliteConfig(input, distributedModels)).toEqual({ ok: false,
      error: { kind: 'invalid_configuration', field } });
  });
});

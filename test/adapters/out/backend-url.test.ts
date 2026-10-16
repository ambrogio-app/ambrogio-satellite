import { describe, expect, it } from 'vitest';
import { voiceWebSocketUrl } from '../../../src/adapters/out/backend-url.js';

describe('public backend voice URL', () => {
  it.each([
    ['http://localhost:3000', 'ws://localhost:3000/api/voice'],
    ['https://example.org/ambrogio/', 'wss://example.org/ambrogio/api/voice'],
  ])('derives the voice endpoint from %s', (base, expected) => {
    const original = new URL(base);
    const originalHref = original.href;
    expect(voiceWebSocketUrl(original).href).toBe(expected);
    expect(original.href).toBe(originalHref);
  });
});

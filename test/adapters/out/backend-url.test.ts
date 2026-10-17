import { describe, expect, it } from 'vitest';
import { sessionWebSocketUrl } from '../../../src/adapters/out/backend-url.js';

describe('public backend session URL', () => {
  it.each([
    ['http://localhost:3000', 'ws://localhost:3000/api/session'],
    ['https://example.org/ambrogio/', 'wss://example.org/ambrogio/api/session'],
  ])('derives the session endpoint from %s', (base, expected) => {
    const original = new URL(base);
    const originalHref = original.href;
    expect(sessionWebSocketUrl(original).href).toBe(expected);
    expect(original.href).toBe(originalHref);
  });
});

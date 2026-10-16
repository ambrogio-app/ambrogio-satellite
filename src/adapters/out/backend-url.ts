/** Derive the public Micdrop endpoint from a validated HTTP(S) backend base URL. */
export function voiceWebSocketUrl(baseUrl: URL): URL {
  const endpoint = new URL(baseUrl);
  endpoint.protocol = baseUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  endpoint.pathname = `${baseUrl.pathname.replace(/\/+$/, '')}/api/voice`;
  endpoint.search = '';
  endpoint.hash = '';
  return endpoint;
}

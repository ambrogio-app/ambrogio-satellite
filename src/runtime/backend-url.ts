/** Derive the `ambrogio.v1` session endpoint from a validated HTTP(S) backend base URL. */
export function sessionWebSocketUrl(baseUrl: URL): URL {
  const endpoint = new URL(baseUrl);
  endpoint.protocol = baseUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  endpoint.pathname = `${baseUrl.pathname.replace(/\/+$/, '')}/api/session`;
  endpoint.search = '';
  endpoint.hash = '';
  return endpoint;
}

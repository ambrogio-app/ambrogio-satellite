import { afterEach, beforeEach, expect, test, vi } from 'vitest';

// Modules that build audio, wake word or network resources record their loading.
const f = vi.hoisted(() => ({
  loaded: [] as string[],
  start: vi.fn(),
  info: vi.fn(),
  failure: vi.fn(),
  configurationRejected: vi.fn(),
  shutdownTimeout: vi.fn(),
}));
vi.mock('./composition/satellite.js', () => {
  f.loaded.push('composition');
  return { startSatellite: f.start };
});
vi.mock('decibri', () => { f.loaded.push('decibri'); return {}; });
vi.mock('onnxruntime-node', () => { f.loaded.push('onnxruntime-node'); return {}; });
vi.mock('./adapters/out/diagnostics.js', () => ({ diagnostics: {
  info: f.info, failure: f.failure, configurationRejected: f.configurationRejected, shutdownTimeout: f.shutdownTimeout,
} }));

const argv = process.argv;

beforeEach(() => {
  f.loaded.length = 0;
  vi.resetModules();
  vi.clearAllMocks();
});
afterEach(() => {
  process.argv = argv;
  process.exitCode = undefined;
  vi.unstubAllEnvs();
});

/** Start the entry point with exactly these configuration variables in the process environment. */
async function runMain(environment: Readonly<Record<string, string>>): Promise<void> {
  for (const name of Object.keys(process.env)) if (name.startsWith('AMBROGIO_')) vi.stubEnv(name, undefined);
  for (const [name, value] of Object.entries(environment)) vi.stubEnv(name, value);
  process.argv = [argv[0]!, 'main.js'];
  await import('./main.js');
}

test.each([
  [{ AMBROGIO_BACKEND_URL: 'http://backend.example.test' }, 'AMBROGIO_ENV', 'missing'],
  [{ AMBROGIO_ENV: 'staging', AMBROGIO_BACKEND_URL: 'http://backend.example.test' }, 'AMBROGIO_ENV', 'invalid'],
  [{ AMBROGIO_ENV: 'production', AMBROGIO_BACKEND_URL: 'ftp://backend.example.test' }, 'AMBROGIO_BACKEND_URL', 'invalid'],
  [{ AMBROGIO_ENV: 'production', AMBROGIO_BACKEND_URL: 'http://backend.example.test',
    AMBROGIO_WAKE_WORD_MODEL: 'missing_word' }, 'AMBROGIO_WAKE_WORD_MODEL', 'invalid'],
])('an invalid configuration exits with 2 before any resource is loaded (%j)', async (environment, variable, condition) => {
  await runMain(environment);
  expect(process.exitCode).toBe(2);
  expect(f.configurationRejected).toHaveBeenCalledExactlyOnceWith({ kind: 'invalid_configuration', variable, condition });
  expect(f.loaded).toEqual([]);
  expect(f.start).not.toHaveBeenCalled();
});

test('a startup argument exits with 2 before the configuration is read', async () => {
  process.argv = [argv[0]!, 'main.js', '--config', '/config/satellite.ts'];
  await import('./main.js');
  expect(process.exitCode).toBe(2);
  expect(f.info).toHaveBeenCalledExactlyOnceWith('invalid_arguments');
  expect(f.configurationRejected).not.toHaveBeenCalled();
  expect(f.loaded).toEqual([]);
});

test('a valid configuration reaches the composition root only after validation', async () => {
  vi.stubEnv('ORT_DISABLE_TELEMETRY', '');
  const failure = new Error('no devices in the test');
  f.start.mockRejectedValue(failure);
  await runMain({ AMBROGIO_ENV: 'production', AMBROGIO_BACKEND_URL: 'https://backend.example.test/prefix',
    AMBROGIO_CLIENT_ID: 'satellite-test', AMBROGIO_CLIENT_NAME: 'Test' });
  expect(f.configurationRejected).not.toHaveBeenCalled();
  expect(f.loaded).toEqual(['composition']);
  expect(f.start).toHaveBeenCalledOnce();
  const [config, signal] = f.start.mock.calls[0]!;
  expect(config.backend.sessionUrl.href).toBe('wss://backend.example.test/prefix/api/session');
  expect(config.client).toEqual({ clientId: 'satellite-test', name: 'Test' });
  expect(config.wakeWord.model).toBe('hey_jarvis');
  expect(signal).toBeInstanceOf(AbortSignal);
  expect(f.failure).toHaveBeenCalledExactlyOnceWith('satellite_process_failed', failure);
  expect(process.exitCode).toBe(1);
});

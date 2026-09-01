import { afterEach, describe, expect, it, jest } from '@jest/globals';

import {
  cachedServerOverride,
  checkServerHealth,
  clearServerOverride,
  currentServerBase,
  deriveServerBase,
  DEFAULT_SERVER_PORT,
  loadServerOverride,
  metroServerBase,
  resolveServerBase,
  saveServerOverride,
} from '../serverConfig';

/* eslint-disable @typescript-eslint/no-require-imports -- jest.mock factories are hoisted above imports */
// The module under test reads the saved override through AsyncStorage, whose
// native module is null under Jest.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
/* eslint-enable @typescript-eslint/no-require-imports */

const TUNNEL = 'https://uneven-lamp-vote.trycloudflare.com';

describe('deriveServerBase', () => {
  it('derives wss from an https tunnel URL', () => {
    expect(deriveServerBase(TUNNEL)).toEqual({
      httpBaseUrl: TUNNEL,
      wsUrl: 'wss://uneven-lamp-vote.trycloudflare.com/ws',
    });
  });

  it('derives ws from a plain http URL with an explicit port', () => {
    expect(deriveServerBase('http://192.168.0.14:4000')).toEqual({
      httpBaseUrl: 'http://192.168.0.14:4000',
      wsUrl: 'ws://192.168.0.14:4000/ws',
    });
  });

  it('keeps a non-default port on the https form', () => {
    expect(deriveServerBase('https://demo.example.com:8443')).toEqual({
      httpBaseUrl: 'https://demo.example.com:8443',
      wsUrl: 'wss://demo.example.com:8443/ws',
    });
  });

  it('ignores a trailing slash, a path and surrounding whitespace', () => {
    const expected = {
      httpBaseUrl: TUNNEL,
      wsUrl: 'wss://uneven-lamp-vote.trycloudflare.com/ws',
    };
    expect(deriveServerBase(`${TUNNEL}/`)).toEqual(expected);
    expect(deriveServerBase(`${TUNNEL}/api/health`)).toEqual(expected);
    expect(deriveServerBase(`  ${TUNNEL}  `)).toEqual(expected);
    expect(deriveServerBase(`${TUNNEL}/?token=abc`)).toEqual(expected);
  });

  it('accepts a websocket URL and derives the matching http base', () => {
    expect(deriveServerBase('wss://uneven-lamp-vote.trycloudflare.com/ws')).toEqual({
      httpBaseUrl: TUNNEL,
      wsUrl: 'wss://uneven-lamp-vote.trycloudflare.com/ws',
    });
    expect(deriveServerBase('ws://localhost:4000/ws')).toEqual({
      httpBaseUrl: 'http://localhost:4000',
      wsUrl: 'ws://localhost:4000/ws',
    });
  });

  it('is case insensitive on the scheme and normalises it', () => {
    expect(deriveServerBase('HTTPS://demo.example.com')?.wsUrl).toBe('wss://demo.example.com/ws');
  });

  it('rejects input that is not a usable server URL', () => {
    const invalid = [
      '',
      '   ',
      'nonsense',
      'uneven-lamp-vote.trycloudflare.com',
      'https://',
      'http:///api',
      'ftp://demo.example.com',
      'https://demo.example.com:port',
      'https://demo.example.com:70000',
      'https://demo.example.com:0',
      'https://host:1:2',
      'https://exemplo com',
    ];
    for (const raw of invalid) {
      expect(deriveServerBase(raw)).toBeNull();
    }
  });
});

describe('metroServerBase', () => {
  it('strips the Metro port and targets the demo server port', () => {
    expect(metroServerBase('192.168.0.14:8081')).toEqual({
      httpBaseUrl: `http://192.168.0.14:${DEFAULT_SERVER_PORT}`,
      wsUrl: `ws://192.168.0.14:${DEFAULT_SERVER_PORT}/ws`,
    });
  });

  it('falls back to localhost when Metro is absent', () => {
    const expected = {
      httpBaseUrl: `http://localhost:${DEFAULT_SERVER_PORT}`,
      wsUrl: `ws://localhost:${DEFAULT_SERVER_PORT}/ws`,
    };
    expect(metroServerBase(undefined)).toEqual(expected);
    expect(metroServerBase(null)).toEqual(expected);
    expect(metroServerBase('')).toEqual(expected);
  });
});

describe('resolveServerBase precedence', () => {
  const build = 'https://build.example.com';
  const metroHostUri = '192.168.0.14:8081';

  it('prefers the device override over every other source', () => {
    expect(resolveServerBase({ override: TUNNEL, build, metroHostUri })).toEqual({
      httpBaseUrl: TUNNEL,
      wsUrl: 'wss://uneven-lamp-vote.trycloudflare.com/ws',
      source: 'override',
    });
  });

  it('falls back to the build URL when no override is saved', () => {
    expect(resolveServerBase({ override: null, build, metroHostUri })).toEqual({
      httpBaseUrl: build,
      wsUrl: 'wss://build.example.com/ws',
      source: 'build',
    });
  });

  it('falls back to the Metro host when neither URL is configured', () => {
    expect(resolveServerBase({ metroHostUri })).toEqual({
      httpBaseUrl: `http://192.168.0.14:${DEFAULT_SERVER_PORT}`,
      wsUrl: `ws://192.168.0.14:${DEFAULT_SERVER_PORT}/ws`,
      source: 'metro',
    });
  });

  it('lands on localhost when nothing at all is configured', () => {
    expect(resolveServerBase({})).toEqual({
      httpBaseUrl: `http://localhost:${DEFAULT_SERVER_PORT}`,
      wsUrl: `ws://localhost:${DEFAULT_SERVER_PORT}/ws`,
      source: 'metro',
    });
  });

  it('skips an unusable override instead of stranding the demo', () => {
    expect(resolveServerBase({ override: 'nonsense', build, metroHostUri }).source).toBe('build');
  });

  it('skips an unusable build URL as well', () => {
    expect(resolveServerBase({ override: '', build: 'nope', metroHostUri }).source).toBe('metro');
  });
});

describe('saved override', () => {
  it('round-trips through storage and drives the base in use', async () => {
    await clearServerOverride();
    expect(currentServerBase().source).toBe('metro');

    expect(await saveServerOverride('nonsense')).toBe(false);
    expect(cachedServerOverride()).toBeNull();

    expect(await saveServerOverride(`  ${TUNNEL}/  `)).toBe(true);
    expect(await loadServerOverride()).toBe(`${TUNNEL}/`);
    expect(currentServerBase()).toEqual({
      httpBaseUrl: TUNNEL,
      wsUrl: 'wss://uneven-lamp-vote.trycloudflare.com/ws',
      source: 'override',
    });

    await clearServerOverride();
    expect(cachedServerOverride()).toBeNull();
    expect(await loadServerOverride()).toBeNull();
    expect(currentServerBase().source).toBe('metro');
  });
});

describe('checkServerHealth', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const stubFetch = (impl: () => Promise<unknown>): void => {
    (globalThis as { fetch: unknown }).fetch = jest.fn(impl);
  };

  it('reports the status the server answered with', async () => {
    stubFetch(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ status: 'ok' }) }));
    await expect(checkServerHealth(TUNNEL)).resolves.toEqual({
      ok: true,
      message: 'Servidor no ar. Resposta: ok.',
    });
  });

  it('reports the HTTP status of a rejected response', async () => {
    stubFetch(() => Promise.resolve({ ok: false, status: 502 }));
    await expect(checkServerHealth(TUNNEL)).resolves.toEqual({
      ok: false,
      message: 'O servidor respondeu HTTP 502.',
    });
  });

  it('surfaces the real network error message', async () => {
    stubFetch(() => Promise.reject(new Error('Network request failed')));
    await expect(checkServerHealth(TUNNEL)).resolves.toEqual({
      ok: false,
      message: 'Network request failed',
    });
  });
});

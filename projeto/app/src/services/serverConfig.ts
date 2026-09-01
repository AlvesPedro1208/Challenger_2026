import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

/** Port the demo server listens on when it is reached directly over the LAN. */
export const DEFAULT_SERVER_PORT = 4000;

/** Path the demo server serves its event socket on. */
const WS_PATH = '/ws';

/** Path of the liveness endpoint the settings screen probes. */
const HEALTH_PATH = '/api/health';

const OVERRIDE_KEY = 'jornada/server-url/v1';

const HEALTH_TIMEOUT_MS = 4000;

/** Where the base currently in use came from. */
export type ServerBaseSource = 'override' | 'build' | 'metro';

export interface ServerBase {
  httpBaseUrl: string;
  wsUrl: string;
}

export interface ResolvedServerBase extends ServerBase {
  source: ServerBaseSource;
}

/** scheme://authority, with anything after the authority discarded. */
const SERVER_URL = /^(https?|wss?):\/\/([^/?#\s]+)(?:[/?#].*)?$/i;

const HOST_CHARS = /^[A-Za-z0-9._-]+$/;

const PORT_DIGITS = /^\d{1,5}$/;

/** Accepts `host` and `host:port`; IPv6 literals are out of scope for the demo. */
function isValidAuthority(authority: string): boolean {
  const parts = authority.split(':');
  if (parts.length > 2) return false;
  const host = parts[0] ?? '';
  const port = parts[1];
  if (!HOST_CHARS.test(host)) return false;
  if (port === undefined) return true;
  return PORT_DIGITS.test(port) && Number(port) >= 1 && Number(port) <= 65535;
}

/**
 * Turns a pasted URL into the HTTP and WebSocket bases of the demo server.
 *
 * Both bases are derived from the same authority, so a tunnel served over TLS
 * yields `https` + `wss` — the only pair iOS App Transport Security lets a
 * release build use — and a plain LAN address yields `http` + `ws`. Whatever
 * follows the authority (a path, a trailing slash, a query) is dropped: every
 * caller appends its own path. Returns null when the input is not usable.
 */
export function deriveServerBase(raw: string): ServerBase | null {
  const match = SERVER_URL.exec(raw.trim());
  if (!match) return null;
  const scheme = (match[1] ?? '').toLowerCase();
  const authority = match[2] ?? '';
  if (!isValidAuthority(authority)) return null;
  const secure = scheme === 'https' || scheme === 'wss';
  return {
    httpBaseUrl: `${secure ? 'https' : 'http'}://${authority}`,
    wsUrl: `${secure ? 'wss' : 'ws'}://${authority}${WS_PATH}`,
  };
}

/**
 * Development fallback: the demo server runs on the same machine as the Metro
 * bundler, so its host is the right target for the simulator and for a phone
 * on the same Wi-Fi. Release builds have no Metro and land on localhost, which
 * is exactly why an override exists.
 */
export function metroServerBase(hostUri: string | null | undefined): ServerBase {
  const host = hostUri?.split(':')[0] || 'localhost';
  return {
    httpBaseUrl: `http://${host}:${DEFAULT_SERVER_PORT}`,
    wsUrl: `ws://${host}:${DEFAULT_SERVER_PORT}${WS_PATH}`,
  };
}

export interface ServerBaseSources {
  /** URL the operator saved on this device. */
  override?: string | null;
  /** URL baked into the build through app.json `extra.demoServerUrl`. */
  build?: string | null;
  /** `hostUri` reported by expo-constants while Metro is attached. */
  metroHostUri?: string | null;
}

/**
 * Picks the base in use: device override first, build default next, Metro host
 * last. A source that holds an unusable URL is skipped rather than honoured, so
 * a mistyped override can never leave the demo without a server to try.
 */
export function resolveServerBase(sources: ServerBaseSources): ResolvedServerBase {
  const override = sources.override ? deriveServerBase(sources.override) : null;
  if (override) return { ...override, source: 'override' };
  const build = sources.build ? deriveServerBase(sources.build) : null;
  if (build) return { ...build, source: 'build' };
  return { ...metroServerBase(sources.metroHostUri), source: 'metro' };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object';

/** URL fixed at build time in app.json, when the team chose to pin one. */
export function buildServerUrl(): string | null {
  const extra: unknown = Constants.expoConfig?.extra;
  if (!isRecord(extra)) return null;
  const value = extra.demoServerUrl;
  return typeof value === 'string' ? value : null;
}

let overrideCache: string | null = null;

/** Reads the saved override from disk and refreshes the synchronous cache. */
export async function loadServerOverride(): Promise<string | null> {
  try {
    overrideCache = await AsyncStorage.getItem(OVERRIDE_KEY);
  } catch {
    // No storage, no override; the build and Metro sources still answer.
    overrideCache = null;
  }
  return overrideCache;
}

/** Persists an override. Returns false when the URL cannot be parsed. */
export async function saveServerOverride(raw: string): Promise<boolean> {
  if (!deriveServerBase(raw)) return false;
  const value = raw.trim();
  try {
    await AsyncStorage.setItem(OVERRIDE_KEY, value);
  } catch {
    return false;
  }
  overrideCache = value;
  return true;
}

/** Drops the override, so the build default (or Metro) takes over again. */
export async function clearServerOverride(): Promise<void> {
  overrideCache = null;
  try {
    await AsyncStorage.removeItem(OVERRIDE_KEY);
  } catch {
    // Best effort: the cache is already cleared for this session.
  }
}

/** The override currently held in memory, without touching storage. */
export function cachedServerOverride(): string | null {
  return overrideCache;
}

/** The base every request and socket of this session should use. */
export function currentServerBase(): ResolvedServerBase {
  return resolveServerBase({
    override: overrideCache,
    build: buildServerUrl(),
    metroHostUri: Constants.expoConfig?.hostUri,
  });
}

// The synchronous accessors above cannot await storage, so the saved override
// is read once here, at import time. That read is queued before the boot
// sequence issues its own storage reads, so the cache is warm by the time the
// first request goes out. A URL saved while the app is running only takes
// effect on the next launch, which is what the settings screen states.
void loadServerOverride();

export interface HealthCheckResult {
  ok: boolean;
  message: string;
}

function describeRequestFailure(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return `Sem resposta em ${HEALTH_TIMEOUT_MS / 1000} s. Verifique se o túnel está no ar.`;
    }
    return error.message;
  }
  return 'Falha desconhecida ao contatar o servidor.';
}

/**
 * Probes the demo server's liveness endpoint and reports what really happened,
 * so a failed test on presentation day names the cause instead of a generic
 * "não conectou".
 */
export async function checkServerHealth(baseUrl: string): Promise<HealthCheckResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  try {
    const response = await fetch(`${baseUrl}${HEALTH_PATH}`, { signal: controller.signal });
    if (!response.ok) {
      return { ok: false, message: `O servidor respondeu HTTP ${response.status}.` };
    }
    const body: unknown = await response.json();
    const status = isRecord(body) && typeof body.status === 'string' ? body.status : 'ok';
    return { ok: true, message: `Servidor no ar. Resposta: ${status}.` };
  } catch (error) {
    return { ok: false, message: describeRequestFailure(error) };
  } finally {
    clearTimeout(timeout);
  }
}

import Constants from 'expo-constants';

import type { DemoEvent, DemoEventType } from '@jornada/shared';

import { currentServerBase } from '@/services/serverConfig';
import { useJourneyStore } from '@/state/store';

const DEFAULT_MAX_ATTEMPTS = 5;
const MAX_BACKOFF_MS = 8000;

/** Unlimited slow retry that runs once auto-play has taken over. */
const DEFAULT_BACKGROUND_RETRY_MS = 15000;

/**
 * In dev the demo server runs on the same machine as the Metro bundler, so its
 * host (from expo-constants) is the right target for both simulator and a
 * physical phone on the same network.
 */
export function resolveServerHost(): string {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host) return host;
  }
  return 'localhost';
}

/**
 * Both bases come from `serverConfig`, which honours the URL the operator
 * saved on the device (a tunnel, on presentation day) before falling back to
 * the build default and finally to the Metro host used here in development.
 */
export function httpBaseUrl(): string {
  return currentServerBase().httpBaseUrl;
}

export function wsUrl(): string {
  return currentServerBase().wsUrl;
}

const EVENT_TYPES: ReadonlySet<string> = new Set<DemoEventType>([
  'CLOCK_SET',
  'PHASE_CHANGE',
  'TRAFFIC_ALERT',
  'RISK_UPDATE',
  'PLATFORM_CHANGE',
  'BUS_TELEMETRY',
  'DELAY_UPDATE',
  'STOP_APPROACHING',
  'STOP_DWELL',
  'ARRIVAL',
]);

export function parseDemoEvent(raw: unknown): DemoEvent | null {
  if (typeof raw !== 'string') return null;
  try {
    const data: unknown = JSON.parse(raw);
    if (
      data !== null &&
      typeof data === 'object' &&
      typeof (data as { type?: unknown }).type === 'string' &&
      EVENT_TYPES.has((data as { type: string }).type) &&
      typeof (data as { at?: unknown }).at === 'string'
    ) {
      return data as DemoEvent;
    }
  } catch {
    // Malformed frames are dropped; the next event keeps the demo alive.
  }
  return null;
}

export interface ConnectionOptions {
  url?: string;
  maxAttempts?: number;
  /** Called once when all attempts are exhausted (e.g. to start auto-play). */
  onGiveUp?: () => void;
  /**
   * Called whenever the background retry gets the panel back after a give-up,
   * so the caller can stop auto-play and hand the demo to the server.
   */
  onReconnected?: () => void;
  /** Interval of the unlimited background retry that follows a give-up. */
  retryIntervalMs?: number;
}

/**
 * Connects to the demo server and feeds every valid event into the store.
 * Reconnects with exponential backoff; after maxAttempts consecutive failures
 * it settles on 'offline' and calls onGiveUp once. From then on it keeps
 * retrying in the background at retryIntervalMs, forever, so a server that only
 * comes up after the app does still takes the demo over — every such recovery
 * calls onReconnected. Returns a disconnect function.
 */
export function connectToDemoServer(options: ConnectionOptions = {}): () => void {
  const url = options.url ?? wsUrl();
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const retryIntervalMs = options.retryIntervalMs ?? DEFAULT_BACKGROUND_RETRY_MS;

  let socket: WebSocket | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let attempts = 0;
  let closed = false;
  // Sticky: once auto-play owns the demo, every later drop retries slowly
  // instead of burning the short budget and calling onGiveUp a second time.
  let gaveUp = false;

  const scheduleRetry = (delayMs: number): void => {
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = setTimeout(open, delayMs);
  };

  function open(): void {
    if (closed) return;
    // Handlers check identity, so a socket replaced by a retry can no longer
    // feed the store or schedule connections of its own.
    const current = new WebSocket(url);
    socket = current;

    current.onopen = () => {
      if (socket !== current || closed) return;
      attempts = 0;
      useJourneyStore.getState().setConnection('panel');
      if (gaveUp) options.onReconnected?.();
    };

    current.onmessage = (message) => {
      if (socket !== current || closed) return;
      const event = parseDemoEvent(message.data);
      if (event) useJourneyStore.getState().applyEvent(event);
    };

    current.onerror = () => {
      // onclose always follows in RN; retry scheduling lives there.
    };

    current.onclose = () => {
      if (socket !== current || closed) return;
      if (useJourneyStore.getState().connection === 'panel') {
        useJourneyStore.getState().setConnection('offline');
      }
      if (gaveUp) {
        scheduleRetry(retryIntervalMs);
        return;
      }
      attempts += 1;
      if (attempts >= maxAttempts) {
        gaveUp = true;
        options.onGiveUp?.();
        scheduleRetry(retryIntervalMs);
        return;
      }
      scheduleRetry(Math.min(1000 * 2 ** (attempts - 1), MAX_BACKOFF_MS));
    };
  }

  open();

  return () => {
    closed = true;
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = null;
    socket?.close();
    socket = null;
  };
}

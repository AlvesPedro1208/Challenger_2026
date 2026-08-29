import Constants from 'expo-constants';

import type { DemoEvent, DemoEventType } from '@jornada/shared';

import { useJourneyStore } from '@/state/store';

const SERVER_PORT = 4000;
const DEFAULT_MAX_ATTEMPTS = 5;
const MAX_BACKOFF_MS = 8000;

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

export function httpBaseUrl(): string {
  return `http://${resolveServerHost()}:${SERVER_PORT}`;
}

export function wsUrl(): string {
  return `ws://${resolveServerHost()}:${SERVER_PORT}/ws`;
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
}

/**
 * Connects to the demo server and feeds every valid event into the store.
 * Reconnects with exponential backoff; after maxAttempts consecutive failures
 * it settles on 'offline' and calls onGiveUp. Returns a disconnect function.
 */
export function connectToDemoServer(options: ConnectionOptions = {}): () => void {
  const url = options.url ?? wsUrl();
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;

  let socket: WebSocket | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let attempts = 0;
  let closed = false;

  const open = (): void => {
    if (closed) return;
    socket = new WebSocket(url);

    socket.onopen = () => {
      attempts = 0;
      useJourneyStore.getState().setConnection('panel');
    };

    socket.onmessage = (message) => {
      const event = parseDemoEvent(message.data);
      if (event) useJourneyStore.getState().applyEvent(event);
    };

    socket.onerror = () => {
      // onclose always follows in RN; retry scheduling lives there.
    };

    socket.onclose = () => {
      if (closed) return;
      if (useJourneyStore.getState().connection === 'panel') {
        useJourneyStore.getState().setConnection('offline');
      }
      attempts += 1;
      if (attempts >= maxAttempts) {
        options.onGiveUp?.();
        return;
      }
      const backoffMs = Math.min(1000 * 2 ** (attempts - 1), MAX_BACKOFF_MS);
      retryTimer = setTimeout(open, backoffMs);
    };
  };

  open();

  return () => {
    closed = true;
    if (retryTimer) clearTimeout(retryTimer);
    socket?.close();
    socket = null;
  };
}

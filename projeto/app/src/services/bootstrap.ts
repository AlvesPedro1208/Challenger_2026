import { httpBaseUrl } from '@/services/connection';
import { hydrateFromCache, saveJourneyCache } from '@/state/persistence';
import type { BootstrapData } from '@/state/store';
import { useJourneyStore } from '@/state/store';

const BOOTSTRAP_TIMEOUT_MS = 2500;

export type BootstrapSource = 'server' | 'cache' | 'fixture';

/** Matches the sp-rio-nightly scenario so the app makes sense without a server. */
const fixtureBootstrap: BootstrapData = {
  trip: {
    id: 'sp-rio-2230',
    origin: 'Sao Paulo (Tiete)',
    destination: 'Rio de Janeiro (Novo Rio)',
    departureIso: '2026-09-13T22:30:00-03:00',
    arrivalIso: '2026-09-14T06:10:00-03:00',
    company: 'Viacao Cometa',
    busClass: 'Semi-leito',
    seat: '17',
    platform: '45',
  },
  ticket: {
    tripId: 'sp-rio-2230',
    passengerName: 'Pedro Alves',
    seat: '17',
    qrPayload: 'JV|sp-rio-2230|17|PEDRO-ALVES',
  },
  stops: [],
};

export async function fetchBootstrap(baseUrl = httpBaseUrl()): Promise<BootstrapData | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BOOTSTRAP_TIMEOUT_MS);
  try {
    const response = await fetch(`${baseUrl}/api/bootstrap`, { signal: controller.signal });
    if (!response.ok) return null;
    const data: unknown = await response.json();
    if (data === null || typeof data !== 'object') return null;
    return data as BootstrapData;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Hydrates the store at startup: server first, then the offline cache, then
 * the embedded fixture. Server data is written back to the cache for the
 * airplane-mode act.
 */
export async function runBootstrap(): Promise<BootstrapSource> {
  const store = useJourneyStore.getState();

  const data = await fetchBootstrap();
  if (data && (data.trip || data.ticket)) {
    store.hydrateBootstrap(data);
    void saveJourneyCache({
      trip: data.trip ?? null,
      ticket: data.ticket ?? null,
      stops: data.stops ?? [],
    });
    return 'server';
  }

  if (await hydrateFromCache()) return 'cache';

  store.hydrateBootstrap(fixtureBootstrap);
  return 'fixture';
}

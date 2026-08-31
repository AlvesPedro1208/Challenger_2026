import {
  DAILY_DELAY_SERIES,
  DEMO_TICKET,
  DEMO_TRIP,
  ROUTE_STATS,
  STOPS,
  TIETE_INDOOR_MAP,
} from '@jornada/shared';

import { httpBaseUrl } from '@/services/connection';
import { hydrateFromCache, saveJourneyCache } from '@/state/persistence';
import type { BootstrapData, JourneySnapshot } from '@/state/store';
import { useJourneyStore } from '@/state/store';

const BOOTSTRAP_TIMEOUT_MS = 2500;

export type BootstrapSource = 'server' | 'cache' | 'fixture';

/** Matches the sp-rio-nightly scenario so the app makes sense without a server. */
const fixtureBootstrap: BootstrapData = {
  trip: DEMO_TRIP,
  ticket: DEMO_TICKET,
  stops: STOPS,
  stats: ROUTE_STATS,
  indoorMap: TIETE_INDOOR_MAP,
  dailySeries: DAILY_DELAY_SERIES,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const hasStringFields = (value: Record<string, unknown>, fields: string[]): boolean =>
  fields.every((field) => typeof value[field] === 'string');

function isValidTrip(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasStringFields(value, [
      'id',
      'origin',
      'destination',
      'departureIso',
      'arrivalIso',
      'company',
      'busClass',
      'seat',
      'platform',
    ])
  );
}

function isValidTicket(value: unknown): boolean {
  return (
    isRecord(value) && hasStringFields(value, ['tripId', 'passengerName', 'seat', 'qrPayload'])
  );
}

function isValidStop(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasStringFields(value, ['id', 'name']) &&
    typeof value.lat === 'number' &&
    typeof value.lng === 'number' &&
    typeof value.scheduledDwellMin === 'number' &&
    Array.isArray(value.pois)
  );
}

function isValidStats(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.last60d)) return false;
  const { riskPct, avgDelayMin, sampleSize, histogram } = value.last60d;
  return (
    typeof riskPct === 'number' &&
    typeof avgDelayMin === 'number' &&
    typeof sampleSize === 'number' &&
    Array.isArray(histogram)
  );
}

function isValidIndoorMap(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.viewBox === 'string' &&
    Array.isArray(value.platforms) &&
    Array.isArray(value.gates) &&
    Array.isArray(value.services)
  );
}

function isValidDailyPoint(value: unknown): boolean {
  return isRecord(value) && typeof value.date === 'string' && typeof value.delayMin === 'number';
}

/** Minimal structural validation of the /api/bootstrap payload. */
export function parseBootstrapData(data: unknown): BootstrapData | null {
  if (!isRecord(data)) return null;
  const { trip, ticket, stops, stats, indoorMap, dailySeries, serverTimeIso } = data;
  if (trip != null && !isValidTrip(trip)) return null;
  if (ticket != null && !isValidTicket(ticket)) return null;
  if (stops != null && (!Array.isArray(stops) || !stops.every(isValidStop))) return null;
  if (stats != null && !isValidStats(stats)) return null;
  if (indoorMap != null && !isValidIndoorMap(indoorMap)) return null;
  if (dailySeries != null && (!Array.isArray(dailySeries) || !dailySeries.every(isValidDailyPoint)))
    return null;
  if (serverTimeIso != null && typeof serverTimeIso !== 'string') return null;
  return data as BootstrapData;
}

export async function fetchBootstrap(baseUrl = httpBaseUrl()): Promise<BootstrapData | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BOOTSTRAP_TIMEOUT_MS);
  try {
    const response = await fetch(`${baseUrl}/api/bootstrap`, { signal: controller.signal });
    if (!response.ok) return null;
    const data: unknown = await response.json();
    return parseBootstrapData(data);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** The journey data a bootstrap source is expected to provide. */
export type BootstrapFields = Pick<
  JourneySnapshot,
  'trip' | 'ticket' | 'stops' | 'stats' | 'indoorMap' | 'dailySeries'
>;

const BOOTSTRAP_KEYS: (keyof BootstrapFields)[] = [
  'trip',
  'ticket',
  'stops',
  'stats',
  'indoorMap',
  'dailySeries',
];

/** A hole in the journey data: a missing object or an empty list. */
const isEmptyField = (value: unknown): boolean =>
  value == null || (Array.isArray(value) && value.length === 0);

/**
 * The fields `current` is still missing, taken from `fallback`. A legacy cache
 * holding only trip/ticket/stops leaves the terminal map and the stats empty.
 * Whatever is already there wins, so server and cache data are never
 * overwritten, and the result carries no `serverTimeIso`: completing data must
 * not move the clock.
 */
export function completeBootstrapData(
  current: BootstrapFields,
  fallback: BootstrapData,
): BootstrapData {
  // Values are copied key by key out of a BootstrapData, so the accumulator
  // ends up with exactly that shape.
  const patch: Record<string, unknown> = {};
  for (const key of BOOTSTRAP_KEYS) {
    const value = fallback[key];
    if (isEmptyField(current[key]) && !isEmptyField(value)) patch[key] = value;
  }
  return patch as BootstrapData;
}

/** Fills whatever the chosen source left empty with the embedded fixture. */
function completeFromFixture(): void {
  const store = useJourneyStore.getState();
  const patch = completeBootstrapData(store, fixtureBootstrap);
  if (Object.keys(patch).length > 0) store.hydrateBootstrap(patch);
}

/**
 * Hydrates the store at startup: server first, then the offline cache, then
 * the embedded fixture. Server data is written back to the cache for the
 * airplane-mode act. Whichever source answers, the fixture completes the
 * fields it did not provide, so a partial payload or a cache written by an
 * older build never leaves a screen without data.
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
    completeFromFixture();
    return 'server';
  }

  const cached = await hydrateFromCache();
  completeFromFixture();
  return cached ? 'cache' : 'fixture';
}

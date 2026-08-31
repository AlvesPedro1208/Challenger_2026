import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  DailyDelayPoint,
  IndoorMap,
  RouteStats,
  Stop,
  Ticket,
  Trip,
} from '@jornada/shared';

import { useJourneyStore, type JourneySnapshot } from '@/state/store';

// Key stays at v1 on purpose: caches written by earlier builds only hold
// {trip, ticket, stops} and are still useful, so the parser fills the missing
// fields instead of discarding the whole entry.
const CACHE_KEY = 'jornada/journey-cache/v1';

export interface JourneyCache {
  trip: Trip | null;
  ticket: Ticket | null;
  stops: Stop[];
  stats: RouteStats | null;
  indoorMap: IndoorMap | null;
  dailySeries: DailyDelayPoint[];
}

/** Fields a writer may omit; omitted ones keep the value already known. */
export type JourneyCacheInput = Partial<JourneyCache>;

export const EMPTY_JOURNEY_CACHE: JourneyCache = {
  trip: null,
  ticket: null,
  stops: [],
  stats: null,
  indoorMap: null,
  dailySeries: [],
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const asObject = <T>(value: unknown): T | null => (isRecord(value) ? (value as T) : null);

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

/**
 * Reads a stored cache back into full shape. Missing or malformed fields
 * degrade to the empty value instead of failing the whole hydration.
 */
export function parseJourneyCache(raw: unknown): JourneyCache | null {
  if (!isRecord(raw)) return null;
  return {
    trip: asObject<Trip>(raw.trip),
    ticket: asObject<Ticket>(raw.ticket),
    stops: asArray<Stop>(raw.stops),
    stats: asObject<RouteStats>(raw.stats),
    indoorMap: asObject<IndoorMap>(raw.indoorMap),
    dailySeries: asArray<DailyDelayPoint>(raw.dailySeries),
  };
}

/** Applies a partial write over a base snapshot; `undefined` means "unchanged". */
export function mergeJourneyCache(base: JourneyCache, input: JourneyCacheInput): JourneyCache {
  return {
    trip: input.trip !== undefined ? input.trip : base.trip,
    ticket: input.ticket !== undefined ? input.ticket : base.ticket,
    stops: input.stops !== undefined ? input.stops : base.stops,
    stats: input.stats !== undefined ? input.stats : base.stats,
    indoorMap: input.indoorMap !== undefined ? input.indoorMap : base.indoorMap,
    dailySeries: input.dailySeries !== undefined ? input.dailySeries : base.dailySeries,
  };
}

/** The cacheable slice of the store. */
export function cacheFromState(state: JourneySnapshot): JourneyCache {
  return {
    trip: state.trip,
    ticket: state.ticket,
    stops: state.stops,
    stats: state.stats,
    indoorMap: state.indoorMap,
    dailySeries: state.dailySeries,
  };
}

/**
 * Persists the journey cache. Callers that only know part of the journey (the
 * bootstrap writes trip/ticket/stops) keep the remaining fields: the live store
 * is the base, so a partial write can never drop the indoor map or the stats.
 */
export async function saveJourneyCache(input: JourneyCacheInput): Promise<void> {
  try {
    const cache = mergeJourneyCache(cacheFromState(useJourneyStore.getState()), input);
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Cache is best effort; the live connection remains the source of truth.
  }
}

export async function loadJourneyCache(): Promise<JourneyCache | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return parseJourneyCache(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function clearJourneyCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch {
    // Ignore: worst case a stale trip shows until the next hydration.
  }
}

/**
 * Restores ticket, trip, itinerary, terminal map and stats from disk so the
 * terminal and stats screens still render in airplane mode. Returns true when a
 * cache existed.
 */
export async function hydrateFromCache(): Promise<boolean> {
  const cache = await loadJourneyCache();
  if (!cache || (!cache.trip && !cache.ticket)) return false;
  useJourneyStore.getState().hydrateBootstrap(cache);
  return true;
}

/**
 * Writes the cacheable slice to disk whenever it changes in the store.
 * Returns an unsubscribe function.
 */
export function startJourneyCachePersistence(): () => void {
  return useJourneyStore.subscribe((state, prev) => {
    const unchanged =
      state.trip === prev.trip &&
      state.ticket === prev.ticket &&
      state.stops === prev.stops &&
      state.stats === prev.stats &&
      state.indoorMap === prev.indoorMap &&
      state.dailySeries === prev.dailySeries;
    if (unchanged) return;
    if (!state.trip && !state.ticket) return;
    void saveJourneyCache(cacheFromState(state));
  });
}

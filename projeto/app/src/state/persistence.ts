import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Stop, Ticket, Trip } from '@jornada/shared';

import { useJourneyStore } from '@/state/store';

const CACHE_KEY = 'jornada/journey-cache/v1';

export interface JourneyCache {
  trip: Trip | null;
  ticket: Ticket | null;
  stops: Stop[];
}

export async function saveJourneyCache(cache: JourneyCache): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Cache is best effort; the live connection remains the source of truth.
  }
}

export async function loadJourneyCache(): Promise<JourneyCache | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const cache = parsed as Partial<JourneyCache>;
    return {
      trip: cache.trip ?? null,
      ticket: cache.ticket ?? null,
      stops: Array.isArray(cache.stops) ? cache.stops : [],
    };
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
 * Restores ticket, trip and itinerary from disk so the QR code and the
 * itinerary still render in airplane mode. Returns true when a cache existed.
 */
export async function hydrateFromCache(): Promise<boolean> {
  const cache = await loadJourneyCache();
  if (!cache || (!cache.trip && !cache.ticket)) return false;
  useJourneyStore.getState().hydrateBootstrap(cache);
  return true;
}

/**
 * Writes trip/ticket/itinerary to disk whenever they change in the store.
 * Returns an unsubscribe function.
 */
export function startJourneyCachePersistence(): () => void {
  return useJourneyStore.subscribe((state, prev) => {
    if (state.trip === prev.trip && state.ticket === prev.ticket && state.stops === prev.stops) {
      return;
    }
    if (!state.trip && !state.ticket) return;
    void saveJourneyCache({ trip: state.trip, ticket: state.ticket, stops: state.stops });
  });
}

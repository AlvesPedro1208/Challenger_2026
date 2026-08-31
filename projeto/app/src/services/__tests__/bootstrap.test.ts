import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  DAILY_DELAY_SERIES,
  DEMO_TICKET,
  DEMO_TRIP,
  ROUTE_STATS,
  STOPS,
  TIETE_INDOOR_MAP,
} from '@jornada/shared';

import type { BootstrapData } from '@/state/store';
import { useJourneyStore } from '@/state/store';

import { completeBootstrapData, runBootstrap, type BootstrapFields } from '../bootstrap';

/* eslint-disable @typescript-eslint/no-require-imports -- jest.mock factories are hoisted above imports */
// The module under test reaches AsyncStorage through the persistence layer,
// whose native module is null under Jest.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
/* eslint-enable @typescript-eslint/no-require-imports */

const CACHE_KEY = 'jornada/journey-cache/v1';

const emptyFields: BootstrapFields = {
  trip: null,
  ticket: null,
  stops: [],
  stats: null,
  indoorMap: null,
  dailySeries: [],
};

const fixture: BootstrapData = {
  trip: DEMO_TRIP,
  ticket: DEMO_TICKET,
  stops: STOPS,
  stats: ROUTE_STATS,
  indoorMap: TIETE_INDOOR_MAP,
  dailySeries: DAILY_DELAY_SERIES,
};

describe('completeBootstrapData', () => {
  it('fills every field when nothing is known yet', () => {
    expect(completeBootstrapData(emptyFields, fixture)).toEqual(fixture);
  });

  it('completes only the holes left by a legacy trip/ticket/stops cache', () => {
    const cached: BootstrapFields = {
      ...emptyFields,
      trip: DEMO_TRIP,
      ticket: DEMO_TICKET,
      stops: STOPS,
    };

    expect(completeBootstrapData(cached, fixture)).toEqual({
      stats: ROUTE_STATS,
      indoorMap: TIETE_INDOOR_MAP,
      dailySeries: DAILY_DELAY_SERIES,
    });
  });

  it('never overwrites data that is already there', () => {
    const ownTrip = { ...DEMO_TRIP, id: 'trip-from-server', platform: '12' };
    const ownStops = [STOPS[0]!];
    const current: BootstrapFields = {
      ...emptyFields,
      trip: ownTrip,
      stops: ownStops,
      indoorMap: TIETE_INDOOR_MAP,
    };

    const patch = completeBootstrapData(current, fixture);

    expect(patch.trip).toBeUndefined();
    expect(patch.stops).toBeUndefined();
    expect(patch.indoorMap).toBeUndefined();
    expect(patch.ticket).toBe(DEMO_TICKET);
  });

  it('returns an empty patch when the state is already complete', () => {
    const complete: BootstrapFields = {
      trip: DEMO_TRIP,
      ticket: DEMO_TICKET,
      stops: STOPS,
      stats: ROUTE_STATS,
      indoorMap: TIETE_INDOOR_MAP,
      dailySeries: DAILY_DELAY_SERIES,
    };

    expect(completeBootstrapData(complete, fixture)).toEqual({});
  });

  it('never carries a clock, so completing data cannot move time', () => {
    const patch = completeBootstrapData(emptyFields, {
      ...fixture,
      serverTimeIso: '2026-09-13T20:00:00-03:00',
    });

    expect(patch.serverTimeIso).toBeUndefined();
  });

  it('leaves a hole open when the fallback has nothing to offer', () => {
    expect(completeBootstrapData(emptyFields, { stops: [], dailySeries: [] })).toEqual({});
  });
});

describe('runBootstrap with no server', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(async () => {
    globalThis.fetch = jest.fn(async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    await AsyncStorage.clear();
    useJourneyStore.getState().reset();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    useJourneyStore.getState().reset();
  });

  it('completes a legacy cache with the embedded fixture', async () => {
    await AsyncStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ trip: DEMO_TRIP, ticket: DEMO_TICKET, stops: STOPS }),
    );

    const source = await runBootstrap();
    const state = useJourneyStore.getState();

    expect(source).toBe('cache');
    expect(state.trip).toEqual(DEMO_TRIP);
    expect(state.indoorMap).toEqual(TIETE_INDOOR_MAP);
    expect(state.stats).toEqual(ROUTE_STATS);
    expect(state.dailySeries).toEqual(DAILY_DELAY_SERIES);
  });

  it('keeps the cached trip instead of the fixture one', async () => {
    const cachedTrip = { ...DEMO_TRIP, seat: '99', platform: '12' };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ trip: cachedTrip, stops: [] }));

    await runBootstrap();

    expect(useJourneyStore.getState().trip).toEqual(cachedTrip);
  });

  it('falls back to the whole fixture with no cache at all', async () => {
    const source = await runBootstrap();
    const state = useJourneyStore.getState();

    expect(source).toBe('fixture');
    expect(state.ticket).toEqual(DEMO_TICKET);
    expect(state.indoorMap).toEqual(TIETE_INDOOR_MAP);
  });
});

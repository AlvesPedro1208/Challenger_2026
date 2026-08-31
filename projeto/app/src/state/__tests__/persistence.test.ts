import { describe, expect, it, jest } from '@jest/globals';

import {
  DAILY_DELAY_SERIES,
  DEMO_TICKET,
  DEMO_TRIP,
  ROUTE_STATS,
  STOPS,
  TIETE_INDOOR_MAP,
} from '@jornada/shared';

import { initialJourneyState, useJourneyStore } from '../store';
import {
  EMPTY_JOURNEY_CACHE,
  hydrateFromCache,
  mergeJourneyCache,
  parseJourneyCache,
  saveJourneyCache,
  startJourneyCachePersistence,
  type JourneyCache,
} from '../persistence';

/* eslint-disable @typescript-eslint/no-require-imports -- jest.mock factories are hoisted above imports */
// The module under test imports AsyncStorage at load time, and its native
// module is null under Jest; only the pure helpers are exercised here.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
/* eslint-enable @typescript-eslint/no-require-imports */

const fullCache: JourneyCache = {
  trip: DEMO_TRIP,
  ticket: DEMO_TICKET,
  stops: STOPS,
  stats: ROUTE_STATS,
  indoorMap: TIETE_INDOOR_MAP,
  dailySeries: DAILY_DELAY_SERIES,
};

describe('parseJourneyCache', () => {
  it('faz round-trip do cache completo', () => {
    expect(parseJourneyCache(JSON.parse(JSON.stringify(fullCache)))).toEqual(fullCache);
  });

  it('reidrata mapa indoor, stats e serie diaria', () => {
    const parsed = parseJourneyCache(JSON.parse(JSON.stringify(fullCache)));
    expect(parsed?.indoorMap).toEqual(TIETE_INDOOR_MAP);
    expect(parsed?.stats).toEqual(ROUTE_STATS);
    expect(parsed?.dailySeries).toHaveLength(DAILY_DELAY_SERIES.length);
  });

  it('aceita cache antigo sem os campos novos', () => {
    const legacy = { trip: DEMO_TRIP, ticket: DEMO_TICKET, stops: STOPS };
    expect(parseJourneyCache(legacy)).toEqual({
      trip: DEMO_TRIP,
      ticket: DEMO_TICKET,
      stops: STOPS,
      stats: null,
      indoorMap: null,
      dailySeries: [],
    });
  });

  it('normaliza campos com tipo errado', () => {
    expect(
      parseJourneyCache({
        trip: DEMO_TRIP,
        stops: 'nao e lista',
        stats: 42,
        indoorMap: 'nao e objeto',
        dailySeries: { date: '2026-09-13' },
      }),
    ).toEqual({
      trip: DEMO_TRIP,
      ticket: null,
      stops: [],
      stats: null,
      indoorMap: null,
      dailySeries: [],
    });
  });

  it('rejeita payload que nao e objeto', () => {
    expect(parseJourneyCache(null)).toBeNull();
    expect(parseJourneyCache('cache')).toBeNull();
    expect(parseJourneyCache([])).toBeNull();
  });
});

describe('mergeJourneyCache', () => {
  it('preserva os campos omitidos pelo autor da escrita', () => {
    // O bootstrap grava so {trip, ticket, stops}; mapa indoor e stats nao podem sumir.
    const merged = mergeJourneyCache(fullCache, {
      trip: DEMO_TRIP,
      ticket: DEMO_TICKET,
      stops: STOPS,
    });
    expect(merged.indoorMap).toEqual(TIETE_INDOOR_MAP);
    expect(merged.stats).toEqual(ROUTE_STATS);
    expect(merged.dailySeries).toEqual(DAILY_DELAY_SERIES);
  });

  it('sobrescreve os campos informados, inclusive com null', () => {
    const merged = mergeJourneyCache(fullCache, { indoorMap: null, stats: null });
    expect(merged.indoorMap).toBeNull();
    expect(merged.stats).toBeNull();
    expect(merged.trip).toEqual(DEMO_TRIP);
  });

  it('usa o cache vazio como base ausente', () => {
    expect(mergeJourneyCache(EMPTY_JOURNEY_CACHE, {})).toEqual(EMPTY_JOURNEY_CACHE);
  });
});

describe('ciclo salvar + reidratar', () => {
  it('devolve mapa indoor e stats ao store em modo offline', async () => {
    useJourneyStore.setState(initialJourneyState);
    const stopPersistence = startJourneyCachePersistence();
    useJourneyStore.getState().hydrateBootstrap({
      trip: DEMO_TRIP,
      ticket: DEMO_TICKET,
      stops: STOPS,
      stats: ROUTE_STATS,
      indoorMap: TIETE_INDOOR_MAP,
      dailySeries: DAILY_DELAY_SERIES,
    });
    // O bootstrap grava depois, so com trip/ticket/stops; nao pode apagar o resto.
    await saveJourneyCache({ trip: DEMO_TRIP, ticket: DEMO_TICKET, stops: STOPS });
    stopPersistence();

    useJourneyStore.setState(initialJourneyState);
    expect(await hydrateFromCache()).toBe(true);
    expect(useJourneyStore.getState().indoorMap).toEqual(TIETE_INDOOR_MAP);
    expect(useJourneyStore.getState().stats).toEqual(ROUTE_STATS);
    expect(useJourneyStore.getState().dailySeries).toEqual(DAILY_DELAY_SERIES);
    useJourneyStore.setState(initialJourneyState);
  });
});

import { describe, expect, it, jest } from '@jest/globals';

import { STOPS } from '@jornada/shared';

import type { JourneySnapshot } from '@/state/store';
import { initialJourneyState } from '@/state/store';

import { diffNotifications } from '../notifications';

// `jest.mock` is hoisted above the imports by babel-plugin-jest-hoist, so the
// mock is registered before `../notifications` pulls in expo-notifications.
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
}));

const snapshot = (patch: Partial<JourneySnapshot>): JourneySnapshot => ({
  ...initialJourneyState,
  ...patch,
});

const trip = {
  id: 'sp-rio-2230',
  origin: 'São Paulo (Terminal Tietê)',
  destination: 'Rio de Janeiro (Terminal Novo Rio)',
  departureIso: '2026-09-13T22:30:00-03:00',
  arrivalIso: '2026-09-14T06:10:00-03:00',
  company: 'Viação Aurora',
  busClass: 'Semi Leito',
  seat: '28',
  platform: '45',
};

describe('diffNotifications', () => {
  it('returns nothing when nothing relevant changed', () => {
    const state = snapshot({ trip });
    expect(diffNotifications(state, state)).toEqual([]);
  });

  it('announces a platform change in pt-BR', () => {
    const next = snapshot({
      platform: { current: '48', pendingChange: { from: '45', to: '48', walkMinutes: 4 } },
    });
    const [notification] = diffNotifications(initialJourneyState, next);

    expect(notification?.key).toBe('platform:45>48');
    expect(notification?.title).toBe('Plataforma alterada');
    expect(notification?.body).toBe('45 → 48 · 4 min de caminhada');
  });

  it('does not repeat the same platform change', () => {
    const state = snapshot({
      platform: { current: '48', pendingChange: { from: '45', to: '48', walkMinutes: 4 } },
    });
    expect(diffNotifications(state, state)).toEqual([]);
  });

  it('announces the next stop by name', () => {
    const next = snapshot({
      stops: STOPS,
      approachingStop: { stopId: 'stop-aparecida', inMinutes: 8 },
    });
    const [notification] = diffNotifications(initialJourneyState, next);

    expect(notification?.key).toBe('stop:stop-aparecida');
    expect(notification?.title).toBe('Próxima parada');
    expect(notification?.body).toBe('Posto Frango Assado - Aparecida em 8 min');
  });

  it('falls back to a generic body when the stop is unknown', () => {
    const next = snapshot({ approachingStop: { stopId: 'stop-x', inMinutes: 12 } });
    const [notification] = diffNotifications(initialJourneyState, next);

    expect(notification?.body).toBe('Próxima parada em 12 min');
  });

  it('announces the risk of missing the departure', () => {
    const next = snapshot({
      risk: {
        riskPct: 38,
        canRebook: true,
        rebookFeeBRL: 20,
        refundDeadlineIso: '2026-09-13T21:30:00-03:00',
        refundRetentionPct: 5,
      },
    });
    const [notification] = diffNotifications(initialJourneyState, next);

    expect(notification?.key).toBe('risk:38');
    expect(notification?.title).toBe('Risco de perder o embarque');
    expect(notification?.body).toBe('38% de risco · remarcação disponível por R$ 20');
  });

  it('announces the risk without rebooking when it is not available', () => {
    const next = snapshot({
      risk: {
        riskPct: 71,
        canRebook: false,
        rebookFeeBRL: 0,
        refundDeadlineIso: '2026-09-13T21:30:00-03:00',
        refundRetentionPct: 5,
      },
    });
    const [notification] = diffNotifications(initialJourneyState, next);

    expect(notification?.body).toBe('71% de risco de perder o embarque');
  });

  it('welcomes the passenger at the destination city', () => {
    const next = snapshot({ trip, arrived: true });
    const [notification] = diffNotifications(snapshot({ trip }), next);

    expect(notification?.key).toBe('arrival');
    expect(notification?.title).toBe('Boas-vindas ao destino');
    expect(notification?.body).toBe('Chegada em Rio de Janeiro · veja recomendações para agora');
  });

  it('welcomes the passenger even without a trip loaded', () => {
    const [notification] = diffNotifications(initialJourneyState, snapshot({ arrived: true }));

    expect(notification?.body).toBe('Você chegou ao destino · veja recomendações para agora');
  });

  it('emits every pending notification of a combined update', () => {
    const next = snapshot({
      stops: STOPS,
      approachingStop: { stopId: 'stop-resende', inMinutes: 8 },
      arrived: true,
    });
    const keys = diffNotifications(initialJourneyState, next).map((item) => item.key);

    expect(keys).toEqual(['stop:stop-resende', 'arrival']);
  });
});

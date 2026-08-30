import { describe, expect, it } from '@jest/globals';

import { STOPS } from '@jornada/shared';

import { remainingStops } from '../routeProgress';

// Telemetry samples taken from the SP -> Rio demo scenario.
const BEFORE_APARECIDA = { lat: -22.8846, lng: -45.2812 };
const AFTER_APARECIDA = { lat: -22.8008, lng: -45.1934 };
const AT_RESENDE = { lat: -22.4708, lng: -44.4512 };
const AFTER_RESENDE = { lat: -22.5386, lng: -44.1032 };

const ids = (stops: { id: string }[]): string[] => stops.map((stop) => stop.id);

describe('remainingStops', () => {
  it('considera todas as paradas pendentes quando ainda não há posição', () => {
    expect(ids(remainingStops(STOPS, null))).toEqual(['stop-aparecida', 'stop-resende']);
  });

  it('mantém as duas paradas antes de Aparecida', () => {
    expect(ids(remainingStops(STOPS, BEFORE_APARECIDA))).toEqual([
      'stop-aparecida',
      'stop-resende',
    ]);
  });

  it('descarta Aparecida depois que o ônibus passa por ela', () => {
    expect(ids(remainingStops(STOPS, AFTER_APARECIDA))).toEqual(['stop-resende']);
  });

  it('mantém a parada em que o ônibus está no momento', () => {
    expect(ids(remainingStops(STOPS, AT_RESENDE))).toEqual(['stop-resende']);
  });

  it('não sobra parada alguma depois de Resende', () => {
    expect(remainingStops(STOPS, AFTER_RESENDE)).toEqual([]);
  });

  it('lida com uma lista de paradas vazia', () => {
    expect(remainingStops([], AFTER_APARECIDA)).toEqual([]);
  });

  it('preserva a ordem original das paradas', () => {
    const reversed = [...STOPS].reverse();

    expect(ids(remainingStops(reversed, BEFORE_APARECIDA))).toEqual([
      'stop-resende',
      'stop-aparecida',
    ]);
  });
});

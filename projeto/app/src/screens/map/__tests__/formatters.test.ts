import { describe, expect, it } from '@jest/globals';

import type { Poi, Stop } from '@jornada/shared';

import {
  formatMinutes,
  formatRating,
  formatSimClock,
  formatSpeed,
  simMinutesBetween,
  topRatedPois,
} from '../formatters';

const poi = (id: string, rating: number): Poi => ({
  id,
  name: `POI ${id}`,
  category: 'food',
  rating,
  priceLevel: 2,
});

const stopWith = (pois: Poi[]): Stop => ({
  id: 'stop-test',
  name: 'Parada de teste',
  lat: -22.8486,
  lng: -45.2327,
  scheduledDwellMin: 20,
  pois,
});

describe('formatSimClock', () => {
  it('lê HH:mm direto do ISO, sem converter para o fuso do aparelho', () => {
    expect(formatSimClock('2026-09-14T06:35:00-03:00')).toBe('06:35');
  });

  it('preserva a hora de parede mesmo com outro offset', () => {
    expect(formatSimClock('2026-09-14T06:35:00Z')).toBe('06:35');
  });

  it('retorna null para entrada nula', () => {
    expect(formatSimClock(null)).toBeNull();
  });

  it('retorna null para ISO inválido', () => {
    expect(formatSimClock('amanhã de manhã')).toBeNull();
    expect(formatSimClock('')).toBeNull();
    expect(formatSimClock('2026-09-14')).toBeNull();
  });
});

describe('formatSpeed', () => {
  it('arredonda para km/h inteiro', () => {
    expect(formatSpeed(87.4)).toBe('87 km/h');
    expect(formatSpeed(87.6)).toBe('88 km/h');
  });

  it('formata ônibus parado', () => {
    expect(formatSpeed(0)).toBe('0 km/h');
  });
});

describe('formatMinutes', () => {
  it('formata minutos', () => {
    expect(formatMinutes(125)).toBe('125 min');
  });

  it('mantém o zero, que significa "chegando agora"', () => {
    expect(formatMinutes(0)).toBe('0 min');
  });

  it('degrada para placeholder quando não há valor', () => {
    expect(formatMinutes(null)).toBe('--');
  });
});

describe('formatRating', () => {
  it('usa vírgula decimal com uma casa', () => {
    expect(formatRating(4.7)).toBe('4,7');
  });

  it('completa a casa decimal de notas inteiras', () => {
    expect(formatRating(5)).toBe('5,0');
    expect(formatRating(0)).toBe('0,0');
  });
});

describe('topRatedPois', () => {
  it('ordena por nota decrescente e limita a 3 por padrão', () => {
    const stop = stopWith([poi('a', 3.9), poi('b', 4.7), poi('c', 4.1), poi('d', 4.4)]);

    expect(topRatedPois(stop).map((p) => p.id)).toEqual(['b', 'd', 'c']);
  });

  it('respeita o limite informado', () => {
    const stop = stopWith([poi('a', 3.9), poi('b', 4.7), poi('c', 4.1)]);

    expect(topRatedPois(stop, 1).map((p) => p.id)).toEqual(['b']);
  });

  it('devolve lista vazia quando a parada não tem POIs', () => {
    expect(topRatedPois(stopWith([]))).toEqual([]);
  });

  it('não muta a lista original da parada', () => {
    const stop = stopWith([poi('a', 3.9), poi('b', 4.7)]);

    topRatedPois(stop);

    expect(stop.pois.map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('devolve todos quando há menos POIs que o limite', () => {
    const stop = stopWith([poi('a', 4.2)]);

    expect(topRatedPois(stop)).toHaveLength(1);
  });
});

describe('simMinutesBetween', () => {
  it('conta os minutos entre dois instantes do roteiro', () => {
    expect(simMinutesBetween('2026-09-14T01:36:00-03:00', '2026-09-14T01:56:00-03:00')).toBe(20);
  });

  it('atravessa a virada do dia', () => {
    expect(simMinutesBetween('2026-09-13T23:45:00-03:00', '2026-09-14T00:05:00-03:00')).toBe(20);
  });

  it('vale zero quando os instantes são iguais', () => {
    expect(simMinutesBetween('2026-09-14T03:40:00-03:00', '2026-09-14T03:40:00-03:00')).toBe(0);
  });

  it('devolve negativo quando o destino é anterior à origem', () => {
    expect(simMinutesBetween('2026-09-14T03:40:00-03:00', '2026-09-14T03:30:00-03:00')).toBe(-10);
  });

  it('retorna null quando falta um dos instantes', () => {
    expect(simMinutesBetween(null, '2026-09-14T03:40:00-03:00')).toBeNull();
    expect(simMinutesBetween('2026-09-14T03:40:00-03:00', null)).toBeNull();
  });

  it('retorna null para ISO inválido', () => {
    expect(simMinutesBetween('ontem', '2026-09-14T03:40:00-03:00')).toBeNull();
    expect(simMinutesBetween('2026-09-14T03:40:00-03:00', 'daqui a pouco')).toBeNull();
  });
});

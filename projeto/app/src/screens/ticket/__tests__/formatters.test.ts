import { describe, expect, it } from '@jest/globals';

import { formatDelay, formatDepartureIso } from '../formatters';

describe('formatDepartureIso', () => {
  it('formata data e hora de parede a partir de um ISO com offset', () => {
    expect(formatDepartureIso('2026-09-13T22:30:00-03:00')).toEqual({
      date: '13 de setembro',
      time: '22:30',
    });
  });

  it('ignora o fuso do dispositivo e preserva a hora do ISO', () => {
    expect(formatDepartureIso('2026-01-05T06:05:00Z')).toEqual({
      date: '5 de janeiro',
      time: '06:05',
    });
  });

  it('retorna null para string malformada', () => {
    expect(formatDepartureIso('13/09/2026 22:30')).toBeNull();
    expect(formatDepartureIso('')).toBeNull();
    expect(formatDepartureIso('2026-09-13')).toBeNull();
  });

  it('retorna null para mes fora de faixa', () => {
    expect(formatDepartureIso('2026-13-01T10:00:00-03:00')).toBeNull();
    expect(formatDepartureIso('2026-00-01T10:00:00-03:00')).toBeNull();
  });
});

describe('formatDelay', () => {
  it('usa singular para 1 minuto', () => {
    expect(formatDelay(1)).toBe('Atraso de 1 minuto');
  });

  it('usa plural para zero', () => {
    expect(formatDelay(0)).toBe('Atraso de 0 minutos');
  });

  it('usa plural para mais de um minuto', () => {
    expect(formatDelay(12)).toBe('Atraso de 12 minutos');
  });
});

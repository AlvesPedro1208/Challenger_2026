import { describe, expect, it } from '@jest/globals';

import {
  countdownBetween,
  formatBRL,
  formatCountdown,
  formatDateTimeLabel,
  formatDepartureLabel,
  formatTimeHM,
  isPastDeadline,
  parseIsoParts,
} from '../format';

describe('parseIsoParts', () => {
  it('extrai as partes de parede do ISO com offset', () => {
    expect(parseIsoParts('2026-09-13T22:30:00-03:00')).toEqual({
      year: 2026,
      month: 9,
      day: 13,
      hour: 22,
      minute: 30,
    });
  });

  it('retorna null para string invalida', () => {
    expect(parseIsoParts('agora ha pouco')).toBeNull();
  });
});

describe('formatTimeHM', () => {
  it('formata HH:mm sem converter fuso', () => {
    expect(formatTimeHM('2026-09-14T06:35:00-03:00')).toBe('06:35');
  });

  it('degrada para placeholder em entrada invalida', () => {
    expect(formatTimeHM('???')).toBe('--:--');
  });
});

describe('formatDepartureLabel', () => {
  it('monta dia da semana, data e hora', () => {
    expect(formatDepartureLabel('2026-09-13T22:30:00-03:00')).toBe('Dom, 13 de set · 22:30');
  });
});

describe('formatDateTimeLabel', () => {
  it('monta data e hora para prazos', () => {
    expect(formatDateTimeLabel('2026-09-13T21:30:00-03:00')).toBe('13 de set às 21:30');
  });
});

describe('countdownBetween', () => {
  it('calcula horas e minutos ate a partida', () => {
    expect(countdownBetween('2026-09-13T20:00:00-03:00', '2026-09-13T22:30:00-03:00')).toEqual({
      totalMinutes: 150,
      hours: 2,
      minutes: 30,
    });
  });

  it('retorna null sem relogio simulado', () => {
    expect(countdownBetween(null, '2026-09-13T22:30:00-03:00')).toBeNull();
  });

  it('zera quando a partida ja passou', () => {
    expect(countdownBetween('2026-09-13T23:00:00-03:00', '2026-09-13T22:30:00-03:00')).toEqual({
      totalMinutes: 0,
      hours: 0,
      minutes: 0,
    });
  });
});

describe('formatCountdown', () => {
  it('formata horas e minutos', () => {
    expect(formatCountdown({ totalMinutes: 150, hours: 2, minutes: 30 })).toBe('2h 30min');
  });

  it('preenche minutos com zero', () => {
    expect(formatCountdown({ totalMinutes: 125, hours: 2, minutes: 5 })).toBe('2h 05min');
  });

  it('omite horas quando faltam so minutos', () => {
    expect(formatCountdown({ totalMinutes: 45, hours: 0, minutes: 45 })).toBe('45min');
  });

  it('sinaliza partida imediata', () => {
    expect(formatCountdown({ totalMinutes: 0, hours: 0, minutes: 0 })).toBe('Agora');
  });
});

describe('formatBRL', () => {
  it('formata inteiros', () => {
    expect(formatBRL(20)).toBe('R$ 20,00');
  });

  it('formata centavos', () => {
    expect(formatBRL(12.5)).toBe('R$ 12,50');
  });
});

describe('isPastDeadline', () => {
  it('detecta prazo vencido no relogio simulado', () => {
    expect(isPastDeadline('2026-09-13T21:40:00-03:00', '2026-09-13T21:30:00-03:00')).toBe(true);
  });

  it('mantem prazo vigente antes do limite', () => {
    expect(isPastDeadline('2026-09-13T20:05:00-03:00', '2026-09-13T21:30:00-03:00')).toBe(false);
  });

  it('assume vigente sem relogio', () => {
    expect(isPastDeadline(null, '2026-09-13T21:30:00-03:00')).toBe(false);
  });
});

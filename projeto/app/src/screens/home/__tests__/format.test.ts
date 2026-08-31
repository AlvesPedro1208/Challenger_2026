import { describe, expect, it } from '@jest/globals';

import {
  COUNTDOWN_MAX_MINUTES,
  countdownBetween,
  formatBRL,
  formatCountdown,
  formatDateTimeLabel,
  formatDepartureLabel,
  formatTimeHM,
  hoursBetween,
  isPastDeadline,
  parseIsoParts,
  resolveDepartureDisplay,
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

describe('resolveDepartureDisplay', () => {
  const departure = '2026-09-13T22:30:00-03:00';

  it('mostra a contagem regressiva perto da partida', () => {
    expect(resolveDepartureDisplay('2026-09-13T20:00:00-03:00', departure)).toEqual({
      kind: 'countdown',
      label: 'Partida em',
      value: '2h 30min',
    });
  });

  it('mantem a contagem no limite de 24h', () => {
    const clock = new Date(Date.parse(departure) - COUNTDOWN_MAX_MINUTES * 60000).toISOString();
    expect(resolveDepartureDisplay(clock, departure).kind).toBe('countdown');
  });

  it('troca por data programada quando a faixa e implausivel', () => {
    // Cenario do ensaio: app aberto com o relogio real antes de iniciar o cenario.
    expect(resolveDepartureDisplay('2026-08-31T11:13:00-03:00', departure)).toEqual({
      kind: 'scheduled',
      label: 'Partida programada para',
      value: 'Dom, 13 de set · 22:30',
    });
  });

  it('mostra a data programada sem relogio simulado', () => {
    expect(resolveDepartureDisplay(null, departure)).toEqual({
      kind: 'scheduled',
      label: 'Partida programada para',
      value: 'Dom, 13 de set · 22:30',
    });
  });

  it('mantem a contagem quando a partida ja passou', () => {
    expect(resolveDepartureDisplay('2026-09-13T23:00:00-03:00', departure)).toEqual({
      kind: 'countdown',
      label: 'Partida em',
      value: 'Agora',
    });
  });

  it('degrada para estado neutro com partida invalida', () => {
    expect(resolveDepartureDisplay('2026-09-13T20:00:00-03:00', 'quinta que vem')).toEqual({
      kind: 'waiting',
      label: 'Partida',
      value: 'Aguardando início da viagem',
    });
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

describe('hoursBetween', () => {
  it('conta as horas inteiras entre prazo e partida', () => {
    expect(hoursBetween('2026-09-13T21:30:00-03:00', '2026-09-13T22:30:00-03:00')).toBe(1);
    expect(hoursBetween('2026-09-13T19:30:00-03:00', '2026-09-13T22:30:00-03:00')).toBe(3);
  });

  it('trunca a fracao de hora', () => {
    expect(hoursBetween('2026-09-13T20:00:00-03:00', '2026-09-13T22:30:00-03:00')).toBe(2);
  });

  it('retorna null abaixo de uma hora', () => {
    expect(hoursBetween('2026-09-13T22:00:00-03:00', '2026-09-13T22:30:00-03:00')).toBeNull();
  });

  it('retorna null quando o intervalo e negativo', () => {
    expect(hoursBetween('2026-09-13T23:30:00-03:00', '2026-09-13T22:30:00-03:00')).toBeNull();
  });

  it('retorna null para timestamps invalidos', () => {
    expect(hoursBetween('ontem', '2026-09-13T22:30:00-03:00')).toBeNull();
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

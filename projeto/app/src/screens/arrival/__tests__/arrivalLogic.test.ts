import { describe, expect, it } from '@jest/globals';

import { NOVO_RIO_POIS } from '@jornada/shared';

import {
  extractHour,
  filterMealPois,
  filterServicePois,
  getGreeting,
  getMealPeriod,
  getMealSectionTitle,
  parseDestination,
  tripDurationHours,
  welcomeMessage,
} from '../arrivalLogic';

describe('extractHour', () => {
  it('lê a hora direto da string ISO, ignorando o fuso do aparelho', () => {
    expect(extractHour('2026-09-14T06:30:00-03:00')).toBe(6);
    expect(extractHour('2026-09-14T23:05:00-03:00')).toBe(23);
  });

  it('retorna null para relógio ausente ou malformado', () => {
    expect(extractHour(null)).toBeNull();
    expect(extractHour('sem-hora')).toBeNull();
  });
});

describe('getMealPeriod', () => {
  it('mapeia as janelas de refeição', () => {
    expect(getMealPeriod(5)).toBe('breakfast');
    expect(getMealPeriod(6)).toBe('breakfast');
    expect(getMealPeriod(10)).toBe('breakfast');
    expect(getMealPeriod(11)).toBe('lunch');
    expect(getMealPeriod(14)).toBe('lunch');
    expect(getMealPeriod(18)).toBe('dinner');
    expect(getMealPeriod(22)).toBe('dinner');
  });

  it('fora das janelas cai no genérico', () => {
    expect(getMealPeriod(15)).toBe('generic');
    expect(getMealPeriod(23)).toBe('generic');
    expect(getMealPeriod(3)).toBe('generic');
    expect(getMealPeriod(null)).toBe('generic');
  });
});

describe('getGreeting', () => {
  it('saúda conforme a hora simulada', () => {
    expect(getGreeting(6)).toBe('Bom dia');
    expect(getGreeting(13)).toBe('Boa tarde');
    expect(getGreeting(20)).toBe('Boa noite');
    expect(getGreeting(null)).toBe('Olá');
  });
});

describe('filterMealPois', () => {
  it('no café da manhã recomenda apenas cafés, ordenados por avaliação', () => {
    const result = filterMealPois(NOVO_RIO_POIS, 'breakfast');
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((poi) => poi.category === 'coffee')).toBe(true);
    const ratings = result.map((poi) => poi.rating);
    expect(ratings).toEqual([...ratings].sort((a, b) => b - a));
  });

  it('no almoço e no jantar recomenda restaurantes', () => {
    for (const period of ['lunch', 'dinner'] as const) {
      const result = filterMealPois(NOVO_RIO_POIS, period);
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((poi) => poi.category === 'food')).toBe(true);
    }
  });
});

describe('filterServicePois', () => {
  it('reúne farmácia, conveniência e transporte', () => {
    const categories = filterServicePois(NOVO_RIO_POIS).map((poi) => poi.category);
    expect(categories).toEqual(expect.arrayContaining(['pharmacy', 'convenience', 'other']));
  });
});

describe('parseDestination', () => {
  it('separa cidade e terminal', () => {
    expect(parseDestination('Rio de Janeiro (Terminal Novo Rio)')).toEqual({
      city: 'Rio de Janeiro',
      terminal: 'Terminal Novo Rio',
    });
  });

  it('sem parênteses devolve só a cidade', () => {
    expect(parseDestination('Rio de Janeiro')).toEqual({
      city: 'Rio de Janeiro',
      terminal: null,
    });
  });
});

describe('welcomeMessage', () => {
  it('usa o artigo correto para a cidade', () => {
    expect(welcomeMessage('Rio de Janeiro')).toBe('Bem-vindo ao Rio de Janeiro');
    expect(welcomeMessage('Belo Horizonte')).toBe('Bem-vindo a Belo Horizonte');
  });
});

describe('getMealSectionTitle', () => {
  it('nomeia a seção conforme o período', () => {
    expect(getMealSectionTitle('breakfast')).toBe('Para o seu café da manhã');
    expect(getMealSectionTitle('lunch')).toBe('Para o seu almoço');
    expect(getMealSectionTitle('dinner')).toBe('Para o seu jantar');
    expect(getMealSectionTitle('generic')).toBe('Perto do terminal');
  });
});

describe('tripDurationHours', () => {
  it('calcula a duração programada da viagem', () => {
    const hours = tripDurationHours({
      id: 't',
      origin: 'A',
      destination: 'B',
      departureIso: '2026-09-13T22:30:00-03:00',
      arrivalIso: '2026-09-14T06:10:00-03:00',
      company: 'X',
      busClass: 'Y',
      seat: '1',
      platform: '1',
    });
    expect(hours).toBeCloseTo(7.67, 1);
  });
});

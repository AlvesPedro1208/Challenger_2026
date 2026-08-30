import { describe, expect, it } from '@jest/globals';

import { cityName, placeComplement } from '../place';

describe('cityName', () => {
  it('strips the parenthesised terminal from a full place name', () => {
    expect(cityName('São Paulo (Terminal Tietê)')).toBe('São Paulo');
    expect(cityName('Rio de Janeiro (Terminal Novo Rio)')).toBe('Rio de Janeiro');
  });

  it('returns the name untouched when there is no complement', () => {
    expect(cityName('Campinas')).toBe('Campinas');
  });

  it('trims surrounding whitespace', () => {
    expect(cityName('  São Paulo  ')).toBe('São Paulo');
    expect(cityName('São Paulo  (Tietê)  ')).toBe('São Paulo');
  });

  it('returns an empty string for an empty input', () => {
    expect(cityName('')).toBe('');
    expect(cityName('   ')).toBe('');
  });

  it('keeps an unclosed parenthesis as part of the name', () => {
    expect(cityName('São Paulo (Tietê')).toBe('São Paulo (Tietê');
  });
});

describe('placeComplement', () => {
  it('returns the parenthesised terminal', () => {
    expect(placeComplement('São Paulo (Terminal Tietê)')).toBe('Terminal Tietê');
    expect(placeComplement('Rio de Janeiro (Terminal Novo Rio)')).toBe('Terminal Novo Rio');
  });

  it('returns an empty string when there is no complement', () => {
    expect(placeComplement('Campinas')).toBe('');
  });

  it('returns an empty string for an empty input', () => {
    expect(placeComplement('')).toBe('');
    expect(placeComplement('   ')).toBe('');
  });

  it('returns an empty string for an empty pair of parentheses', () => {
    expect(placeComplement('Campinas ()')).toBe('');
  });
});

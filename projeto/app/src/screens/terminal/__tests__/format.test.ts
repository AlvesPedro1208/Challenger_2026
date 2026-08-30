import { describe, expect, it } from '@jest/globals';

import { formatDuration, formatIsoTime, minutesUntil } from '../format';

describe('formatIsoTime', () => {
  it('reads the wall-clock HH:mm straight from the ISO string', () => {
    expect(formatIsoTime('2026-03-14T21:55:00-03:00')).toBe('21:55');
  });

  it('ignores the device timezone (same string, same result)', () => {
    expect(formatIsoTime('2026-03-14T00:40:00-03:00')).toBe('00:40');
  });

  it('returns null for empty or malformed input', () => {
    expect(formatIsoTime(null)).toBeNull();
    expect(formatIsoTime(undefined)).toBeNull();
    expect(formatIsoTime('')).toBeNull();
    expect(formatIsoTime('2026-03-14')).toBeNull();
  });
});

describe('minutesUntil', () => {
  it('counts the minutes ahead of the reference clock', () => {
    expect(minutesUntil('2026-03-14T22:30:00-03:00', '2026-03-14T21:55:00-03:00')).toBe(35);
  });

  it('goes negative once the target is in the past', () => {
    expect(minutesUntil('2026-03-14T21:55:00-03:00', '2026-03-14T22:30:00-03:00')).toBe(-35);
  });

  it('rounds to the nearest minute', () => {
    expect(minutesUntil('2026-03-14T22:00:40-03:00', '2026-03-14T21:59:00-03:00')).toBe(2);
  });

  it('returns null when either side is missing or unparsable', () => {
    expect(minutesUntil(null, '2026-03-14T21:55:00-03:00')).toBeNull();
    expect(minutesUntil('2026-03-14T21:55:00-03:00', undefined)).toBeNull();
    expect(minutesUntil('nao-e-data', '2026-03-14T21:55:00-03:00')).toBeNull();
  });
});

describe('formatDuration', () => {
  it('formats minutes below one hour', () => {
    expect(formatDuration(4)).toBe('4 min');
    expect(formatDuration(59)).toBe('59 min');
  });

  it('formats whole hours without leftover minutes', () => {
    expect(formatDuration(60)).toBe('1 h');
    expect(formatDuration(120)).toBe('2 h');
  });

  it('formats hours plus minutes', () => {
    expect(formatDuration(95)).toBe('1 h 35 min');
  });
});

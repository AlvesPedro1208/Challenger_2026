import { describe, expect, it } from '@jest/globals';

import type { DelayHistogramBucket } from '@jornada/shared';

import {
  cityName,
  dominantBucketIndex,
  formatPeriod,
  formatShortDate,
  maxPointIndex,
  onTimePct,
  recommendedBufferMin,
  reliabilityLabel,
  riskTone,
  worstObservedBucket,
} from '../helpers';

const HISTOGRAM: DelayHistogramBucket[] = [
  { bucketLabel: 'adiantado', count: 18 },
  { bucketLabel: 'no horário', count: 120 },
  { bucketLabel: '5-15 min', count: 60 },
  { bucketLabel: '15-30 min', count: 28 },
  { bucketLabel: '30-60 min', count: 11 },
  { bucketLabel: '>60 min', count: 3 },
];

describe('riskTone', () => {
  it('is success below 15', () => {
    expect(riskTone(0)).toBe('success');
    expect(riskTone(14)).toBe('success');
  });

  it('is warning between 15 and 30 inclusive', () => {
    expect(riskTone(15)).toBe('warning');
    expect(riskTone(30)).toBe('warning');
  });

  it('is danger above 30', () => {
    expect(riskTone(31)).toBe('danger');
  });
});

describe('reliabilityLabel', () => {
  it('scales with sample size', () => {
    expect(reliabilityLabel(240)).toBe('Confiabilidade alta');
    expect(reliabilityLabel(120)).toBe('Confiabilidade média');
    expect(reliabilityLabel(30)).toBe('Amostra limitada');
  });
});

describe('onTimePct', () => {
  it('sums the first two buckets over the total', () => {
    expect(onTimePct(HISTOGRAM)).toBe(58);
  });

  it('returns 0 for an empty histogram', () => {
    expect(onTimePct([])).toBe(0);
  });
});

describe('recommendedBufferMin', () => {
  it('turns risk and average delay into a 5-minute buffer step', () => {
    // 34% x 22 min = 7.48 min of expected delay -> 10 min of slack.
    expect(recommendedBufferMin(34, 22)).toBe(10);
    expect(recommendedBufferMin(60, 25)).toBe(15);
  });

  it('keeps an exact multiple of five as it is', () => {
    expect(recommendedBufferMin(100, 20)).toBe(20);
  });

  it('is zero when there is no risk or no delay to expect', () => {
    expect(recommendedBufferMin(0, 30)).toBe(0);
    expect(recommendedBufferMin(40, 0)).toBe(0);
  });

  it('clamps out-of-range inputs instead of propagating them', () => {
    expect(recommendedBufferMin(-10, 30)).toBe(0);
    expect(recommendedBufferMin(40, -30)).toBe(0);
    expect(recommendedBufferMin(150, 20)).toBe(20);
  });
});

describe('dominantBucketIndex', () => {
  it('finds the bucket with the highest count', () => {
    expect(dominantBucketIndex(HISTOGRAM)).toBe(1);
  });
});

describe('worstObservedBucket', () => {
  it('returns the last bucket with occurrences', () => {
    expect(worstObservedBucket(HISTOGRAM)?.bucketLabel).toBe('>60 min');
  });

  it('skips trailing empty buckets', () => {
    const histogram = [...HISTOGRAM.slice(0, 5), { bucketLabel: '>60 min', count: 0 }];
    expect(worstObservedBucket(histogram)?.bucketLabel).toBe('30-60 min');
  });

  it('returns null when everything is empty', () => {
    expect(worstObservedBucket([])).toBeNull();
  });
});

describe('maxPointIndex', () => {
  it('finds the day with the highest delay', () => {
    const series = [
      { date: '2026-08-01', delayMin: 4 },
      { date: '2026-08-02', delayMin: 22 },
      { date: '2026-08-03', delayMin: 9 },
    ];
    expect(maxPointIndex(series)).toBe(1);
  });
});

describe('date formatting', () => {
  it('formats an ISO date without timezone drift', () => {
    expect(formatShortDate('2026-08-28')).toBe('28 ago');
    expect(formatShortDate('2026-06-30')).toBe('30 jun');
  });

  it('formats the covered period', () => {
    const series = [
      { date: '2026-06-30', delayMin: 4 },
      { date: '2026-08-28', delayMin: 9 },
    ];
    expect(formatPeriod(series)).toBe('30 jun – 28 ago');
  });

  it('returns empty period for an empty series', () => {
    expect(formatPeriod([])).toBe('');
  });
});

describe('cityName', () => {
  it('strips the terminal complement', () => {
    expect(cityName('São Paulo (Terminal Tietê)')).toBe('São Paulo');
    expect(cityName('Rio de Janeiro (Terminal Novo Rio)')).toBe('Rio de Janeiro');
  });

  it('keeps plain names untouched', () => {
    expect(cityName('Campinas')).toBe('Campinas');
  });
});

import type { DailyDelayPoint, DelayHistogramBucket } from '@jornada/shared';

export type RiskTone = 'success' | 'warning' | 'danger';

/** Green below 15%, amber from 15% to 30%, pink above 30%. */
export function riskTone(riskPct: number): RiskTone {
  if (riskPct < 15) return 'success';
  if (riskPct <= 30) return 'warning';
  return 'danger';
}

/** Reliability label derived from the sample size. */
export function reliabilityLabel(sampleSize: number): string {
  if (sampleSize >= 200) return 'Confiabilidade alta';
  if (sampleSize >= 80) return 'Confiabilidade média';
  return 'Amostra limitada';
}

/**
 * Percentage of on-time trips. The first two histogram buckets stand for early
 * and on-time departures, in the order defined by the model.
 */
export function onTimePct(histogram: DelayHistogramBucket[]): number {
  const total = histogram.reduce((sum, bucket) => sum + bucket.count, 0);
  if (total === 0) return 0;
  const onTime = histogram.slice(0, 2).reduce((sum, bucket) => sum + bucket.count, 0);
  return Math.round((onTime * 100) / total);
}

/** Slack advice is given in whole 5-minute steps so it reads as a plan, not a number. */
const BUFFER_STEP_MIN = 5;

/**
 * Minutes of slack to keep after the scheduled arrival: the expected delay
 * (risk x average delay), rounded up to the next 5-minute step. Zero when the
 * route has no risk or no delay to expect.
 */
export function recommendedBufferMin(riskPct: number, avgDelayMin: number): number {
  const risk = Math.min(100, Math.max(0, riskPct));
  const delay = Math.max(0, avgDelayMin);
  const expected = (risk / 100) * delay;
  if (expected <= 0) return 0;
  return Math.ceil(expected / BUFFER_STEP_MIN) * BUFFER_STEP_MIN;
}

/** Index of the bucket with the highest count (the histogram's dominant bar). */
export function dominantBucketIndex(histogram: DelayHistogramBucket[]): number {
  let best = 0;
  histogram.forEach((bucket, i) => {
    if (bucket.count > (histogram[best]?.count ?? 0)) best = i;
  });
  return best;
}

/** Worst range with occurrences: the last histogram bucket with a count > 0. */
export function worstObservedBucket(
  histogram: DelayHistogramBucket[],
): DelayHistogramBucket | null {
  for (let i = histogram.length - 1; i >= 0; i -= 1) {
    const bucket = histogram[i];
    if (bucket && bucket.count > 0) return bucket;
  }
  return null;
}

/** Index of the day with the highest average delay in the daily series. */
export function maxPointIndex(series: DailyDelayPoint[]): number {
  let best = 0;
  series.forEach((point, i) => {
    if (point.delayMin > (series[best]?.delayMin ?? 0)) best = i;
  });
  return best;
}

const MONTHS_PT = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
] as const;

/** Formats an ISO date (YYYY-MM-DD) as "28 ago", with no timezone dependency. */
export function formatShortDate(isoDate: string): string {
  const [, month, day] = isoDate.split('-');
  const monthIndex = Number(month) - 1;
  const monthLabel = MONTHS_PT[monthIndex] ?? '';
  return `${Number(day)} ${monthLabel}`.trim();
}

/** Period covered by the daily series, e.g. "30 jun – 28 ago". */
export function formatPeriod(series: DailyDelayPoint[]): string {
  const first = series[0];
  const last = series[series.length - 1];
  if (!first || !last) return '';
  return `${formatShortDate(first.date)} – ${formatShortDate(last.date)}`;
}

/** Strips the parenthesised complement from a city name, e.g. "São Paulo (Tietê)". */
export function cityName(place: string): string {
  return place.replace(/\s*\(.*\)\s*$/, '').trim();
}

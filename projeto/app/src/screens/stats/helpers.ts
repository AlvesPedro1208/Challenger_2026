import type { DailyDelayPoint, DelayHistogramBucket } from '@jornada/shared';

export type RiskTone = 'success' | 'warning' | 'danger';

/** Verde abaixo de 15%, âmbar entre 15% e 30%, rosa acima de 30%. */
export function riskTone(riskPct: number): RiskTone {
  if (riskPct < 15) return 'success';
  if (riskPct <= 30) return 'warning';
  return 'danger';
}

/** Rótulo de confiabilidade derivado do tamanho da amostra. */
export function reliabilityLabel(sampleSize: number): string {
  if (sampleSize >= 200) return 'Confiabilidade alta';
  if (sampleSize >= 80) return 'Confiabilidade média';
  return 'Amostra limitada';
}

/**
 * Percentual de viagens no horário. Os dois primeiros buckets do histograma
 * representam saídas adiantadas e no horário, na ordem definida pelo modelo.
 */
export function onTimePct(histogram: DelayHistogramBucket[]): number {
  const total = histogram.reduce((sum, bucket) => sum + bucket.count, 0);
  if (total === 0) return 0;
  const onTime = histogram.slice(0, 2).reduce((sum, bucket) => sum + bucket.count, 0);
  return Math.round((onTime * 100) / total);
}

/** Índice do bucket com maior contagem (barra dominante do histograma). */
export function dominantBucketIndex(histogram: DelayHistogramBucket[]): number {
  let best = 0;
  histogram.forEach((bucket, i) => {
    if (bucket.count > (histogram[best]?.count ?? 0)) best = i;
  });
  return best;
}

/** Pior faixa com ocorrências: último bucket do histograma com contagem > 0. */
export function worstObservedBucket(
  histogram: DelayHistogramBucket[],
): DelayHistogramBucket | null {
  for (let i = histogram.length - 1; i >= 0; i -= 1) {
    const bucket = histogram[i];
    if (bucket && bucket.count > 0) return bucket;
  }
  return null;
}

/** Índice do dia com maior atraso médio na série diária. */
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

/** Formata uma data ISO (YYYY-MM-DD) como "28 ago", sem depender de fuso. */
export function formatShortDate(isoDate: string): string {
  const [, month, day] = isoDate.split('-');
  const monthIndex = Number(month) - 1;
  const monthLabel = MONTHS_PT[monthIndex] ?? '';
  return `${Number(day)} ${monthLabel}`.trim();
}

/** Período coberto pela série diária, ex.: "30 jun – 28 ago". */
export function formatPeriod(series: DailyDelayPoint[]): string {
  const first = series[0];
  const last = series[series.length - 1];
  if (!first || !last) return '';
  return `${formatShortDate(first.date)} – ${formatShortDate(last.date)}`;
}

/** Remove o complemento entre parênteses do nome da cidade, ex.: "São Paulo (Tietê)". */
export function cityName(place: string): string {
  return place.replace(/\s*\(.*\)\s*$/, '').trim();
}

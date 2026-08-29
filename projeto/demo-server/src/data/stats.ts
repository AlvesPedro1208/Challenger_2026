import type { RouteStats } from "@jornada/shared";

/**
 * Synthetic route statistics for the last 60 days, generated with a
 * seeded PRNG so every run of the demo shows the same numbers.
 */

export interface DailyDelayPoint {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  /** Average delay across the day's departures, in minutes. */
  delayMin: number;
}

export interface GeneratedRouteStats {
  stats: RouteStats;
  dailySeries: DailyDelayPoint[];
}

export const STATS_SEED = 20260214;

/** Last day covered by the synthetic series (kept fixed for determinism). */
const SERIES_END_DATE = "2026-08-28";

const DAYS = 60;
const TRIPS_PER_DAY = 4;

const BUCKET_LABELS = [
  "adiantado",
  "no horário",
  "5-15 min",
  "15-30 min",
  "30-60 min",
  ">60 min",
] as const;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Draw a single trip delay in minutes. Weights keep most trips on time. */
function drawDelayMin(rng: () => number): number {
  const r = rng();
  if (r < 0.07) return -8 + rng() * 5; // early
  if (r < 0.57) return -3 + rng() * 8; // on time
  if (r < 0.82) return 5 + rng() * 10; // 5-15
  if (r < 0.93) return 15 + rng() * 15; // 15-30
  if (r < 0.985) return 30 + rng() * 30; // 30-60
  return 60 + rng() * 45; // >60
}

function bucketIndex(delayMin: number): number {
  if (delayMin < -3) return 0;
  if (delayMin <= 5) return 1;
  if (delayMin <= 15) return 2;
  if (delayMin <= 30) return 3;
  if (delayMin <= 60) return 4;
  return 5;
}

export function buildRouteStats(seed: number = STATS_SEED): GeneratedRouteStats {
  const rng = mulberry32(seed);
  const counts = new Array<number>(BUCKET_LABELS.length).fill(0);
  const dailySeries: DailyDelayPoint[] = [];

  const endDate = new Date(`${SERIES_END_DATE}T12:00:00Z`);
  let delayedCount = 0;
  let positiveDelaySum = 0;
  let positiveDelayCount = 0;

  for (let day = 0; day < DAYS; day += 1) {
    const date = new Date(endDate);
    date.setUTCDate(endDate.getUTCDate() - (DAYS - 1 - day));

    let dayTotal = 0;
    for (let trip = 0; trip < TRIPS_PER_DAY; trip += 1) {
      const delay = drawDelayMin(rng);
      const bucket = bucketIndex(delay);
      counts[bucket] = (counts[bucket] ?? 0) + 1;
      dayTotal += delay;
      if (delay > 15) delayedCount += 1;
      if (delay > 0) {
        positiveDelaySum += delay;
        positiveDelayCount += 1;
      }
    }

    dailySeries.push({
      date: date.toISOString().slice(0, 10),
      delayMin: Math.round(Math.max(0, dayTotal / TRIPS_PER_DAY)),
    });
  }

  const sampleSize = DAYS * TRIPS_PER_DAY;

  return {
    stats: {
      last60d: {
        riskPct: Math.round((delayedCount / sampleSize) * 100),
        avgDelayMin: Math.round(positiveDelaySum / Math.max(1, positiveDelayCount)),
        sampleSize,
        histogram: BUCKET_LABELS.map((bucketLabel, i) => ({
          bucketLabel,
          count: counts[i]!,
        })),
      },
    },
    dailySeries,
  };
}

const generated = buildRouteStats();

export const ROUTE_STATS: RouteStats = generated.stats;
export const DAILY_DELAY_SERIES: DailyDelayPoint[] = generated.dailySeries;

import type { Poi, Stop } from '@jornada/shared';

/**
 * Reads HH:mm straight from the ISO string so the demo's simulated clock
 * (offset -03:00) is preserved regardless of the device timezone.
 */
export function formatSimClock(iso: string | null): string | null {
  if (!iso) {
    return null;
  }
  const match = /T(\d{2}):(\d{2})/.exec(iso);
  return match ? `${match[1]}:${match[2]}` : null;
}

export function formatSpeed(speedKmh: number): string {
  return `${Math.round(speedKmh)} km/h`;
}

export function formatMinutes(minutes: number | null): string {
  return minutes == null ? '--' : `${minutes} min`;
}

export function formatRating(rating: number): string {
  return rating.toFixed(1).replace('.', ',');
}

export function topRatedPois(stop: Stop, count = 3): Poi[] {
  return [...stop.pois].sort((a, b) => b.rating - a.rating).slice(0, count);
}

/**
 * Minutes elapsed between two scenario timestamps. Both carry an explicit
 * offset, so the difference is timezone independent. Returns null when either
 * timestamp is missing or unparseable.
 */
export function simMinutesBetween(fromIso: string | null, toIso: string | null): number | null {
  if (!fromIso || !toIso) {
    return null;
  }
  const from = Date.parse(fromIso);
  const to = Date.parse(toIso);
  if (Number.isNaN(from) || Number.isNaN(to)) {
    return null;
  }
  return Math.round((to - from) / 60_000);
}

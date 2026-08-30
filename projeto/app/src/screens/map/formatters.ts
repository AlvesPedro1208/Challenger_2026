import type { Poi, Stop } from '@jornada/shared';

/**
 * Extrai HH:mm direto da string ISO para preservar o relogio simulado da
 * demo (offset -03:00), sem depender do fuso do dispositivo.
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

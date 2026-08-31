/** Pure date, countdown and currency helpers (pt-BR labels, simulated clock). */

const ISO_PARTS = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/;

const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS_SHORT = [
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
];

export interface IsoParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

/**
 * Extracts the wall-clock parts of the ISO timestamp exactly as written (with
 * its offset), without converting to the device timezone.
 */
export function parseIsoParts(iso: string): IsoParts | null {
  const match = ISO_PARTS.exec(iso);
  if (!match) {
    return null;
  }
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
  };
}

export function formatTimeHM(iso: string): string {
  const parts = parseIsoParts(iso);
  if (!parts) {
    return '--:--';
  }
  const hh = String(parts.hour).padStart(2, '0');
  const mm = String(parts.minute).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** E.g. "Dom, 13 de set · 22:30". */
export function formatDepartureLabel(iso: string): string {
  const parts = parseIsoParts(iso);
  if (!parts) {
    return '--';
  }
  const weekdayIndex = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
  const weekday = WEEKDAYS_SHORT[weekdayIndex];
  const month = MONTHS_SHORT[parts.month - 1];
  return `${weekday}, ${parts.day} de ${month} · ${formatTimeHM(iso)}`;
}

/** E.g. "13 de set às 21:30". */
export function formatDateTimeLabel(iso: string): string {
  const parts = parseIsoParts(iso);
  if (!parts) {
    return '--';
  }
  const month = MONTHS_SHORT[parts.month - 1];
  return `${parts.day} de ${month} às ${formatTimeHM(iso)}`;
}

export interface CountdownParts {
  totalMinutes: number;
  hours: number;
  minutes: number;
}

/**
 * Difference between the simulated clock and the target. Returns null without a
 * clock (before bootstrap) or with invalid timestamps; clamps to zero once the
 * target is in the past.
 */
export function countdownBetween(clockIso: string | null, targetIso: string): CountdownParts | null {
  if (!clockIso) {
    return null;
  }
  const clock = Date.parse(clockIso);
  const target = Date.parse(targetIso);
  if (Number.isNaN(clock) || Number.isNaN(target)) {
    return null;
  }
  const totalMinutes = Math.max(0, Math.round((target - clock) / 60000));
  return {
    totalMinutes,
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
  };
}

export function formatCountdown(parts: CountdownParts): string {
  if (parts.totalMinutes <= 0) {
    return 'Agora';
  }
  if (parts.hours === 0) {
    return `${parts.minutes}min`;
  }
  return `${parts.hours}h ${String(parts.minutes).padStart(2, '0')}min`;
}

/**
 * A countdown is only meaningful near the departure. With the scenario stopped
 * the app runs on the real clock, so the gap to the scripted departure can be
 * hundreds of hours ("Partida em 323h 17min"). Past this threshold the hero
 * falls back to the scheduled date.
 */
export const COUNTDOWN_MAX_MINUTES = 24 * 60;

export interface DepartureDisplay {
  /** `countdown` = live gap · `scheduled` = date only · `waiting` = no usable date. */
  kind: 'countdown' | 'scheduled' | 'waiting';
  label: string;
  value: string;
}

/** What the hero shows in the departure block, given the simulated clock. */
export function resolveDepartureDisplay(
  clockIso: string | null,
  departureIso: string,
): DepartureDisplay {
  const countdown = countdownBetween(clockIso, departureIso);
  if (countdown && countdown.totalMinutes <= COUNTDOWN_MAX_MINUTES) {
    return { kind: 'countdown', label: 'Partida em', value: formatCountdown(countdown) };
  }
  if (parseIsoParts(departureIso)) {
    return {
      kind: 'scheduled',
      label: 'Partida programada para',
      value: formatDepartureLabel(departureIso),
    };
  }
  return { kind: 'waiting', label: 'Partida', value: 'Aguardando início da viagem' };
}

/**
 * Whole hours from `fromIso` to `toIso`. Returns null for invalid timestamps or
 * for gaps shorter than one hour, so callers can fall back to another wording.
 */
export function hoursBetween(fromIso: string, toIso: string): number | null {
  const from = Date.parse(fromIso);
  const to = Date.parse(toIso);
  if (Number.isNaN(from) || Number.isNaN(to)) {
    return null;
  }
  const hours = Math.floor((to - from) / 3600000);
  return hours >= 1 ? hours : null;
}

export function formatBRL(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

/** Deadline expired per the simulated clock (with no clock, assumes it still holds). */
export function isPastDeadline(clockIso: string | null, deadlineIso: string): boolean {
  if (!clockIso) {
    return false;
  }
  const clock = Date.parse(clockIso);
  const deadline = Date.parse(deadlineIso);
  if (Number.isNaN(clock) || Number.isNaN(deadline)) {
    return false;
  }
  return clock > deadline;
}

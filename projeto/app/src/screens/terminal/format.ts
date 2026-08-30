/**
 * Demo timestamps always carry the -03:00 offset and Sao Paulo wall-clock
 * time. Reading HH:mm straight from the string keeps the simulated time
 * correct even when the device runs in another timezone.
 */
const ISO_TIME_PATTERN = /T(\d{2}):(\d{2})/;

export function formatIsoTime(iso: string | null | undefined): string | null {
  if (!iso) {
    return null;
  }
  const match = ISO_TIME_PATTERN.exec(iso);
  if (!match) {
    return null;
  }
  return `${match[1]}:${match[2]}`;
}

/** Minutes (rounded) between the reference clock and the target instant. */
export function minutesUntil(
  targetIso: string | null | undefined,
  referenceIso: string | null | undefined,
): number | null {
  if (!targetIso || !referenceIso) {
    return null;
  }
  const target = Date.parse(targetIso);
  const reference = Date.parse(referenceIso);
  if (Number.isNaN(target) || Number.isNaN(reference)) {
    return null;
  }
  return Math.round((target - reference) / 60_000);
}

/** Human duration in pt-BR: "4 min", "1 h", "2 h 15 min". */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

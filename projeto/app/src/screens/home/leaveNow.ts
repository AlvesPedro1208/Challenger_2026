/**
 * "Sair agora" (act 1): instead of rebooking or cancelling, the passenger
 * decides to leave for the terminal right away. The plan projects the arrival
 * at the terminal from the current traffic ETA and the margin left before the
 * departure, on the simulated clock.
 */

/** Time the passenger should keep at the terminal to reach the platform and board. */
export const BOARDING_BUFFER_MIN = 15;

const OFFSET = /(Z|[+-]\d{2}:\d{2})$/;

export interface LeaveNowPlan {
  etaToTerminalMin: number;
  /** Projected arrival at the terminal, in the same offset as the clock. */
  terminalArrivalIso: string;
  /** Minutes between reaching the terminal and the departure; negative means late. */
  marginMin: number;
  /** True when the margin still covers the boarding buffer. */
  onTime: boolean;
}

function offsetMinutes(suffix: string): number {
  if (suffix === 'Z') {
    return 0;
  }
  const sign = suffix.startsWith('-') ? -1 : 1;
  const [hours, minutes] = suffix.slice(1).split(':').map(Number);
  return sign * ((hours ?? 0) * 60 + (minutes ?? 0));
}

/**
 * Adds minutes to an ISO timestamp keeping its original offset, so the result
 * still reads as wall-clock time of the demo night ("20:57-03:00").
 */
export function addMinutesKeepingOffset(iso: string, minutes: number): string | null {
  const millis = Date.parse(iso);
  const suffix = OFFSET.exec(iso)?.[1];
  if (Number.isNaN(millis) || !suffix) {
    return null;
  }
  const shifted = new Date(millis + (minutes + offsetMinutes(suffix)) * 60000);
  return `${shifted.toISOString().slice(0, 19)}${suffix === 'Z' ? 'Z' : suffix}`;
}

/** Null without a clock, without a traffic ETA or with invalid timestamps. */
export function planLeaveNow(
  clockIso: string | null,
  departureIso: string,
  etaToTerminalMin: number | null,
): LeaveNowPlan | null {
  if (!clockIso || etaToTerminalMin === null || etaToTerminalMin < 0) {
    return null;
  }
  const terminalArrivalIso = addMinutesKeepingOffset(clockIso, etaToTerminalMin);
  const departure = Date.parse(departureIso);
  if (!terminalArrivalIso || Number.isNaN(departure)) {
    return null;
  }
  const marginMin = Math.round((departure - Date.parse(terminalArrivalIso)) / 60000);
  return {
    etaToTerminalMin,
    terminalArrivalIso,
    marginMin,
    onTime: marginMin >= BOARDING_BUFFER_MIN,
  };
}
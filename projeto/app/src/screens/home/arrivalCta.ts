import type { DemoPhase } from '@jornada/shared';

/**
 * The arrival has no tab of its own: the journey opens it and the ticket carries
 * an arrow back to it. Tapping any tab during the last act would otherwise leave
 * the passenger with no way back, so the trip screen keeps a contextual CTA to
 * it — the bar is navigation, the CTA is the script.
 */
export interface ArrivalCtaInput {
  /** True once the journey reached the destination; it never goes back to false. */
  arrived: boolean;
  phase: DemoPhase;
}

/** Pink is the single primary action of a screen, purple the secondary one. */
export type ArrivalCtaVariant = 'pink' | 'purple';

export interface ArrivalCtaState {
  visible: boolean;
  variant: ArrivalCtaVariant;
}

/**
 * Visible from the moment the destination is reached, so the trip screen always
 * offers the way back to the arrival.
 *
 * The pink follows the act being presented rather than the flag: while the
 * arrival is the current act it is the obvious next step, and if the operator
 * rewinds the script it becomes a shortcut secondary to whatever act is on.
 */
export function resolveArrivalCta({ arrived, phase }: ArrivalCtaInput): ArrivalCtaState {
  const atArrival = phase === 'ARRIVED';
  return {
    visible: arrived || atArrival,
    variant: atArrival ? 'pink' : 'purple',
  };
}

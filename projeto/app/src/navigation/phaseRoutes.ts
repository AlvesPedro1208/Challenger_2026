import type { DemoPhase } from '@jornada/shared';

export type PhaseRoute = '/' | '/terminal' | '/map' | '/arrival';

/** Each phase points at the screen that answers the passenger's question then. */
export const PHASE_ROUTES: Record<DemoPhase, PhaseRoute> = {
  HOME: '/',
  EN_ROUTE_TERMINAL: '/',
  TERMINAL: '/terminal',
  ONBOARD: '/map',
  ARRIVED: '/arrival',
};

/**
 * Anti-hijack window: after a manual navigation the demo keeps its hands off
 * the router for this long, so a presenter exploring a screen is never yanked
 * away mid-sentence by an incoming phase change.
 */
export const MANUAL_NAV_GRACE_MS = 20_000;

export interface AutoNavigateInput {
  phase: DemoPhase;
  previousPhase: DemoPhase;
  pathname: string;
  /** Timestamp (ms) of the last navigation the user triggered. */
  lastManualNavigationAt: number;
  now: number;
}

/**
 * Auto-navigation happens only on a real phase transition, never on a plain
 * re-render, and never while the manual grace window is open.
 */
export function shouldAutoNavigate(input: AutoNavigateInput): boolean {
  if (input.phase === input.previousPhase) return false;
  if (input.pathname === PHASE_ROUTES[input.phase]) return false;
  return input.now - input.lastManualNavigationAt >= MANUAL_NAV_GRACE_MS;
}

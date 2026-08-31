import type { DemoPhase } from '@jornada/shared';

import { navigateBack, type BackRouter } from './backNavigation';

export type PhaseRoute = '/' | '/terminal' | '/map' | '/arrival';

/** Each phase points at the screen that answers the passenger's question then. */
export const PHASE_ROUTES: Record<DemoPhase, PhaseRoute> = {
  HOME: '/',
  EN_ROUTE_TERMINAL: '/',
  TERMINAL: '/terminal',
  ONBOARD: '/map',
  ARRIVED: '/arrival',
};

/** Journey order, so a phase change can be read as a script advance or a rewind. */
const PHASE_ORDER: DemoPhase[] = ['HOME', 'EN_ROUTE_TERMINAL', 'TERMINAL', 'ONBOARD', 'ARRIVED'];

/**
 * Anti-hijack window: after a manual navigation the demo keeps its hands off
 * the router for this long.
 *
 * Kept short on purpose. A suppressed transition is dropped, not queued, and
 * re-firing the same phase from the panel changes nothing in the store, so a
 * long window meant the app could sit on the wrong screen for the rest of the
 * presentation. Five seconds only covers the "I just tapped something" moment.
 */
export const MANUAL_NAV_GRACE_MS = 5_000;

export interface AutoNavigateInput {
  phase: DemoPhase;
  previousPhase: DemoPhase;
  pathname: string;
  /** Timestamp (ms) of the last navigation the user triggered. */
  lastManualNavigationAt: number;
  now: number;
}

/** A phase moving forward is the script advancing to its next act. */
function isScriptAdvance(phase: DemoPhase, previousPhase: DemoPhase): boolean {
  return PHASE_ORDER.indexOf(phase) > PHASE_ORDER.indexOf(previousPhase);
}

/**
 * Auto-navigation happens only on a real phase transition, never on a plain
 * re-render.
 *
 * A script advance always wins over the grace window: the panel moving to the
 * next act is the strongest signal there is about what the audience should be
 * looking at, and losing it desyncs the app from the presenter's script. Only
 * a rewind — an operator jumping back to a previous act — waits for the window
 * to close, and the screens the demo lands on all carry a phase-aware exit.
 */
export function shouldAutoNavigate(input: AutoNavigateInput): boolean {
  if (input.phase === input.previousPhase) return false;
  if (input.pathname === PHASE_ROUTES[input.phase]) return false;
  if (isScriptAdvance(input.phase, input.previousPhase)) return true;
  return input.now - input.lastManualNavigationAt >= MANUAL_NAV_GRACE_MS;
}

/**
 * Exit control for a screen the phase navigation may have replaced onto an
 * empty stack.
 *
 * `navigateBack` alone lands on the home screen whenever the stack is empty,
 * which strands the passenger away from the act being presented. The screen
 * the current phase owns is the right destination; when the caller already is
 * that screen, popping the stack is the only move left.
 */
export function navigateToPhaseRoute(
  router: BackRouter,
  phase: DemoPhase,
  pathname: string,
): void {
  const target = PHASE_ROUTES[phase];
  if (pathname === target) {
    navigateBack(router);
    return;
  }
  router.replace(target);
}

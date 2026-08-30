import type { ImperativeRouter } from 'expo-router';

import type { PhaseRoute } from './phaseRoutes';

/** The slice of the expo-router API a back control needs. */
export type BackRouter = Pick<ImperativeRouter, 'back' | 'canGoBack' | 'replace'>;

/**
 * Where a back control lands when there is no history to pop. The demo reaches
 * some screens with `replace` (phase navigation), so the stack can be empty.
 */
export const BACK_FALLBACK_ROUTE: PhaseRoute = '/';

/** Pops the stack, or rebuilds it at the home screen when nothing is below. */
export function navigateBack(router: BackRouter): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(BACK_FALLBACK_ROUTE);
}

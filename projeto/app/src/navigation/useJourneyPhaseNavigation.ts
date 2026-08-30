import { usePathname, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import { selectPhase, useJourneyStore } from '@/state/store';

import { PHASE_ROUTES, shouldAutoNavigate, type PhaseRoute } from './phaseRoutes';

/**
 * Drives the app to the screen that matches the journey phase.
 *
 * Two guards keep the presenter in control: the router only moves when the
 * phase actually transitions (not on every render), and any navigation the app
 * did not request itself is treated as manual, opening a grace window during
 * which auto-navigation stands down. A transition skipped by the grace window
 * is dropped, not queued: the next phase change is the next chance to move.
 */
export function useJourneyPhaseNavigation(): void {
  const router = useRouter();
  const pathname = usePathname();
  const phase = useJourneyStore(selectPhase);

  const previousPhase = useRef(phase);
  const lastManualNavigationAt = useRef(0);
  const pendingAutoRoute = useRef<PhaseRoute | null>(null);
  const firstPathname = useRef(true);

  useEffect(() => {
    if (firstPathname.current) {
      firstPathname.current = false;
      return;
    }
    if (pendingAutoRoute.current === pathname) {
      pendingAutoRoute.current = null;
      return;
    }
    lastManualNavigationAt.current = Date.now();
  }, [pathname]);

  useEffect(() => {
    const previous = previousPhase.current;
    if (phase === previous) return;
    previousPhase.current = phase;

    const target = PHASE_ROUTES[phase];
    const allowed = shouldAutoNavigate({
      phase,
      previousPhase: previous,
      pathname,
      lastManualNavigationAt: lastManualNavigationAt.current,
      now: Date.now(),
    });
    if (!allowed) return;

    pendingAutoRoute.current = target;
    router.replace(target);
  }, [phase, pathname, router]);
}

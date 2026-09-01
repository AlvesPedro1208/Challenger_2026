/**
 * The ticket's conditional arrow is the only control the tab bar cannot replace:
 * it appears while the act underneath has no tab (Terminal, Chegada) and must
 * land back on that act, never on some other screen.
 */
import { describe, expect, it, jest } from '@jest/globals';

import type { BackRouter } from '@/navigation/backNavigation';
import { navigateToPhaseRoute } from '@/navigation/phaseRoutes';

function fakeRouter() {
  const back = jest.fn();
  const replace = jest.fn();
  const router = { canGoBack: () => true, back, replace } as unknown as BackRouter;
  return { router, back, replace };
}

describe('ticket exit', () => {
  it('goes back to the arrival while the journey is at the destination', () => {
    const { router, back, replace } = fakeRouter();

    navigateToPhaseRoute(router, 'ARRIVED', '/ticket');

    expect(replace).toHaveBeenCalledWith('/arrival');
    expect(back).not.toHaveBeenCalled();
  });

  it('goes back to the terminal while the passenger is waiting to board', () => {
    const { router, replace } = fakeRouter();

    navigateToPhaseRoute(router, 'TERMINAL', '/ticket');

    expect(replace).toHaveBeenCalledWith('/terminal');
  });
});

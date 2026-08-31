import { describe, expect, it, jest } from '@jest/globals';

import type { BackRouter } from '../backNavigation';
import {
  MANUAL_NAV_GRACE_MS,
  navigateToPhaseRoute,
  PHASE_ROUTES,
  shouldAutoNavigate,
} from '../phaseRoutes';

const NOW = 1_000_000;

describe('PHASE_ROUTES', () => {
  it('maps every journey phase to the screen that answers it', () => {
    expect(PHASE_ROUTES).toEqual({
      HOME: '/',
      EN_ROUTE_TERMINAL: '/',
      TERMINAL: '/terminal',
      ONBOARD: '/map',
      ARRIVED: '/arrival',
    });
  });
});

describe('shouldAutoNavigate', () => {
  it('does not navigate while the phase stays the same', () => {
    expect(
      shouldAutoNavigate({
        phase: 'ONBOARD',
        previousPhase: 'ONBOARD',
        pathname: '/stats',
        lastManualNavigationAt: 0,
        now: NOW,
      }),
    ).toBe(false);
  });

  it('navigates when the phase changes and the user is elsewhere', () => {
    expect(
      shouldAutoNavigate({
        phase: 'TERMINAL',
        previousPhase: 'EN_ROUTE_TERMINAL',
        pathname: '/',
        lastManualNavigationAt: 0,
        now: NOW,
      }),
    ).toBe(true);
  });

  it('does not navigate when the target screen is already open', () => {
    expect(
      shouldAutoNavigate({
        phase: 'TERMINAL',
        previousPhase: 'EN_ROUTE_TERMINAL',
        pathname: '/terminal',
        lastManualNavigationAt: 0,
        now: NOW,
      }),
    ).toBe(false);
  });

  it('does not hijack a user who navigated manually inside the grace window', () => {
    expect(
      shouldAutoNavigate({
        phase: 'TERMINAL',
        previousPhase: 'ONBOARD',
        pathname: '/ticket',
        lastManualNavigationAt: NOW - (MANUAL_NAV_GRACE_MS - 1),
        now: NOW,
      }),
    ).toBe(false);
  });

  it('navigates again once the grace window has expired', () => {
    expect(
      shouldAutoNavigate({
        phase: 'TERMINAL',
        previousPhase: 'ONBOARD',
        pathname: '/ticket',
        lastManualNavigationAt: NOW - MANUAL_NAV_GRACE_MS,
        now: NOW,
      }),
    ).toBe(true);
  });

  it('lets the script advance win over a touch inside the grace window', () => {
    expect(
      shouldAutoNavigate({
        phase: 'ONBOARD',
        previousPhase: 'TERMINAL',
        pathname: '/ticket',
        lastManualNavigationAt: NOW,
        now: NOW,
      }),
    ).toBe(true);
  });

  it('keeps the grace window short enough not to miss the next act', () => {
    expect(MANUAL_NAV_GRACE_MS).toBeLessThanOrEqual(5_000);
  });

  it('keeps the home route for both pre-terminal phases', () => {
    expect(
      shouldAutoNavigate({
        phase: 'EN_ROUTE_TERMINAL',
        previousPhase: 'HOME',
        pathname: '/',
        lastManualNavigationAt: 0,
        now: NOW,
      }),
    ).toBe(false);
  });
});

describe('navigateToPhaseRoute', () => {
  function fakeRouter(canGoBack: boolean) {
    const back = jest.fn();
    const replace = jest.fn();
    const router = { canGoBack: () => canGoBack, back, replace } as unknown as BackRouter;
    return { router, back, replace };
  }

  it('lands on the screen the current phase owns', () => {
    const { router, back, replace } = fakeRouter(true);

    navigateToPhaseRoute(router, 'ONBOARD', '/ticket');

    expect(replace).toHaveBeenCalledWith('/map');
    expect(back).not.toHaveBeenCalled();
  });

  it('does not replace the phase screen with itself', () => {
    const { router, back, replace } = fakeRouter(true);

    navigateToPhaseRoute(router, 'TERMINAL', '/terminal');

    expect(back).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
  });

  it('still reaches a screen when the phase screen is open on an empty stack', () => {
    const { router, back, replace } = fakeRouter(false);

    navigateToPhaseRoute(router, 'TERMINAL', '/terminal');

    expect(back).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith('/');
  });

  it('leaves the terminal for the trip once the passenger is on board', () => {
    const { router, replace } = fakeRouter(false);

    navigateToPhaseRoute(router, 'ONBOARD', '/terminal');

    expect(replace).toHaveBeenCalledWith('/map');
  });
});

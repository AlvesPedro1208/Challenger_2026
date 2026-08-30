import { describe, expect, it } from '@jest/globals';

import { MANUAL_NAV_GRACE_MS, PHASE_ROUTES, shouldAutoNavigate } from '../phaseRoutes';

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
        phase: 'ONBOARD',
        previousPhase: 'TERMINAL',
        pathname: '/ticket',
        lastManualNavigationAt: NOW - (MANUAL_NAV_GRACE_MS - 1),
        now: NOW,
      }),
    ).toBe(false);
  });

  it('navigates again once the grace window has expired', () => {
    expect(
      shouldAutoNavigate({
        phase: 'ONBOARD',
        previousPhase: 'TERMINAL',
        pathname: '/ticket',
        lastManualNavigationAt: NOW - MANUAL_NAV_GRACE_MS,
        now: NOW,
      }),
    ).toBe(true);
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

import { describe, expect, it } from '@jest/globals';

import { resolveArrivalCta } from '../arrivalCta';

describe('resolveArrivalCta', () => {
  it('stays hidden before the journey reaches the destination', () => {
    expect(resolveArrivalCta({ arrived: false, phase: 'HOME' }).visible).toBe(false);
    expect(resolveArrivalCta({ arrived: false, phase: 'EN_ROUTE_TERMINAL' }).visible).toBe(false);
    expect(resolveArrivalCta({ arrived: false, phase: 'TERMINAL' }).visible).toBe(false);
    expect(resolveArrivalCta({ arrived: false, phase: 'ONBOARD' }).visible).toBe(false);
  });

  it('shows as the primary action while the arrival is the act on screen', () => {
    expect(resolveArrivalCta({ arrived: true, phase: 'ARRIVED' })).toEqual({
      visible: true,
      variant: 'pink',
    });
  });

  it('shows on the arrival phase even without the arrival flag', () => {
    // A PHASE_CHANGE to ARRIVED sets the flag, but the screen must not depend on
    // the order the panel fires its events.
    expect(resolveArrivalCta({ arrived: false, phase: 'ARRIVED' })).toEqual({
      visible: true,
      variant: 'pink',
    });
  });

  it('keeps a secondary shortcut when the presenter rewinds to an earlier act', () => {
    // The arrival content stays available once the journey arrived, but the pink
    // belongs to the act being presented.
    for (const phase of ['HOME', 'EN_ROUTE_TERMINAL', 'TERMINAL', 'ONBOARD'] as const) {
      expect(resolveArrivalCta({ arrived: true, phase })).toEqual({
        visible: true,
        variant: 'purple',
      });
    }
  });
});

import { describe, expect, it } from '@jest/globals';

import { addMinutesKeepingOffset, BOARDING_BUFFER_MIN, planLeaveNow } from '../leaveNow';

const DEPARTURE = '2026-09-13T22:30:00-03:00';

describe('addMinutesKeepingOffset', () => {
  it('keeps the offset of the demo night', () => {
    expect(addMinutesKeepingOffset('2026-09-13T20:05:00-03:00', 52)).toBe(
      '2026-09-13T20:57:00-03:00',
    );
  });

  it('rolls over to the next day', () => {
    expect(addMinutesKeepingOffset('2026-09-13T23:40:00-03:00', 30)).toBe(
      '2026-09-14T00:10:00-03:00',
    );
  });

  it('supports UTC timestamps', () => {
    expect(addMinutesKeepingOffset('2026-09-13T23:05:00.000Z', 10)).toBe(
      '2026-09-13T23:15:00Z',
    );
  });

  it('returns null for timestamps without offset or invalid ones', () => {
    expect(addMinutesKeepingOffset('2026-09-13T20:05:00', 5)).toBeNull();
    expect(addMinutesKeepingOffset('not a date', 5)).toBeNull();
  });
});

describe('planLeaveNow', () => {
  it('projects the scripted act 1: terminal at 20:57 with 93 min to spare', () => {
    expect(planLeaveNow('2026-09-13T20:05:00-03:00', DEPARTURE, 52)).toEqual({
      etaToTerminalMin: 52,
      terminalArrivalIso: '2026-09-13T20:57:00-03:00',
      marginMin: 93,
      onTime: true,
    });
  });

  it('flags a margin shorter than the boarding buffer', () => {
    const plan = planLeaveNow('2026-09-13T21:30:00-03:00', DEPARTURE, 50);
    expect(plan?.marginMin).toBe(10);
    expect(plan?.marginMin).toBeLessThan(BOARDING_BUFFER_MIN);
    expect(plan?.onTime).toBe(false);
  });

  it('reports a negative margin when the passenger would arrive after departure', () => {
    const plan = planLeaveNow('2026-09-13T22:00:00-03:00', DEPARTURE, 45);
    expect(plan?.marginMin).toBe(-15);
    expect(plan?.onTime).toBe(false);
  });

  it('accepts exactly the boarding buffer as on time', () => {
    const plan = planLeaveNow('2026-09-13T21:25:00-03:00', DEPARTURE, 50);
    expect(plan?.marginMin).toBe(BOARDING_BUFFER_MIN);
    expect(plan?.onTime).toBe(true);
  });

  it('returns null without clock, without ETA or with a negative ETA', () => {
    expect(planLeaveNow(null, DEPARTURE, 52)).toBeNull();
    expect(planLeaveNow('2026-09-13T20:05:00-03:00', DEPARTURE, null)).toBeNull();
    expect(planLeaveNow('2026-09-13T20:05:00-03:00', DEPARTURE, -1)).toBeNull();
  });

  it('returns null with an invalid departure', () => {
    expect(planLeaveNow('2026-09-13T20:05:00-03:00', 'invalid', 52)).toBeNull();
  });
});
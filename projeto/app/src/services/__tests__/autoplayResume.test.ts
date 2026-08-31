import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import type { DemoEvent, ScenarioStep } from '@jornada/shared';
import { spRioScenario } from '@jornada/shared';

import { useJourneyStore } from '@/state/store';

import { expandScenarioSteps, resumeAutoplay, resumeStepIndex, stopAutoplay } from '../autoplay';

const steps = expandScenarioSteps(spRioScenario);

const originalApplyEvent = useJourneyStore.getState().applyEvent;

const atMs = (step: ScenarioStep): number => Date.parse(step.event.at);

/** Index of the step that opens an act: the CLOCK_SET before its PHASE_CHANGE. */
function actStart(phase: string): number {
  const phaseIndex = steps.findIndex(
    (step) => step.event.type === 'PHASE_CHANGE' && step.event.phase === phase,
  );
  let index = phaseIndex;
  while (index > 0 && steps[index - 1]!.event.type === 'CLOCK_SET') index -= 1;
  return index;
}

describe('resumeStepIndex', () => {
  it('plays the whole scenario when the phase is unknown', () => {
    expect(resumeStepIndex(steps, {})).toBe(0);
    expect(resumeStepIndex(steps, { phase: null, clockIso: null })).toBe(0);
  });

  it('plays the whole scenario on a cold start at HOME with no clock', () => {
    expect(resumeStepIndex(steps, { phase: 'HOME', clockIso: null })).toBe(0);
  });

  it('resumes inside the act the store is already in', () => {
    const index = resumeStepIndex(steps, {
      phase: 'TERMINAL',
      clockIso: '2026-09-13T21:55:00-03:00',
    });

    const remaining = steps.slice(index);
    const types = remaining.map((step) => step.event.type);
    expect(types).not.toContain('RISK_UPDATE');
    expect(types).not.toContain('TRAFFIC_ALERT');
    expect(types).not.toContain('PLATFORM_CHANGE');
    expect(remaining[0]!.event.type).toBe('CLOCK_SET');
    expect(remaining[0]!.event.at).toBe('2026-09-13T22:28:00-03:00');
  });

  it('never emits a stamp older than the clock it resumed from', () => {
    const clockIso = '2026-09-14T01:40:00-03:00';
    const index = resumeStepIndex(steps, { phase: 'ONBOARD', clockIso });

    expect(index).toBeGreaterThan(0);
    expect(atMs(steps[index]!)).toBeGreaterThan(Date.parse(clockIso));
    expect(atMs(steps[index - 1]!)).toBeLessThanOrEqual(Date.parse(clockIso));
  });

  it('replays the act from its clock set when the clock is missing', () => {
    expect(resumeStepIndex(steps, { phase: 'TERMINAL', clockIso: null })).toBe(
      actStart('TERMINAL'),
    );
  });

  it('ignores a clock that is not on the scenario timeline', () => {
    // The server clock is wall time until the first CLOCK_SET, and an
    // unparsable stamp says nothing either.
    expect(resumeStepIndex(steps, { phase: 'TERMINAL', clockIso: '2026-08-31T09:00:00-03:00' })).toBe(
      actStart('TERMINAL'),
    );
    expect(resumeStepIndex(steps, { phase: 'TERMINAL', clockIso: '2027-01-05T09:00:00-03:00' })).toBe(
      actStart('TERMINAL'),
    );
    expect(resumeStepIndex(steps, { phase: 'TERMINAL', clockIso: 'not-a-date' })).toBe(
      actStart('TERMINAL'),
    );
  });

  it('never runs past the act, even with a clock far ahead of it', () => {
    const index = resumeStepIndex(steps, {
      phase: 'TERMINAL',
      clockIso: '2026-09-14T05:00:00-03:00',
    });

    expect(index).toBe(actStart('ONBOARD'));
  });

  it('resumes at the end for a journey already arrived', () => {
    const index = resumeStepIndex(steps, {
      phase: 'ARRIVED',
      clockIso: '2026-09-14T06:34:00-03:00',
    });

    expect(index).toBe(steps.length);
  });

  it('is defined for an empty script', () => {
    expect(resumeStepIndex([], { phase: 'ONBOARD', clockIso: null })).toBe(0);
  });
});

describe('resumeAutoplay', () => {
  const applyEvent = jest.fn<(event: DemoEvent) => void>();

  beforeEach(() => {
    jest.useFakeTimers();
    applyEvent.mockClear();
    useJourneyStore.setState({ applyEvent });
  });

  afterEach(() => {
    stopAutoplay();
    jest.useRealTimers();
    useJourneyStore.setState({ applyEvent: originalApplyEvent });
    useJourneyStore.getState().reset();
  });

  it('picks the script up at the store phase instead of rewinding to act 1', () => {
    const clockIso = '2026-09-13T21:55:00-03:00';
    useJourneyStore.setState({ phase: 'TERMINAL', clockIso });

    resumeAutoplay();

    const expected = steps.length - resumeStepIndex(steps, { phase: 'TERMINAL', clockIso });
    expect(jest.getTimerCount()).toBe(expected);
    expect(expected).toBeLessThan(steps.length);
    expect(useJourneyStore.getState().connection).toBe('autoplay');

    jest.advanceTimersByTime(10 * 60 * 1000);

    const emitted = applyEvent.mock.calls.map(([event]) => event);
    expect(emitted).toHaveLength(expected);
    expect(emitted.some((event) => event.type === 'RISK_UPDATE')).toBe(false);
    expect(
      emitted.some((event) => event.type === 'PHASE_CHANGE' && event.phase === 'HOME'),
    ).toBe(false);
  });

  it('emits stamps that never go back before the resumed clock', () => {
    const clockIso = '2026-09-14T01:40:00-03:00';
    useJourneyStore.setState({ phase: 'ONBOARD', clockIso });

    resumeAutoplay();
    jest.advanceTimersByTime(10 * 60 * 1000);

    let last = Date.parse(clockIso);
    for (const [event] of applyEvent.mock.calls) {
      const at = Date.parse(event.at);
      expect(at).toBeGreaterThanOrEqual(last);
      last = at;
    }
    expect(applyEvent.mock.calls.length).toBeGreaterThan(0);
  });

  it('keeps the gap to the next step instead of firing it at once', () => {
    const clockIso = '2026-09-13T21:55:00-03:00';
    useJourneyStore.setState({ phase: 'TERMINAL', clockIso });

    resumeAutoplay();
    jest.advanceTimersByTime(0);

    expect(applyEvent).not.toHaveBeenCalled();
  });

  it('plays the full scenario from a cold start with no journey yet', () => {
    resumeAutoplay();

    expect(jest.getTimerCount()).toBe(steps.length);
  });

  it('schedules nothing once the journey has arrived', () => {
    useJourneyStore.setState({ phase: 'ARRIVED', clockIso: '2026-09-14T06:34:00-03:00' });

    resumeAutoplay();

    expect(jest.getTimerCount()).toBe(0);
    expect(useJourneyStore.getState().connection).toBe('autoplay');
  });
});

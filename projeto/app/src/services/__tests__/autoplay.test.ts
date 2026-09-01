import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import type { DemoEvent, RoutePoint, Scenario } from '@jornada/shared';
import { ROUTE_POINTS, spRioScenario } from '@jornada/shared';

import { useJourneyStore } from '@/state/store';

import {
  expandScenarioSteps,
  isAutoplayRunning,
  resetAutoplay,
  startAutoplay,
  stopAutoplay,
} from '../autoplay';

const originalApplyEvent = useJourneyStore.getState().applyEvent;

/** Shortest distance, in degrees, from a point to a polyline segment. */
function distanceToSegment(p: RoutePoint, a: RoutePoint, b: RoutePoint): number {
  const dx = b.lng - a.lng;
  const dy = b.lat - a.lat;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq === 0 ? 0 : ((p.lng - a.lng) * dx + (p.lat - a.lat) * dy) / lenSq;
  const clamped = Math.min(1, Math.max(0, t));
  const cx = a.lng + dx * clamped;
  const cy = a.lat + dy * clamped;
  return Math.hypot(p.lng - cx, p.lat - cy);
}

function distanceToRoute(p: RoutePoint): number {
  let best = Number.POSITIVE_INFINITY;
  for (let i = 1; i < ROUTE_POINTS.length; i += 1) {
    best = Math.min(best, distanceToSegment(p, ROUTE_POINTS[i - 1]!, ROUTE_POINTS[i]!));
  }
  return best;
}

describe('expandScenarioSteps', () => {
  const expanded = expandScenarioSteps(spRioScenario);

  it('keeps every scripted step of the scenario', () => {
    const kept = expanded.filter((step) => spRioScenario.steps.includes(step));
    expect(kept).toHaveLength(spRioScenario.steps.length);
  });

  it('adds intermediate telemetry between the scripted samples', () => {
    const scriptedTelemetry = spRioScenario.steps.filter(
      (step) => step.event.type === 'BUS_TELEMETRY',
    ).length;
    const telemetry = expanded.filter((step) => step.event.type === 'BUS_TELEMETRY');

    expect(telemetry.length).toBeGreaterThan(scriptedTelemetry * 2);
  });

  it('orders steps by offset with a non-decreasing `at`', () => {
    let lastOffset = Number.NEGATIVE_INFINITY;
    let lastAt = Number.NEGATIVE_INFINITY;
    for (const step of expanded) {
      const at = Date.parse(step.event.at);
      expect(Number.isNaN(at)).toBe(false);
      expect(step.afterMs).toBeGreaterThanOrEqual(lastOffset);
      expect(at).toBeGreaterThanOrEqual(lastAt);
      lastOffset = step.afterMs;
      lastAt = at;
    }
  });

  it('places every interpolated position on the route polyline', () => {
    const interpolated = expanded.filter(
      (step) => step.event.type === 'BUS_TELEMETRY' && !spRioScenario.steps.includes(step),
    );

    expect(interpolated.length).toBeGreaterThan(0);
    for (const step of interpolated) {
      const event = step.event as Extract<DemoEvent, { type: 'BUS_TELEMETRY' }>;
      expect(distanceToRoute({ lat: event.lat, lng: event.lng })).toBeLessThan(1e-6);
    }
  });

  it('never makes the countdown to the next stop climb outside a handover', () => {
    const telemetry = expanded.filter((step) => step.event.type === 'BUS_TELEMETRY');

    for (let i = 1; i < telemetry.length; i += 1) {
      const prev = telemetry[i - 1]!.event as Extract<DemoEvent, { type: 'BUS_TELEMETRY' }>;
      const current = telemetry[i]!.event as Extract<DemoEvent, { type: 'BUS_TELEMETRY' }>;
      // A climb only ever happens right off a stop the bus is parked at, where
      // the countdown legitimately restarts against the following target.
      if (current.etaNextStopMin > prev.etaNextStopMin) {
        expect(prev.speedKmh).toBe(0);
        expect(prev.etaNextStopMin).toBe(0);
      }
    }
  });

  it('is deterministic', () => {
    expect(expandScenarioSteps(spRioScenario)).toEqual(expanded);
  });
});

describe('autoplay playback', () => {
  const applyEvent = jest.fn<(event: DemoEvent) => void>();

  const tinyScenario: Scenario = {
    id: 'test',
    title: 'test',
    steps: [
      { afterMs: 0, event: { type: 'PHASE_CHANGE', at: '2026-09-13T20:00:00-03:00', phase: 'HOME' } },
      {
        afterMs: 10_000,
        event: {
          type: 'BUS_TELEMETRY',
          at: '2026-09-13T22:40:00-03:00',
          lat: -23.4778,
          lng: -46.5729,
          speedKmh: 52,
          heading: 57,
          etaNextStopMin: 176,
          etaDestinationIso: '2026-09-14T06:10:00-03:00',
        },
      },
      {
        afterMs: 20_000,
        event: {
          type: 'BUS_TELEMETRY',
          at: '2026-09-13T23:20:00-03:00',
          lat: -23.3945,
          lng: -46.321,
          speedKmh: 90,
          heading: 73,
          etaNextStopMin: 136,
          etaDestinationIso: '2026-09-14T06:10:00-03:00',
        },
      },
    ],
  };

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

  it('schedules one timer per expanded step and drains them all', () => {
    startAutoplay({ scenario: tinyScenario });

    const expected = expandScenarioSteps(tinyScenario).length;
    expect(jest.getTimerCount()).toBe(expected);
    expect(useJourneyStore.getState().connection).toBe('autoplay');

    jest.advanceTimersByTime(30_000);

    expect(applyEvent).toHaveBeenCalledTimes(expected);
    expect(jest.getTimerCount()).toBe(0);
    expect(isAutoplayRunning()).toBe(false);
  });

  it('emits the interpolated events in non-decreasing `at` order', () => {
    startAutoplay({ scenario: tinyScenario });
    jest.advanceTimersByTime(30_000);

    const stamps = applyEvent.mock.calls.map(([event]) => Date.parse((event as DemoEvent).at));
    for (let i = 1; i < stamps.length; i += 1) {
      expect(stamps[i]!).toBeGreaterThanOrEqual(stamps[i - 1]!);
    }
  });

  it('honours the speed multiplier', () => {
    startAutoplay({ scenario: tinyScenario, speed: 10 });
    jest.advanceTimersByTime(3_000);

    expect(applyEvent).toHaveBeenCalledTimes(expandScenarioSteps(tinyScenario).length);
  });

  it('does not stack timers when started twice', () => {
    startAutoplay({ scenario: tinyScenario });
    startAutoplay({ scenario: tinyScenario });

    expect(jest.getTimerCount()).toBe(expandScenarioSteps(tinyScenario).length);
  });

  it('clears every pending timer on stop', () => {
    startAutoplay({ scenario: tinyScenario });
    jest.advanceTimersByTime(11_000);
    stopAutoplay();

    expect(jest.getTimerCount()).toBe(0);
    expect(isAutoplayRunning()).toBe(false);

    const emitted = applyEvent.mock.calls.length;
    jest.advanceTimersByTime(60_000);
    expect(applyEvent).toHaveBeenCalledTimes(emitted);
  });

  it('clears timers and the store on reset', () => {
    startAutoplay({ scenario: tinyScenario });
    jest.advanceTimersByTime(11_000);
    resetAutoplay();

    expect(jest.getTimerCount()).toBe(0);
    expect(useJourneyStore.getState().connection).toBe('offline');
  });

  it('clears timers for the full demo scenario too', () => {
    startAutoplay();
    expect(jest.getTimerCount()).toBe(expandScenarioSteps(spRioScenario).length);

    stopAutoplay();
    expect(jest.getTimerCount()).toBe(0);
  });
});

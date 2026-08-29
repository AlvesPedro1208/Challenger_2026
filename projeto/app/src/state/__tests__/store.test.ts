import { describe, expect, it } from '@jest/globals';

import type { DemoEvent } from '@jornada/shared';
import { spRioScenario } from '@jornada/shared';

import type { JourneySnapshot } from '../store';
import { initialJourneyState, reduceEvent, useJourneyStore } from '../store';

const scenarioEvents: DemoEvent[] = spRioScenario.steps.map((step) => step.event);

const runUntil = (predicate: (event: DemoEvent) => boolean): JourneySnapshot => {
  let state = initialJourneyState;
  for (const event of scenarioEvents) {
    state = reduceEvent(state, event);
    if (predicate(event)) break;
  }
  return state;
};

describe('reduceEvent', () => {
  it('sets the simulated clock from CLOCK_SET', () => {
    const state = reduceEvent(initialJourneyState, {
      type: 'CLOCK_SET',
      at: '2026-09-13T20:00:00-03:00',
      isoTime: '2026-09-13T20:00:00-03:00',
    });
    expect(state.clockIso).toBe('2026-09-13T20:00:00-03:00');
  });

  it('stores traffic alert and risk during the HOME act', () => {
    const state = runUntil((e) => e.type === 'RISK_UPDATE');
    expect(state.phase).toBe('HOME');
    expect(state.trafficAlert?.severity).toBe('moderate');
    expect(state.risk?.riskPct).toBe(38);
    expect(state.risk?.canRebook).toBe(true);
  });

  it('clears the traffic alert once the passenger reaches the terminal', () => {
    const state = runUntil((e) => e.type === 'PHASE_CHANGE' && e.phase === 'TERMINAL');
    expect(state.phase).toBe('TERMINAL');
    expect(state.trafficAlert).toBeNull();
  });

  it('tracks the platform change as current + pending', () => {
    const state = runUntil((e) => e.type === 'PLATFORM_CHANGE');
    expect(state.platform.current).toBe('48');
    expect(state.platform.pendingChange).toEqual({ from: '45', to: '48', walkMinutes: 4 });
  });

  it('resolves the pending platform change on boarding', () => {
    const state = runUntil((e) => e.type === 'PHASE_CHANGE' && e.phase === 'ONBOARD');
    expect(state.phase).toBe('ONBOARD');
    expect(state.platform.current).toBe('48');
    expect(state.platform.pendingChange).toBeNull();
  });

  it('updates bus position and ETAs from telemetry', () => {
    const state = runUntil((e) => e.type === 'BUS_TELEMETRY');
    expect(state.bus.position?.lat).toBeCloseTo(-23.4778);
    expect(state.bus.position?.lng).toBeCloseTo(-46.5729);
    expect(state.bus.etaNextStopMin).toBe(176);
    expect(state.bus.etaDestinationIso).toBe('2026-09-14T06:10:00-03:00');
  });

  it('records the delay with its reason', () => {
    const state = runUntil((e) => e.type === 'DELAY_UPDATE');
    expect(state.bus.delayMin).toBe(25);
    expect(state.bus.delayReason).toContain('Via Dutra');
  });

  it('keeps approaching and dwell mutually exclusive', () => {
    const approaching = runUntil((e) => e.type === 'STOP_APPROACHING');
    expect(approaching.approachingStop).toEqual({ stopId: 'stop-aparecida', inMinutes: 8 });
    expect(approaching.dwell).toBeNull();

    const dwelling = runUntil((e) => e.type === 'STOP_DWELL');
    expect(dwelling.approachingStop).toBeNull();
    expect(dwelling.dwell).toEqual({ stopId: 'stop-aparecida', dwellMinutes: 20 });
  });

  it('finishes the full scenario arrived at Novo Rio', () => {
    const state = scenarioEvents.reduce(reduceEvent, initialJourneyState);
    expect(state.phase).toBe('ARRIVED');
    expect(state.arrived).toBe(true);
    expect(state.approachingStop).toBeNull();
    expect(state.dwell).toBeNull();
    expect(state.bus.delayMin).toBe(25);
  });
});

describe('useJourneyStore', () => {
  it('applies events and resets back to the initial state', () => {
    const { applyEvent, reset } = useJourneyStore.getState();

    scenarioEvents.forEach(applyEvent);
    expect(useJourneyStore.getState().arrived).toBe(true);

    reset();
    expect(useJourneyStore.getState().phase).toBe('HOME');
    expect(useJourneyStore.getState().arrived).toBe(false);
  });

  it('hydrates bootstrap data without clobbering existing values', () => {
    const { hydrateBootstrap, reset } = useJourneyStore.getState();
    reset();

    hydrateBootstrap({
      trip: {
        id: 'sp-rio-2230',
        origin: 'São Paulo (Terminal Tietê)',
        destination: 'Rio de Janeiro (Terminal Novo Rio)',
        departureIso: '2026-09-13T22:30:00-03:00',
        arrivalIso: '2026-09-14T06:10:00-03:00',
        company: 'Viação Aurora',
        busClass: 'Semi Leito',
        seat: '28',
        platform: '45',
      },
    });
    hydrateBootstrap({ serverTimeIso: '2026-09-13T20:00:00-03:00' });

    const state = useJourneyStore.getState();
    expect(state.trip?.id).toBe('sp-rio-2230');
    expect(state.clockIso).toBe('2026-09-13T20:00:00-03:00');

    reset();
  });
});

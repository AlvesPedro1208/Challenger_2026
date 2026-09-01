import { describe, expect, it } from '@jest/globals';

import type { BusTelemetryEvent, Scenario, ScenarioStep } from '@jornada/shared';
import { spRioScenario } from '@jornada/shared';

import { initialJourneyState, reduceEvent } from '@/state/store';

import { expandScenarioSteps, resumeStepIndex } from '../autoplay';

const steps = expandScenarioSteps(spRioScenario);

/** The telemetry event a step carries, or null for any other scripted step. */
function telemetryOf(step: ScenarioStep | undefined): BusTelemetryEvent | null {
  return step?.event.type === 'BUS_TELEMETRY' ? step.event : null;
}

function etaAt(expanded: ScenarioStep[], iso: string): number {
  const found = expanded.map(telemetryOf).find((event) => event?.at === iso);
  if (!found) throw new Error(`No telemetry sample at ${iso}`);
  return found.etaNextStopMin;
}

/**
 * The values asserted here come from ScenarioEngine.etaAtInstant
 * (demo-server/src/engine/engine.ts), which is what the panel-driven demo puts
 * on the wire. Auto-play has to reproduce them: any disagreement surfaces as
 * the countdown jumping on screen the instant the failover happens.
 */
describe('interpolated telemetry matches the engine countdown', () => {
  it('interpolates linearly while both samples count toward the same stop', () => {
    // 23:20 counts 136 and 23:45 counts 111, both toward Aparecida.
    expect(etaAt(steps, '2026-09-13T23:28:20-03:00')).toBe(128);
    expect(etaAt(steps, '2026-09-13T23:36:40-03:00')).toBe(119);
  });

  it('counts toward the next target once a dwell hands the countdown over', () => {
    // Aparecida is parked counting 0 until 01:56; Resende's own sample at
    // 02:00 counts 100, so 01:58 is 4 minutes short of it.
    expect(etaAt(steps, '2026-09-14T01:58:00-03:00')).toBe(102);
  });

  it('keeps counting down through the handover instead of holding the parked zero', () => {
    // Resende is parked until 04:00; from there the target is the destination.
    expect(etaAt(steps, '2026-09-14T04:10:00-03:00')).toBe(145);
    expect(etaAt(steps, '2026-09-14T04:20:00-03:00')).toBe(135);
  });

  it('runs the previous countdown to zero before counting toward a later stop', () => {
    const sample = (afterMs: number, at: string, etaNextStopMin: number): ScenarioStep => ({
      afterMs,
      event: {
        type: 'BUS_TELEMETRY',
        at,
        lat: -23.5,
        lng: -46.6,
        speedKmh: 80,
        heading: 60,
        etaNextStopMin,
        etaDestinationIso: '2026-09-14T06:10:00-03:00',
      },
    });
    // 20 simulated minutes over 20 s: 6 min to the current stop, then 40 more.
    const scenario: Scenario = {
      id: 'handover',
      title: 'Handover with minutes still to run',
      steps: [
        sample(0, '2026-09-13T22:00:00-03:00', 6),
        sample(20_000, '2026-09-13T22:20:00-03:00', 40),
      ],
    };
    const expanded = expandScenarioSteps(scenario);

    // 22:04 is 4 min in, so the current stop is still 2 min away.
    expect(etaAt(expanded, '2026-09-13T22:04:00-03:00')).toBe(2);
    // 22:10 is past it: 40 min to the later stop plus the 10 min still left
    // before the sample that counts them.
    expect(etaAt(expanded, '2026-09-13T22:10:00-03:00')).toBe(50);
  });

  it('puts the interpolated sample ahead of the scripted step on its offset', () => {
    // The engine flushes interpolated telemetry up to a step's offset before
    // firing the step, so the two streams have to agree on this order too.
    const delay = steps.findIndex((step) => step.event.type === 'DELAY_UPDATE');
    const before = steps[delay - 1]!;

    expect(telemetryOf(before)).not.toBeNull();
    expect(before.event.at).toBe(steps[delay]!.event.at);
    expect(before.afterMs).toBe(steps[delay]!.afterMs);
  });

});

/** The store state a failover would see right after applying steps 0..k. */
function storeAfter(k: number): ReturnType<typeof reduceEvent> {
  let state = initialJourneyState;
  for (let i = 0; i <= k; i += 1) state = reduceEvent(state, steps[i]!.event);
  return state;
}

/** Where the store would resume from, given everything up to step k applied. */
function resumeFrom(state: ReturnType<typeof reduceEvent>): number {
  return resumeStepIndex(steps, {
    phase: state.phase,
    clockIso: state.clockIso,
    telemetry: state.bus.position
      ? {
          lat: state.bus.position.lat,
          lng: state.bus.position.lng,
          etaNextStopMin: state.bus.etaNextStopMin,
        }
      : null,
  });
}

/** Everything the screen reads off the first sample played from `index` on. */
function nextReadingFrom(index: number): string {
  const event = steps.slice(index).map(telemetryOf).find(Boolean);
  if (!event) return 'none';
  return `${event.lat},${event.lng},${event.etaNextStopMin},${event.etaDestinationIso}`;
}

describe('failover resumes on the step closest to the store state', () => {
  it('shows the same numbers the stream would have shown next, at any instant', () => {
    let state = initialJourneyState;
    let checked = 0;

    for (let k = 0; k < steps.length; k += 1) {
      state = reduceEvent(state, steps[k]!.event);
      if (state.phase !== 'ONBOARD') continue;

      const index = resumeFrom(state);
      // The numbers on screen come from telemetry, so continuity means the
      // first sample auto-play plays reads exactly like the one the stream had
      // not sent yet.
      expect(nextReadingFrom(index)).toBe(nextReadingFrom(k + 1));
      // And the takeover never rewinds past the instant it happened on.
      expect(index).toBeGreaterThanOrEqual(k);
      checked += 1;
    }

    expect(checked).toBeGreaterThan(50);
  });

  it('keeps the scripted step sharing a stamp with the sample before it', () => {
    // A telemetry sample and DELAY_UPDATE both land on 00:40, and the clock
    // alone cannot tell which of the two the store already applied.
    const delay = steps.findIndex((step) => step.event.type === 'DELAY_UPDATE');
    const state = storeAfter(delay - 1);

    expect(resumeFrom(state)).toBe(delay);
    // On the clock alone the whole instant is skipped and the delay is lost.
    expect(resumeStepIndex(steps, { phase: state.phase, clockIso: state.clockIso })).toBe(
      delay + 1,
    );
  });

  it('at worst replays that scripted step, and never drops it', () => {
    // Both applied: the telemetry fingerprint still points at the sample
    // before it, so the scripted step is played once more. Re-applying it puts
    // the same values back and leaves the clock where it already was.
    const delay = steps.findIndex((step) => step.event.type === 'DELAY_UPDATE');
    const state = storeAfter(delay);

    expect(resumeFrom(state)).toBe(delay);
    expect(state.clockIso).toBe(steps[delay]!.event.at);
    expect(reduceEvent(state, steps[delay]!.event)).toStrictEqual(state);
  });

  it('holds a dipping stamp at the floor, as the engine does on the wire', () => {
    const scenario: Scenario = {
      id: 'dipping-stamps',
      title: 'A script whose stamps go backwards',
      steps: [
        { afterMs: 0, event: { type: 'PHASE_CHANGE', at: '2026-09-13T22:30:00-03:00', phase: 'ONBOARD' } },
        { afterMs: 1000, event: { type: 'ARRIVAL', at: '2026-09-13T22:00:00-03:00', terminalId: 'x' } },
        {
          afterMs: 2000,
          event: {
            type: 'CLOCK_SET',
            at: '2026-09-13T21:00:00-03:00',
            isoTime: '2026-09-13T21:00:00-03:00',
          },
        },
      ],
    };

    const expanded = expandScenarioSteps(scenario);
    // The stamp that dips is held at the floor, and a CLOCK_SET re-anchors it.
    expect(expanded[1]!.event.at).toBe('2026-09-13T22:30:00-03:00');
    expect(expanded[2]!.event.at).toBe('2026-09-13T21:00:00-03:00');
  });

  it('falls back to the clock alone when the store knows no position', () => {
    const clockIso = '2026-09-14T01:40:00-03:00';
    expect(resumeStepIndex(steps, { phase: 'ONBOARD', clockIso, telemetry: null })).toBe(
      resumeStepIndex(steps, { phase: 'ONBOARD', clockIso }),
    );
  });
});

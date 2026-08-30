import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { spRioScenario } from "@jornada/shared";
import type { BusTelemetryEvent, DemoEvent } from "@jornada/shared";
import { ScenarioEngine } from "../src/engine/engine";

/**
 * Whole-scenario invariants for what the engine puts on the wire. These run the
 * full sp-rio script (scripted steps plus interpolated telemetry) and assert on
 * the emitted stream, the way the app store consumes it.
 */

/** Every `at` the engine emits must use this single wire format. */
const AT_FORMAT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-03:00$/;

function runFullScenario(): DemoEvent[] {
  const events: DemoEvent[] = [];
  const engine = new ScenarioEngine({ broadcast: (event) => events.push(event) });
  engine.handleCommand({ type: "START_SCENARIO", scenarioId: spRioScenario.id });
  // 60x turns the 179s script into ~3s of wall time; interpolated samples sit
  // on a fixed 2s grid of scenario time, so the stream is speed-independent.
  engine.handleCommand({ type: "SET_SPEED", multiplier: 60 });
  vi.advanceTimersByTime(10_000);
  engine.dispose();
  return events;
}

function telemetryOf(events: DemoEvent[]): BusTelemetryEvent[] {
  return events.filter((e): e is BusTelemetryEvent => e.type === "BUS_TELEMETRY");
}

/** ETA values of the scripted anchors, in scenario order. */
function anchorEtas(): number[] {
  return telemetryOf(spRioScenario.steps.map((s) => s.event)).map((e) => e.etaNextStopMin);
}

/** Indexes where a value is higher than the one before it. */
function riseIndexes(values: number[]): number[] {
  const rises: number[] = [];
  for (let i = 1; i < values.length; i += 1) {
    if (values[i]! > values[i - 1]!) rises.push(i);
  }
  return rises;
}

describe("engine wire timeline (sp-rio)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs the whole script to completion", () => {
    const events = runFullScenario();
    expect(events.length).toBeGreaterThan(spRioScenario.steps.length);
    expect(events[events.length - 1]!.type).toBe("ARRIVAL");
  });

  it("never grows etaNextStopMin while the target stop is the same", () => {
    const etas = telemetryOf(runFullScenario()).map((e) => e.etaNextStopMin);

    // The script hands over to a later stop exactly where an anchor's ETA is
    // higher than the previous anchor's. Every other rise in the emitted
    // stream is a countdown climbing, which is the defect.
    const anchors = anchorEtas();
    const handovers = riseIndexes(anchors);
    const rises = riseIndexes(etas);
    expect(rises).toHaveLength(handovers.length);

    // Each handover must happen after the countdown reached the stop, so the
    // value it rises from is at most the last anchor value before the stop.
    rises.forEach((riseIndex, k) => {
      expect(etas[riseIndex - 1]!).toBeLessThanOrEqual(anchors[handovers[k]! - 1]!);
    });
  });

  it("emits `at` stamps that never go backwards", () => {
    const events = runFullScenario();
    const stamps = events.map((e) => ({ type: e.type, ms: Date.parse(e.at), at: e.at }));
    for (let i = 1; i < stamps.length; i += 1) {
      const prev = stamps[i - 1]!;
      const current = stamps[i]!;
      expect(
        current.ms,
        `${current.type} @${current.at} goes back from ${prev.type} @${prev.at}`,
      ).toBeGreaterThanOrEqual(prev.ms);
    }
  });

  it("lets an operator SET_CLOCK re-anchor the stamps, backwards included", () => {
    const events: DemoEvent[] = [];
    const engine = new ScenarioEngine({ broadcast: (event) => events.push(event) });
    engine.handleCommand({
      type: "FIRE_EVENT",
      event: { type: "ARRIVAL", at: "2026-09-14T06:34:00-03:00", terminalId: "novo-rio" },
    });
    engine.handleCommand({ type: "SET_CLOCK", isoTime: "2026-09-13T22:30:00-03:00" });
    engine.handleCommand({
      type: "FIRE_EVENT",
      event: { type: "PHASE_CHANGE", at: "2026-09-13T22:31:00-03:00", phase: "ONBOARD" },
    });
    engine.dispose();

    expect(events.map((e) => e.at)).toEqual([
      "2026-09-14T06:34:00-03:00",
      "2026-09-13T22:30:00-03:00",
      "2026-09-13T22:31:00-03:00",
    ]);
  });

  it("emits every `at` in a single format", () => {
    const formats = new Set(runFullScenario().map((e) => e.at.replace(/\d/g, "0")));
    expect([...formats]).toHaveLength(1);
    for (const event of runFullScenario()) {
      expect(event.at).toMatch(AT_FORMAT);
    }
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BusTelemetryEvent, DemoEvent, Scenario } from "@jornada/shared";
import { SimClock } from "../src/engine/clock";
import { ScenarioEngine } from "../src/engine/engine";
import { JourneyState } from "../src/engine/state";
import { pointAtFraction } from "../src/data/route";

const BASE_ISO = "2026-09-13T20:00:00-03:00";

describe("SimClock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("advances with wall time at speed 1", () => {
    const clock = new SimClock();
    const start = clock.now();
    vi.advanceTimersByTime(1000);
    expect(clock.now() - start).toBe(1000);
  });

  it("setBase re-anchors the simulated time to the given iso", () => {
    const clock = new SimClock();
    clock.setBase(BASE_ISO);
    expect(clock.now()).toBe(Date.parse(BASE_ISO));
    vi.advanceTimersByTime(500);
    expect(clock.now()).toBe(Date.parse(BASE_ISO) + 500);
  });

  it("scales advancement by the speed multiplier", () => {
    const clock = new SimClock();
    clock.setBase(BASE_ISO);
    clock.setSpeed(20);
    vi.advanceTimersByTime(1000);
    expect(clock.now()).toBe(Date.parse(BASE_ISO) + 20_000);
  });

  it("pause freezes time and resume continues from where it stopped", () => {
    const clock = new SimClock();
    clock.setBase(BASE_ISO);
    clock.pause();
    vi.advanceTimersByTime(5000);
    expect(clock.now()).toBe(Date.parse(BASE_ISO));
    clock.resume();
    vi.advanceTimersByTime(250);
    expect(clock.now()).toBe(Date.parse(BASE_ISO) + 250);
  });

  it("rejects an unparseable base iso", () => {
    const clock = new SimClock();
    expect(() => clock.setBase("not-a-date")).toThrow();
  });
});

function scriptedScenario(): Scenario {
  return {
    id: "test-script",
    title: "Test script",
    steps: [
      { afterMs: 0, event: { type: "CLOCK_SET", at: BASE_ISO, isoTime: BASE_ISO } },
      { afterMs: 1000, event: { type: "PHASE_CHANGE", at: BASE_ISO, phase: "HOME" } },
      {
        afterMs: 3000,
        event: {
          type: "TRAFFIC_ALERT",
          at: BASE_ISO,
          severity: "moderate",
          etaToTerminalMin: 52,
          message: "test alert",
        },
      },
    ],
  };
}

const TEL_START_ISO = "2026-09-13T22:40:00-03:00";
const TEL_END_ISO = "2026-09-13T23:00:00-03:00";

function telemetryScenario(): Scenario {
  const a = pointAtFraction(0);
  const b = pointAtFraction(0.2);
  return {
    id: "test-telemetry",
    title: "Telemetry pair",
    steps: [
      {
        afterMs: 0,
        event: {
          type: "BUS_TELEMETRY",
          at: TEL_START_ISO,
          lat: a.lat,
          lng: a.lng,
          speedKmh: 50,
          heading: a.heading,
          etaNextStopMin: 100,
          etaDestinationIso: TEL_END_ISO,
        },
      },
      {
        afterMs: 20_000,
        event: {
          type: "BUS_TELEMETRY",
          at: TEL_END_ISO,
          lat: b.lat,
          lng: b.lng,
          speedKmh: 90,
          heading: b.heading,
          etaNextStopMin: 60,
          etaDestinationIso: TEL_END_ISO,
        },
      },
    ],
  };
}

interface Harness {
  engine: ScenarioEngine;
  state: JourneyState;
  events: DemoEvent[];
}

function buildEngine(scenarios: Scenario[]): Harness {
  const events: DemoEvent[] = [];
  const state = new JourneyState();
  const engine = new ScenarioEngine({
    broadcast: (event) => events.push(event),
    state,
    scenarios,
  });
  return { engine, state, events };
}

describe("ScenarioEngine", () => {
  let harness: Harness | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    harness?.engine.dispose();
    harness = null;
    vi.useRealTimers();
  });

  it("starts idle and reports state", () => {
    harness = buildEngine([scriptedScenario()]);
    const state = harness.engine.getState();
    expect(state.status).toBe("idle");
    expect(state.scenarioId).toBeNull();
    expect(state.stepIndex).toBe(0);
    expect(state.speedMultiplier).toBe(1);
  });

  it("emits scripted steps in order and finishes", () => {
    harness = buildEngine([scriptedScenario()]);
    harness.engine.handleCommand({ type: "START_SCENARIO", scenarioId: "test-script" });
    expect(harness.engine.getState().status).toBe("running");

    vi.advanceTimersByTime(3100);
    expect(harness.events.map((e) => e.type)).toEqual([
      "CLOCK_SET",
      "PHASE_CHANGE",
      "TRAFFIC_ALERT",
    ]);
    expect(harness.engine.getState().status).toBe("finished");
    expect(harness.engine.getState().stepIndex).toBe(3);
  });

  it("uses the default sp-rio scenario when no id is given", () => {
    harness = buildEngine([]);
    harness.engine.handleCommand({ type: "START_SCENARIO", scenarioId: "" });
    expect(harness.engine.getState().scenarioId).toBe("sp-rio-nightly");
  });

  it("rejects an unknown scenario id", () => {
    harness = buildEngine([scriptedScenario()]);
    expect(() =>
      harness!.engine.handleCommand({ type: "START_SCENARIO", scenarioId: "nope" }),
    ).toThrow();
  });

  it("SET_SPEED accelerates playback", () => {
    harness = buildEngine([scriptedScenario()]);
    harness.engine.handleCommand({ type: "START_SCENARIO", scenarioId: "test-script" });
    harness.engine.handleCommand({ type: "SET_SPEED", multiplier: 20 });

    // 3000ms of scenario time passes in 150ms of wall time at 20x.
    vi.advanceTimersByTime(200);
    expect(harness.events.map((e) => e.type)).toEqual([
      "CLOCK_SET",
      "PHASE_CHANGE",
      "TRAFFIC_ALERT",
    ]);
  });

  it("PAUSE halts playback and RESUME continues", () => {
    harness = buildEngine([scriptedScenario()]);
    harness.engine.handleCommand({ type: "START_SCENARIO", scenarioId: "test-script" });
    vi.advanceTimersByTime(1100);
    expect(harness.events).toHaveLength(2);

    harness.engine.handleCommand({ type: "PAUSE" });
    expect(harness.engine.getState().status).toBe("paused");
    vi.advanceTimersByTime(10_000);
    expect(harness.events).toHaveLength(2);

    harness.engine.handleCommand({ type: "RESUME" });
    vi.advanceTimersByTime(2000);
    expect(harness.events).toHaveLength(3);
    expect(harness.engine.getState().status).toBe("finished");
  });

  it("applies scripted CLOCK_SET to the simulated clock (isoTime is the source)", () => {
    harness = buildEngine([scriptedScenario()]);
    harness.engine.handleCommand({ type: "START_SCENARIO", scenarioId: "test-script" });
    vi.advanceTimersByTime(100);
    const state = harness.engine.getState();
    expect(Date.parse(state.clockIso)).toBeGreaterThanOrEqual(Date.parse(BASE_ISO));
    expect(Date.parse(state.clockIso)).toBeLessThan(Date.parse(BASE_ISO) + 5000);
  });

  it("SET_CLOCK command re-anchors the clock and broadcasts CLOCK_SET", () => {
    harness = buildEngine([scriptedScenario()]);
    harness.engine.handleCommand({ type: "SET_CLOCK", isoTime: BASE_ISO });
    expect(harness.events).toHaveLength(1);
    const event = harness.events[0]!;
    expect(event.type).toBe("CLOCK_SET");
    if (event.type === "CLOCK_SET") {
      expect(event.isoTime).toBe(BASE_ISO);
    }
    expect(Date.parse(harness.engine.getState().clockIso)).toBe(Date.parse(BASE_ISO));
  });

  it("interpolates continuous telemetry between scripted samples", () => {
    harness = buildEngine([telemetryScenario()]);
    harness.engine.handleCommand({ type: "START_SCENARIO", scenarioId: "test-telemetry" });

    vi.advanceTimersByTime(10_000);
    const telemetry = harness.events.filter(
      (e): e is BusTelemetryEvent => e.type === "BUS_TELEMETRY",
    );
    // Scripted sample at 0 plus interpolated samples every 2s of scenario time.
    expect(telemetry.length).toBeGreaterThanOrEqual(5);

    const interpolated = telemetry.slice(1);
    const first = interpolated[0]!;
    // First interpolated sample sits at t=0.1 between fractions 0 and 0.2.
    // Sample fractions snap to the nearest polyline point, so allow ~500m.
    const expected = pointAtFraction(0.02);
    expect(first.lat).toBeCloseTo(expected.lat, 2);
    expect(first.lng).toBeCloseTo(expected.lng, 2);
    expect(first.speedKmh).toBeCloseTo(54, 0);

    // Timestamps interpolate between the two scripted sample stamps.
    const stamps = interpolated.map((e) => Date.parse(e.at));
    for (let i = 1; i < stamps.length; i += 1) {
      expect(stamps[i]!).toBeGreaterThan(stamps[i - 1]!);
    }
    expect(stamps[0]!).toBeGreaterThan(Date.parse(TEL_START_ISO));
    expect(stamps[stamps.length - 1]!).toBeLessThan(Date.parse(TEL_END_ISO));
  });

  it("FIRE_EVENT broadcasts immediately without advancing timers", () => {
    harness = buildEngine([scriptedScenario()]);
    const event: DemoEvent = {
      type: "PLATFORM_CHANGE",
      at: BASE_ISO,
      from: "45",
      to: "48",
      walkMinutes: 4,
    };
    harness.engine.handleCommand({ type: "FIRE_EVENT", event });
    expect(harness.events).toEqual([event]);
    expect(harness.state.snapshot()).toEqual([event]);
  });

  it("restarting a scenario resets the journey state snapshot", () => {
    harness = buildEngine([scriptedScenario()]);
    harness.engine.handleCommand({
      type: "FIRE_EVENT",
      event: { type: "ARRIVAL", at: BASE_ISO, terminalId: "novo-rio" },
    });
    expect(harness.state.snapshot()).toHaveLength(1);
    harness.engine.handleCommand({ type: "START_SCENARIO", scenarioId: "test-script" });
    const types = harness.state.snapshot().map((e) => e.type);
    expect(types).not.toContain("ARRIVAL");
  });
});

describe("JourneyState", () => {
  it("keeps only the last event of each type, in last-applied order", () => {
    const state = new JourneyState();
    state.apply({ type: "PHASE_CHANGE", at: BASE_ISO, phase: "HOME" });
    state.apply({ type: "CLOCK_SET", at: BASE_ISO, isoTime: BASE_ISO });
    state.apply({ type: "PHASE_CHANGE", at: BASE_ISO, phase: "TERMINAL" });

    const snapshot = state.snapshot();
    expect(snapshot).toHaveLength(2);
    expect(snapshot[0]!.type).toBe("CLOCK_SET");
    expect(snapshot[1]).toMatchObject({ type: "PHASE_CHANGE", phase: "TERMINAL" });
  });

  it("reset clears the snapshot", () => {
    const state = new JourneyState();
    state.apply({ type: "PHASE_CHANGE", at: BASE_ISO, phase: "HOME" });
    state.reset();
    expect(state.snapshot()).toEqual([]);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DemoEvent, Scenario } from "@jornada/shared";
import { spRioScenario } from "@jornada/shared";
import { ScenarioEngine, scenarioStartIso } from "../src/engine/engine";

const BASE_ISO = "2026-09-13T20:00:00-03:00";
const TELEMETRY_ISO = "2026-09-13T22:40:00-03:00";

/** Any wall instant far away from the scenario night, as a real demo day is. */
const WALL_ISO = "2026-09-01T09:15:00-03:00";

function clockSetScenario(): Scenario {
  return {
    id: "anchor-clock-set",
    title: "Opens with a clock set",
    steps: [
      { afterMs: 0, event: { type: "CLOCK_SET", at: BASE_ISO, isoTime: BASE_ISO } },
      { afterMs: 1000, event: { type: "PHASE_CHANGE", at: BASE_ISO, phase: "HOME" } },
    ],
  };
}

function noClockSetScenario(): Scenario {
  return {
    id: "anchor-no-clock-set",
    title: "Opens with telemetry",
    steps: [
      {
        afterMs: 0,
        event: {
          type: "BUS_TELEMETRY",
          at: TELEMETRY_ISO,
          lat: -23.52,
          lng: -46.62,
          speedKmh: 50,
          heading: 60,
          etaNextStopMin: 100,
          etaDestinationIso: TELEMETRY_ISO,
        },
      },
    ],
  };
}

describe("scenarioStartIso", () => {
  it("takes the isoTime of the first CLOCK_SET step", () => {
    expect(scenarioStartIso(clockSetScenario())).toBe(BASE_ISO);
  });

  it("falls back to the stamp of the first step when no CLOCK_SET opens the script", () => {
    expect(scenarioStartIso(noClockSetScenario())).toBe(TELEMETRY_ISO);
  });

  it("prefers the earliest CLOCK_SET, not the first one in array order", () => {
    const scenario: Scenario = {
      id: "anchor-unsorted",
      title: "Steps out of order",
      steps: [
        { afterMs: 5000, event: { type: "CLOCK_SET", at: BASE_ISO, isoTime: BASE_ISO } },
        {
          afterMs: 0,
          event: {
            type: "CLOCK_SET",
            at: "2026-09-13T19:00:00-03:00",
            isoTime: "2026-09-13T19:00:00-03:00",
          },
        },
      ],
    };
    expect(scenarioStartIso(scenario)).toBe("2026-09-13T19:00:00-03:00");
  });

  it("is null for a scenario with no usable stamp", () => {
    expect(scenarioStartIso({ id: "empty", title: "Empty", steps: [] })).toBeNull();
  });
});

describe("ScenarioEngine clock anchoring on START_SCENARIO", () => {
  let engine: ScenarioEngine | null = null;
  let events: DemoEvent[] = [];

  const build = (scenarios: Scenario[]): ScenarioEngine => {
    events = [];
    engine = new ScenarioEngine({ broadcast: (event) => events.push(event), scenarios });
    return engine;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(WALL_ISO));
  });

  afterEach(() => {
    engine?.dispose();
    engine = null;
    vi.useRealTimers();
  });

  it("reports wall time before any scenario is started", () => {
    const started = build([clockSetScenario()]);
    expect(Date.parse(started.getState().clockIso)).toBe(Date.parse(WALL_ISO));
  });

  it("adopts the scenario start time without an operator SET_CLOCK", () => {
    const started = build([clockSetScenario()]);
    started.handleCommand({ type: "START_SCENARIO", scenarioId: "anchor-clock-set" });

    expect(Date.parse(started.getState().clockIso)).toBe(Date.parse(BASE_ISO));
  });

  it("anchors before the opening step is fired, so the clock never reads wall time", () => {
    const started = build([
      {
        id: "anchor-late-clock-set",
        title: "Clock set only after a while",
        steps: [
          { afterMs: 30_000, event: { type: "CLOCK_SET", at: BASE_ISO, isoTime: BASE_ISO } },
          { afterMs: 31_000, event: { type: "PHASE_CHANGE", at: BASE_ISO, phase: "HOME" } },
        ],
      },
    ]);
    started.handleCommand({ type: "START_SCENARIO", scenarioId: "anchor-late-clock-set" });

    // No step has fired yet, and the clock is already on the demo night.
    expect(events).toHaveLength(0);
    expect(Date.parse(started.getState().clockIso)).toBe(Date.parse(BASE_ISO));
  });

  it("anchors on the first stamp when the script has no CLOCK_SET", () => {
    const started = build([noClockSetScenario()]);
    started.handleCommand({ type: "START_SCENARIO", scenarioId: "anchor-no-clock-set" });

    expect(Date.parse(started.getState().clockIso)).toBe(Date.parse(TELEMETRY_ISO));
  });

  it("anchors the shipped sp-rio scenario on its first act", () => {
    const started = build([]);
    started.handleCommand({ type: "START_SCENARIO", scenarioId: spRioScenario.id });

    expect(Date.parse(started.getState().clockIso)).toBe(Date.parse("2026-09-13T20:00:00-03:00"));
  });

  it("still lets the operator jump the clock with SET_CLOCK after the start", () => {
    const started = build([clockSetScenario()]);
    started.handleCommand({ type: "START_SCENARIO", scenarioId: "anchor-clock-set" });
    started.handleCommand({ type: "SET_CLOCK", isoTime: "2026-09-14T04:00:00-03:00" });

    expect(Date.parse(started.getState().clockIso)).toBe(Date.parse("2026-09-14T04:00:00-03:00"));
  });

  it("keeps the first broadcast stamp on the scenario night", () => {
    const started = build([clockSetScenario()]);
    started.handleCommand({ type: "START_SCENARIO", scenarioId: "anchor-clock-set" });

    expect(events[0]?.at).toBe(BASE_ISO);
  });
});

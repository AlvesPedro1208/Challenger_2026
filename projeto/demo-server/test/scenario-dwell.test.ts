import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { haversineKm, spRioScenario, STOPS } from "@jornada/shared";
import type { BusTelemetryEvent, DemoEvent, StopDwellEvent } from "@jornada/shared";
import { ScenarioEngine } from "../src/engine/engine";

/**
 * Stage direction for the support stops: the dwell card has to stay on screen
 * long enough to narrate the POI list, and while the bus is parked the screen
 * must read like a parked bus (no speed, no sliding marker, no countdown to the
 * next stop yet).
 */

/** Minimum real time each dwell card must stay on screen at 1x. */
const MIN_DWELL_REAL_MS = 15_000;

/** Tolerance between a telemetry sample and the stop it is parked at. */
const PARKED_TOLERANCE_KM = 0.05;

interface Recorded {
  /** Real milliseconds since scenario start. */
  realMs: number;
  event: DemoEvent;
}

function runFullScenarioAt1x(): Recorded[] {
  const startedAt = Date.now();
  const recorded: Recorded[] = [];
  const engine = new ScenarioEngine({
    broadcast: (event) => recorded.push({ realMs: Date.now() - startedAt, event }),
  });
  engine.handleCommand({ type: "START_SCENARIO", scenarioId: spRioScenario.id });
  vi.advanceTimersByTime(600_000);
  engine.dispose();
  return recorded;
}

const dwellSteps = (): StopDwellEvent[] =>
  spRioScenario.steps
    .map((step) => step.event)
    .filter((event): event is StopDwellEvent => event.type === "STOP_DWELL");

function stopById(stopId: string) {
  const stop = STOPS.find((candidate) => candidate.id === stopId);
  expect(stop, `stop ${stopId}`).toBeDefined();
  return stop!;
}

/** Window of the dwell in simulated milliseconds. */
function dwellWindow(dwell: StopDwellEvent): { fromMs: number; toMs: number } {
  const fromMs = Date.parse(dwell.at);
  return { fromMs, toMs: fromMs + dwell.dwellMinutes * 60_000 };
}

describe("sp-rio support stops", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("scripts a dwell for every support stop", () => {
    expect(dwellSteps().map((event) => event.stopId)).toEqual(STOPS.map((stop) => stop.id));
  });

  it("announces the same dwell length the stop dataset advertises", () => {
    for (const dwell of dwellSteps()) {
      expect(dwell.dwellMinutes, dwell.stopId).toBe(stopById(dwell.stopId).scheduledDwellMin);
    }
  });

  it("keeps each dwell card on screen long enough to narrate it at 1x", () => {
    const recorded = runFullScenarioAt1x();

    for (const dwell of dwellSteps()) {
      const start = recorded.find(
        (entry) => entry.event.type === "STOP_DWELL" && entry.event.stopId === dwell.stopId,
      );
      expect(start, `${dwell.stopId} dwell emitted`).toBeDefined();

      const { toMs } = dwellWindow(dwell);
      const end = recorded.find(
        (entry) => entry.realMs >= start!.realMs && Date.parse(entry.event.at) >= toMs,
      );
      expect(end, `${dwell.stopId} dwell end reached`).toBeDefined();

      expect(
        end!.realMs - start!.realMs,
        `${dwell.stopId} dwell card lasts ${(end!.realMs - start!.realMs) / 1000}s`,
      ).toBeGreaterThanOrEqual(MIN_DWELL_REAL_MS);
    }
  });

  it("parks the bus on the stop at zero speed for the whole dwell", () => {
    const recorded = runFullScenarioAt1x();

    for (const dwell of dwellSteps()) {
      const stop = stopById(dwell.stopId);
      const { fromMs, toMs } = dwellWindow(dwell);
      const parked = recorded
        .map((entry) => entry.event)
        .filter((event): event is BusTelemetryEvent => event.type === "BUS_TELEMETRY")
        .filter((event) => {
          const atMs = Date.parse(event.at);
          return atMs >= fromMs && atMs < toMs;
        });

      expect(parked.length, `${dwell.stopId} telemetry while parked`).toBeGreaterThan(0);
      for (const sample of parked) {
        expect(sample.speedKmh, `${dwell.stopId} @${sample.at}`).toBe(0);
        expect(
          haversineKm({ lat: sample.lat, lng: sample.lng }, stop),
          `${dwell.stopId} @${sample.at}`,
        ).toBeLessThan(PARKED_TOLERANCE_KM);
      }
    }
  });

  it("counts zero minutes to the stop the bus is parked at", () => {
    const recorded = runFullScenarioAt1x();

    for (const dwell of dwellSteps()) {
      const { fromMs, toMs } = dwellWindow(dwell);
      const parked = recorded
        .map((entry) => entry.event)
        .filter((event): event is BusTelemetryEvent => event.type === "BUS_TELEMETRY")
        .filter((event) => {
          const atMs = Date.parse(event.at);
          return atMs >= fromMs && atMs < toMs;
        });

      for (const sample of parked) {
        expect(sample.etaNextStopMin, `${dwell.stopId} @${sample.at}`).toBe(0);
      }
    }
  });

  it("hands the countdown over to the next target only after leaving the stop", () => {
    // The screen names the next stop from the interpolated position, so the
    // first sample counting toward a later target must already be past the
    // stop it left behind.
    const recorded = runFullScenarioAt1x();
    const telemetry = recorded
      .map((entry) => entry.event)
      .filter((event): event is BusTelemetryEvent => event.type === "BUS_TELEMETRY");

    for (const dwell of dwellSteps()) {
      const stop = stopById(dwell.stopId);
      const { toMs } = dwellWindow(dwell);
      const departure = telemetry.find(
        (event) => Date.parse(event.at) >= toMs && event.etaNextStopMin > 0,
      );
      expect(departure, `${dwell.stopId} departure sample`).toBeDefined();
      expect(
        haversineKm({ lat: departure!.lat, lng: departure!.lng }, stop),
        `${dwell.stopId} departure @${departure!.at}`,
      ).toBeGreaterThan(PARKED_TOLERANCE_KM);
    }
  });
});

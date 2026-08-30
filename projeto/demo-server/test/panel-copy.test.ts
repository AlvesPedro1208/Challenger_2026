import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { spRioScenario, DEMO_TRIP, STOPS, NOVO_RIO_POIS } from "@jornada/shared";
import type { DemoEvent } from "@jornada/shared";

const panelSource = readFileSync(
  fileURLToPath(new URL("../panel/panel.js", import.meta.url)),
  "utf8",
);

function firstEvent<K extends DemoEvent["type"]>(
  type: K,
): Extract<DemoEvent, { type: K }> {
  const step = spRioScenario.steps.find((s) => s.event.type === type);
  if (!step) throw new Error(`scenario has no ${type} step`);
  return step.event as Extract<DemoEvent, { type: K }>;
}

/**
 * Words that must carry a diacritic in Brazilian Portuguese. The demo renders
 * these strings verbatim, so an unaccented copy is a visible defect.
 */
const MISSPELLINGS = [
  "Tiete",
  "transito",
  "ate o terminal",
  "Cafe ",
  "Conveniencia",
  "Basilica",
  "Grao",
  "Sao Paulo",
  "Rodoviaria",
  "Farmacia",
  "Taxi",
];

function assertAccented(label: string, text: string): void {
  for (const wrong of MISSPELLINGS) {
    expect(text, `${label} should not contain "${wrong}"`).not.toContain(wrong);
  }
}

describe("user-facing copy in shared datasets", () => {
  it("keeps scenario messages accented", () => {
    for (const { event } of spRioScenario.steps) {
      if (event.type === "TRAFFIC_ALERT") {
        assertAccented("TRAFFIC_ALERT message", event.message);
      }
      if (event.type === "DELAY_UPDATE") {
        assertAccented("DELAY_UPDATE reason", event.reason);
      }
    }
    assertAccented("scenario title", spRioScenario.title);
  });

  it("keeps stop and POI names accented", () => {
    for (const stop of STOPS) {
      assertAccented(`stop ${stop.id}`, stop.name);
      for (const poi of stop.pois) {
        assertAccented(`poi ${poi.id}`, poi.name);
      }
    }
    for (const poi of NOVO_RIO_POIS) {
      assertAccented(`poi ${poi.id}`, poi.name);
    }
  });
});

describe("panel copy matches the scenario script", () => {
  it("fires the same traffic alert message as the scenario", () => {
    const traffic = firstEvent("TRAFFIC_ALERT");
    expect(panelSource).toContain(traffic.message);
  });

  it("fires the same delay reason as the scenario", () => {
    const delay = firstEvent("DELAY_UPDATE");
    expect(panelSource).toContain(delay.reason);
  });

  it("derives the refund deadline from the simulated clock", () => {
    expect(panelSource).not.toMatch(/refundDeadlineIso:\s*"\d{4}-\d{2}-\d{2}T/);
  });
});

/** The id -> name map the panel keeps inline (it has no build step). */
function panelPlaceNames(): Record<string, string> {
  const match = panelSource.match(/var PLACE_NAMES = (\{[\s\S]*?\n {2}\});/);
  if (!match?.[1]) throw new Error("panel.js has no PLACE_NAMES map");
  return JSON.parse(match[1].replace(/,(\s*})/, "$1")) as Record<string, string>;
}

describe("panel log names places instead of printing ids", () => {
  it("maps every scenario stop id to its dataset name", () => {
    const names = panelPlaceNames();
    for (const stop of STOPS) {
      expect(names[stop.id], `panel is missing a name for ${stop.id}`).toBe(stop.name);
    }
  });

  it("maps the arrival terminal id to the trip destination terminal", () => {
    const terminal = panelPlaceNames()["novo-rio"];
    expect(terminal).toBeDefined();
    expect(DEMO_TRIP.destination).toContain(terminal);
  });

  it("covers every place id the scenario puts on the wire", () => {
    const names = panelPlaceNames();
    for (const { event } of spRioScenario.steps) {
      if (event.type === "STOP_APPROACHING" || event.type === "STOP_DWELL") {
        expect(names[event.stopId], `no name for ${event.stopId}`).toBeTruthy();
      }
      if (event.type === "ARRIVAL") {
        expect(names[event.terminalId], `no name for ${event.terminalId}`).toBeTruthy();
      }
    }
  });

  it("summarizes stop and arrival events through the lookup", () => {
    expect(panelSource).toContain("placeName(event.stopId)");
    expect(panelSource).toContain("placeName(event.terminalId)");
    expect(panelSource).not.toMatch(/\+\s*event\.stopId/);
    expect(panelSource).not.toMatch(/\+\s*event\.terminalId/);
  });

  it("falls back to the raw id for an unknown place", () => {
    expect(panelPlaceNames()["stop-unmapped"]).toBeUndefined();
    expect(panelSource).toMatch(/PLACE_NAMES\[id\]\s*\|\|\s*id/);
  });
});

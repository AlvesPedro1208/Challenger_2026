import { describe, expect, it } from "vitest";
import {
  ROUTE_POINTS,
  TOTAL_DISTANCE_KM,
  pointAtFraction,
} from "../src/data/route";
import { buildRouteStats, STATS_SEED } from "../src/data/stats";
import { findIndoorPath, TIETE_INDOOR_MAP } from "../src/data/indoor";

describe("route polyline", () => {
  it("has at least 150 points and a plausible total distance", () => {
    expect(ROUTE_POINTS.length).toBeGreaterThanOrEqual(150);
    expect(TOTAL_DISTANCE_KM).toBeGreaterThan(380);
    expect(TOTAL_DISTANCE_KM).toBeLessThan(480);
  });

  it("interpolates fraction 0 to the first point and 1 to the last", () => {
    const start = pointAtFraction(0);
    const end = pointAtFraction(1);
    expect(start.lat).toBeCloseTo(ROUTE_POINTS[0]!.lat, 6);
    expect(start.lng).toBeCloseTo(ROUTE_POINTS[0]!.lng, 6);
    const last = ROUTE_POINTS[ROUTE_POINTS.length - 1]!;
    expect(end.lat).toBeCloseTo(last.lat, 6);
    expect(end.lng).toBeCloseTo(last.lng, 6);
  });

  it("is monotonic in traveled distance", () => {
    let previousKm = -1;
    for (let f = 0; f <= 1.0001; f += 0.01) {
      const position = pointAtFraction(f);
      expect(position.distanceKm).toBeGreaterThan(previousKm);
      previousKm = position.distanceKm;
    }
  });

  it("returns a heading in [0, 360)", () => {
    for (const f of [0, 0.25, 0.5, 0.75, 1]) {
      const { heading } = pointAtFraction(f);
      expect(heading).toBeGreaterThanOrEqual(0);
      expect(heading).toBeLessThan(360);
    }
  });
});

describe("route stats", () => {
  it("is deterministic for the same seed", () => {
    const a = buildRouteStats(STATS_SEED);
    const b = buildRouteStats(STATS_SEED);
    expect(a).toEqual(b);
  });

  it("differs for a different seed", () => {
    const a = buildRouteStats(STATS_SEED);
    const b = buildRouteStats(STATS_SEED + 1);
    expect(a).not.toEqual(b);
  });

  it("histogram counts sum to the sample size", () => {
    const { stats } = buildRouteStats();
    const total = stats.last60d.histogram.reduce((sum, b) => sum + b.count, 0);
    expect(total).toBe(stats.last60d.sampleSize);
  });

  it("produces plausible headline numbers and a 60-day series", () => {
    const { stats, dailySeries } = buildRouteStats();
    expect(stats.last60d.sampleSize).toBe(240);
    expect(stats.last60d.riskPct).toBeGreaterThan(10);
    expect(stats.last60d.riskPct).toBeLessThan(30);
    expect(stats.last60d.avgDelayMin).toBeGreaterThan(5);
    expect(stats.last60d.avgDelayMin).toBeLessThan(25);
    expect(dailySeries).toHaveLength(60);
  });
});

describe("indoor graph", () => {
  it("connects the entrance to every platform", () => {
    for (const platform of TIETE_INDOOR_MAP.platforms) {
      const path = findIndoorPath("entrance-main", platform.id);
      expect(path, `path to ${platform.id}`).not.toBeNull();
      expect(path![0]).toBe("entrance-main");
      expect(path![path!.length - 1]).toBe(platform.id);
    }
  });

  it("returns null for unknown nodes", () => {
    expect(findIndoorPath("entrance-main", "platform-99")).toBeNull();
  });
});

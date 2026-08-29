import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildServer } from "../src/server";
import { DEMO_TICKET, DEMO_TRIP } from "../src/data/trip";
import { STOPS } from "../src/data/stops";
import { ROUTE_STATS } from "../src/data/stats";
import { TIETE_INDOOR_MAP } from "../src/data/indoor";

describe("demo-server routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/health responds ok", async () => {
    const res = await app.inject({ method: "GET", url: "/api/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
  });

  it("GET /api/bootstrap returns the demo journey data", async () => {
    const res = await app.inject({ method: "GET", url: "/api/bootstrap" });
    expect(res.statusCode).toBe(200);
    const body = res.json() as Record<string, unknown>;
    expect(body.trip).toEqual(DEMO_TRIP);
    expect(body.ticket).toEqual(DEMO_TICKET);
    expect(body.stops).toEqual(JSON.parse(JSON.stringify(STOPS)));
    expect(body.stats).toEqual(JSON.parse(JSON.stringify(ROUTE_STATS)));
    expect(body.indoorMap).toEqual(JSON.parse(JSON.stringify(TIETE_INDOOR_MAP)));
    expect(Number.isNaN(Date.parse(body.serverTimeIso as string))).toBe(false);
  });

  it("GET /api/bootstrap serverTimeIso follows the simulated clock", async () => {
    const isoTime = "2026-09-13T20:00:00-03:00";
    const cmd = await app.inject({
      method: "POST",
      url: "/api/command",
      payload: { type: "SET_CLOCK", isoTime },
    });
    expect(cmd.statusCode).toBe(200);

    const res = await app.inject({ method: "GET", url: "/api/bootstrap" });
    const body = res.json() as { serverTimeIso: string };
    const delta = Date.parse(body.serverTimeIso) - Date.parse(isoTime);
    expect(delta).toBeGreaterThanOrEqual(0);
    expect(delta).toBeLessThan(5000);
  });

  it("GET /api/engine exposes the engine state", async () => {
    const res = await app.inject({ method: "GET", url: "/api/engine" });
    expect(res.statusCode).toBe(200);
    const body = res.json() as Record<string, unknown>;
    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("scenarioId");
    expect(body).toHaveProperty("stepIndex");
    expect(body).toHaveProperty("clockIso");
    expect(body).toHaveProperty("speedMultiplier");
  });

  it("POST /api/command starts and pauses the scenario", async () => {
    const start = await app.inject({
      method: "POST",
      url: "/api/command",
      payload: { type: "START_SCENARIO", scenarioId: "sp-rio-nightly" },
    });
    expect(start.statusCode).toBe(200);
    expect((start.json() as { state: { status: string } }).state.status).toBe("running");

    const pause = await app.inject({
      method: "POST",
      url: "/api/command",
      payload: { type: "PAUSE" },
    });
    expect(pause.statusCode).toBe(200);
    expect((pause.json() as { state: { status: string } }).state.status).toBe("paused");
  });

  it("POST /api/command rejects malformed commands", async () => {
    const badType = await app.inject({
      method: "POST",
      url: "/api/command",
      payload: { type: "EXPLODE" },
    });
    expect(badType.statusCode).toBe(400);

    const badSpeed = await app.inject({
      method: "POST",
      url: "/api/command",
      payload: { type: "SET_SPEED", multiplier: -1 },
    });
    expect(badSpeed.statusCode).toBe(400);

    const badClock = await app.inject({
      method: "POST",
      url: "/api/command",
      payload: { type: "SET_CLOCK", isoTime: "garbage" },
    });
    expect(badClock.statusCode).toBe(400);

    const badScenario = await app.inject({
      method: "POST",
      url: "/api/command",
      payload: { type: "START_SCENARIO", scenarioId: "unknown-id" },
    });
    expect(badScenario.statusCode).toBe(400);
  });
});

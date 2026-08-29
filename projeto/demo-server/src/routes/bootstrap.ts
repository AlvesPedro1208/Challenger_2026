import type { FastifyInstance } from "fastify";
import type { IndoorMap, RouteStats, Stop, Ticket, Trip } from "@jornada/shared";
import { DEMO_TICKET, DEMO_TRIP } from "../data/trip";
import { STOPS } from "../data/stops";
import { ROUTE_STATS } from "../data/stats";
import { TIETE_INDOOR_MAP } from "../data/indoor";
import type { SimClock } from "../engine/clock";

/** Matches the app's BootstrapData (extra fields are ignored by the app). */
interface BootstrapPayload {
  trip: Trip;
  ticket: Ticket;
  stops: Stop[];
  stats: RouteStats;
  indoorMap: IndoorMap;
  serverTimeIso: string;
}

export function bootstrapRoutes(clock: SimClock) {
  return async function bootstrapPlugin(app: FastifyInstance): Promise<void> {
    app.get("/bootstrap", async (): Promise<BootstrapPayload> => ({
      trip: DEMO_TRIP,
      ticket: DEMO_TICKET,
      stops: STOPS,
      stats: ROUTE_STATS,
      indoorMap: TIETE_INDOOR_MAP,
      serverTimeIso: clock.nowIso(),
    }));
  };
}

import type { FastifyInstance } from "fastify";
import type { DemoCommand } from "@jornada/shared";
import type { ScenarioEngine } from "../engine/engine";

const COMMAND_TYPES = new Set([
  "START_SCENARIO",
  "PAUSE",
  "RESUME",
  "SET_SPEED",
  "SET_CLOCK",
  "FIRE_EVENT",
]);

const EVENT_TYPES = new Set([
  "CLOCK_SET",
  "PHASE_CHANGE",
  "TRAFFIC_ALERT",
  "RISK_UPDATE",
  "PLATFORM_CHANGE",
  "BUS_TELEMETRY",
  "DELAY_UPDATE",
  "STOP_APPROACHING",
  "STOP_DWELL",
  "ARRIVAL",
]);

function validationError(body: unknown): string | null {
  if (body === null || typeof body !== "object") return "Body must be an object";
  const command = body as Record<string, unknown>;
  if (typeof command.type !== "string" || !COMMAND_TYPES.has(command.type)) {
    return `Unknown command type: ${String(command.type)}`;
  }
  switch (command.type) {
    case "SET_CLOCK":
      if (typeof command.isoTime !== "string" || Number.isNaN(Date.parse(command.isoTime))) {
        return "SET_CLOCK requires a parseable isoTime";
      }
      return null;
    case "SET_SPEED":
      if (
        typeof command.multiplier !== "number" ||
        !Number.isFinite(command.multiplier) ||
        command.multiplier <= 0
      ) {
        return "SET_SPEED requires a positive multiplier";
      }
      return null;
    case "START_SCENARIO":
      if (command.scenarioId !== undefined && typeof command.scenarioId !== "string") {
        return "START_SCENARIO scenarioId must be a string";
      }
      return null;
    case "FIRE_EVENT": {
      const event = command.event as Record<string, unknown> | undefined;
      if (
        event === null ||
        typeof event !== "object" ||
        typeof event.type !== "string" ||
        !EVENT_TYPES.has(event.type) ||
        typeof event.at !== "string"
      ) {
        return "FIRE_EVENT requires an event with a known type and an at stamp";
      }
      return null;
    }
    default:
      return null;
  }
}

export function commandRoutes(engine: ScenarioEngine) {
  return async function commandsPlugin(app: FastifyInstance): Promise<void> {
    app.post("/command", async (request, reply) => {
      const error = validationError(request.body);
      if (error) {
        return reply.status(400).send({ ok: false, error });
      }
      try {
        engine.handleCommand(request.body as DemoCommand);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return reply.status(400).send({ ok: false, error: message });
      }
      return { ok: true, state: engine.getState() };
    });

    app.get("/engine", async () => engine.getState());
  };
}

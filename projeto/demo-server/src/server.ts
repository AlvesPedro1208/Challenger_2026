import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import websocket from "@fastify/websocket";
import { registerWsHub } from "./ws/hub";
import { bootstrapRoutes } from "./routes/bootstrap";
import { commandRoutes } from "./routes/commands";
import { healthRoutes } from "./routes/health";
import { SimClock } from "./engine/clock";
import { ScenarioEngine } from "./engine/engine";
import { JourneyState } from "./engine/state";

declare module "fastify" {
  interface FastifyInstance {
    engine: ScenarioEngine;
  }
}

const here = path.dirname(fileURLToPath(import.meta.url));
const panelDir = path.resolve(here, "../panel");

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  // Demo runs on a shared local network; the phone hits the server directly.
  await app.register(cors, { origin: true });
  await app.register(websocket);

  // Control panel is built by a later task; skip static serving until it exists.
  if (existsSync(panelDir)) {
    await app.register(fastifyStatic, {
      root: panelDir,
      prefix: "/panel/",
    });
  }

  const state = new JourneyState();
  const clock = new SimClock();

  // Applied directly on the root instance so the wsHub decoration is not
  // trapped in an encapsulated plugin scope.
  await registerWsHub(state)(app);

  const engine = new ScenarioEngine({
    broadcast: (event) => app.wsHub.broadcast(event),
    state,
    clock,
  });
  app.decorate("engine", engine);
  app.addHook("onClose", async () => engine.dispose());

  await app.register(healthRoutes, { prefix: "/api" });
  await app.register(bootstrapRoutes(clock), { prefix: "/api" });
  await app.register(commandRoutes(engine), { prefix: "/api" });

  return app;
}

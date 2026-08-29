import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import websocket from "@fastify/websocket";
import { registerWsHub } from "./ws/hub";
import { bootstrapRoutes } from "./routes/bootstrap";
import { healthRoutes } from "./routes/health";

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

  await app.register(registerWsHub);
  await app.register(healthRoutes, { prefix: "/api" });
  await app.register(bootstrapRoutes, { prefix: "/api" });

  return app;
}

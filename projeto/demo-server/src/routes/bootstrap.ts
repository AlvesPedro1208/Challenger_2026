import type { FastifyInstance } from "fastify";

interface BootstrapPayload {
  trip: null;
  serverTimeIso: string;
}

export async function bootstrapRoutes(app: FastifyInstance): Promise<void> {
  app.get("/bootstrap", async (): Promise<BootstrapPayload> => ({
    trip: null,
    serverTimeIso: new Date().toISOString(),
  }));
}

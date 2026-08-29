import type { FastifyInstance } from "fastify";
import type { WebSocket } from "ws";

export interface WsHub {
  broadcast(payload: unknown): void;
  clientCount(): number;
}

declare module "fastify" {
  interface FastifyInstance {
    wsHub: WsHub;
  }
}

export async function registerWsHub(app: FastifyInstance): Promise<void> {
  const clients = new Set<WebSocket>();

  const hub: WsHub = {
    broadcast(payload) {
      const message = JSON.stringify(payload);
      for (const socket of clients) {
        if (socket.readyState === socket.OPEN) {
          socket.send(message);
        }
      }
    },
    clientCount() {
      return clients.size;
    },
  };

  app.decorate("wsHub", hub);

  app.get("/ws", { websocket: true }, (socket) => {
    clients.add(socket);
    const drop = () => clients.delete(socket);
    socket.on("close", drop);
    socket.on("error", drop);
  });
}

import type { FastifyInstance } from "fastify";
import type { WebSocket } from "ws";
import type { DemoEvent } from "@jornada/shared";
import type { JourneyState } from "../engine/state";

export interface WsHub {
  broadcast(event: DemoEvent): void;
  clientCount(): number;
}

declare module "fastify" {
  interface FastifyInstance {
    wsHub: WsHub;
  }
}

export function registerWsHub(state: JourneyState) {
  return async function wsHubPlugin(app: FastifyInstance): Promise<void> {
    const clients = new Set<WebSocket>();

    const hub: WsHub = {
      broadcast(event) {
        const message = JSON.stringify(event);
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

      // Replay the journey snapshot so mid-demo clients catch up.
      for (const event of state.snapshot()) {
        socket.send(JSON.stringify(event));
      }
    });
  };
}

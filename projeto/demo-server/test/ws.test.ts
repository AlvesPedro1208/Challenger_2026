import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { AddressInfo } from "node:net";
import WebSocket from "ws";
import type { DemoEvent } from "@jornada/shared";
import { buildServer } from "../src/server";

let app: FastifyInstance;
let wsUrl: string;

interface Client {
  socket: WebSocket;
  /** Every event received since the socket was created. */
  events: DemoEvent[];
}

// The message listener is attached before the handshake completes; frames
// sent right at connection time can arrive in the same tick as "open".
function connect(): Promise<Client> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(wsUrl);
    const events: DemoEvent[] = [];
    socket.on("message", (raw) => {
      events.push(JSON.parse(String(raw)) as DemoEvent);
    });
    socket.on("open", () => resolve({ socket, events }));
    socket.on("error", reject);
  });
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

function nextMessage(socket: WebSocket): Promise<DemoEvent> {
  return new Promise((resolve) => {
    socket.once("message", (raw) => resolve(JSON.parse(String(raw)) as DemoEvent));
  });
}

async function waitFor(check: () => boolean, timeoutMs = 2000): Promise<void> {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeoutMs) throw new Error("waitFor timed out");
    await new Promise((r) => setTimeout(r, 10));
  }
}

beforeAll(async () => {
  app = await buildServer();
  await app.listen({ port: 0, host: "127.0.0.1" });
  const address = app.server.address() as AddressInfo;
  wsUrl = `ws://127.0.0.1:${address.port}/ws`;
});

afterAll(async () => {
  await app.close();
});

describe("ws hub", () => {
  it("sends the journey snapshot to a client that connects mid-demo", async () => {
    const fired: DemoEvent = {
      type: "PHASE_CHANGE",
      at: "2026-09-13T21:40:00-03:00",
      phase: "TERMINAL",
    };
    const res = await app.inject({
      method: "POST",
      url: "/api/command",
      payload: { type: "FIRE_EVENT", event: fired },
    });
    expect(res.statusCode).toBe(200);

    const client = await connect();
    await sleep(200);
    client.socket.close();
    expect(client.events).toContainEqual(fired);
  });

  it("broadcast reaches every connected client", async () => {
    const a = await connect();
    const b = await connect();
    // Drain snapshot messages before broadcasting.
    await sleep(100);

    const event: DemoEvent = {
      type: "DELAY_UPDATE",
      at: "2026-09-14T00:40:00-03:00",
      delayMin: 25,
      reason: "Obras na pista",
    };
    const received = Promise.all([nextMessage(a.socket), nextMessage(b.socket)]);
    app.wsHub.broadcast(event);
    expect(await received).toEqual([event, event]);
    a.socket.close();
    b.socket.close();
    await waitFor(() => app.wsHub.clientCount() === 0);
  });

  it("clientCount tracks connections and disconnections", async () => {
    expect(app.wsHub.clientCount()).toBe(0);
    const client = await connect();
    expect(app.wsHub.clientCount()).toBe(1);
    client.socket.close();
    await waitFor(() => app.wsHub.clientCount() === 0);
  });
});

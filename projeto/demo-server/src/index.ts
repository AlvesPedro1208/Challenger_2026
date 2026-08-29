import os from "node:os";
import { buildServer } from "./server";

const PORT = Number(process.env.PORT ?? 4000);

function localIPv4Addresses(): string[] {
  const addresses: string[] = [];
  for (const interfaces of Object.values(os.networkInterfaces())) {
    for (const net of interfaces ?? []) {
      if (net.family === "IPv4" && !net.internal) {
        addresses.push(net.address);
      }
    }
  }
  return addresses;
}

async function main(): Promise<void> {
  const app = await buildServer();
  await app.listen({ port: PORT, host: "0.0.0.0" });

  console.log(`demo-server up on port ${PORT}`);
  console.log("Reachable from the local network at:");
  for (const address of localIPv4Addresses()) {
    console.log(`  http://${address}:${PORT}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

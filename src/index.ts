import { env } from "./config/env";
import { stopNightlySync } from "./cron/nightly-sync";
import { disconnectPrisma } from "./lib/prisma";
import { buildApp } from "./app";

async function main(): Promise<void> {
  const app = await buildApp();

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, "Shutting down");
    stopNightlySync();
    await app.close();
    await disconnectPrisma();
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });

  await app.listen({ host: env.HOST, port: env.PORT });
  app.log.info({ port: env.PORT, docs: `http://localhost:${env.PORT}/docs` }, "API listening");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Failed to start server";
  console.error(message);
  process.exit(1);
});

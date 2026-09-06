import cron from "node-cron";
import type { ScheduledTask } from "node-cron";
import type { FastifyBaseLogger } from "fastify";
import { env } from "../config/env";
import { syncAllActiveConnections } from "../services/sync.service";

let task: ScheduledTask | null = null;

export function startNightlySync(logger: FastifyBaseLogger): ScheduledTask {
  if (task) {
    return task;
  }

  task = cron.schedule(
    "0 2 * * *",
    async () => {
      logger.info("Nightly holdings sync started");
      try {
        const result = await syncAllActiveConnections();
        logger.info({ result }, "Nightly holdings sync finished");
      } catch (error) {
        logger.error(
          { err: error instanceof Error ? { message: error.message } : { message: "unknown" } },
          "Nightly holdings sync failed",
        );
      }
    },
    {
      name: "nightly-holdings-sync",
      timezone: env.CRON_TZ,
      noOverlap: true,
    },
  );

  logger.info({ timezone: env.CRON_TZ }, "Nightly sync scheduled for 02:00");
  return task;
}

export function stopNightlySync(): void {
  task?.stop();
  task = null;
}

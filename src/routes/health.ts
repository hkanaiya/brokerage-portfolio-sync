import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/health",
    {
      schema: {
        tags: ["health"],
        summary: "Liveness and database connectivity",
        response: {
          200: {
            type: "object",
            properties: {
              status: { type: "string" },
              database: { type: "string" },
              uptime: { type: "number" },
            },
          },
        },
      },
    },
    async () => {
      await prisma.$queryRaw`SELECT 1 AS ok`;
      return {
        status: "ok",
        database: "up",
        uptime: process.uptime(),
      };
    },
  );
}

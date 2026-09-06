import fp from "fastify-plugin";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import sensible from "@fastify/sensible";
import type { FastifyInstance } from "fastify";
import { env } from "../config/env";

function parseOrigins(value: string): boolean | string[] {
  if (value.trim() === "*") {
    return true;
  }
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export default fp(async function securityPlugin(app: FastifyInstance) {
  await app.register(sensible);
  await app.register(helmet, {
    // Swagger UI needs inline styles/scripts; keep other Helmet defaults.
    contentSecurityPolicy: false,
  });
  await app.register(cors, {
    origin: parseOrigins(env.CORS_ORIGIN),
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });
  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
    allowList: (request) =>
      request.url === "/health" || request.url.startsWith("/docs"),
  });
});

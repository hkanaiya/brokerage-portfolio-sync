import Fastify, { type FastifyError } from "fastify";
import { Prisma } from "@prisma/client";
import { env, isProduction } from "./config/env";
import { startNightlySync } from "./cron/nightly-sync";
import { isAppError } from "./lib/errors";
import { buildLoggerOptions, sanitizeErrorMessage } from "./lib/logger";
import jwtPlugin from "./plugins/jwt";
import securityPlugin from "./plugins/security";
import swaggerPlugin from "./plugins/swagger";
import { authRoutes } from "./routes/auth";
import { healthRoutes } from "./routes/health";
import { portfolioRoutes } from "./routes/portfolio";

function asFastifyError(error: unknown): FastifyError | null {
  if (typeof error === "object" && error !== null && "statusCode" in error) {
    return error as FastifyError;
  }
  return null;
}

export async function buildApp() {
  const app = Fastify({
    logger: buildLoggerOptions(env.LOG_LEVEL),
    trustProxy: true,
    genReqId: () => crypto.randomUUID(),
  });

  await app.register(securityPlugin);
  await app.register(jwtPlugin);
  await app.register(swaggerPlugin);
  await app.register(healthRoutes);
  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(portfolioRoutes, { prefix: "/api/portfolio" });

  app.setErrorHandler((error: unknown, request, reply) => {
    if (isAppError(error)) {
      return reply.code(error.statusCode).send({
        statusCode: error.statusCode,
        error: error.code,
        message: error.message,
        code: error.code,
      });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const statusCode = error.code === "P2002" ? 409 : 400;
      return reply.code(statusCode).send({
        statusCode,
        error: "DATABASE_ERROR",
        message: "A database constraint failed",
        code: error.code,
      });
    }

    const fastifyError = asFastifyError(error);
    if (fastifyError?.validation) {
      return reply.code(400).send({
        statusCode: 400,
        error: "VALIDATION_ERROR",
        message: fastifyError.message,
        code: "FST_ERR_VALIDATION",
      });
    }

    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    request.log.error({ err: { message: sanitizeErrorMessage(message) } }, "Unhandled error");

    const statusCode = fastifyError?.statusCode ?? 500;
    return reply.code(statusCode).send({
      statusCode,
      error: isProduction ? "INTERNAL_ERROR" : error instanceof Error ? error.name : "INTERNAL_ERROR",
      message: isProduction ? "An unexpected error occurred" : sanitizeErrorMessage(message),
      code: "INTERNAL_ERROR",
    });
  });

  app.setNotFoundHandler((_request, reply) => {
    return reply.code(404).send({
      statusCode: 404,
      error: "NOT_FOUND",
      message: "Route not found",
      code: "NOT_FOUND",
    });
  });

  app.addHook("onReady", () => {
    startNightlySync(app.log);
  });

  return app;
}

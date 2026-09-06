import fp from "fastify-plugin";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { FastifyInstance } from "fastify";

export default fp(async function swaggerPlugin(app: FastifyInstance) {
  await app.register(swagger, {
    openapi: {
      openapi: "3.1.0",
      info: {
        title: "Brokerage Portfolio Sync API",
        description:
          "REST API for multi-brokerage portfolio aggregation. User authentication is JWT-based and is kept separate from encrypted broker credentials stored at rest.",
        version: "1.0.0",
      },
      tags: [
        { name: "health", description: "Service health" },
        { name: "auth", description: "User registration and login" },
        { name: "portfolio", description: "Connections, holdings, and sync" },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true,
      persistAuthorization: true,
    },
  });
});

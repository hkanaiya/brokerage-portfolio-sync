import type { FastifyInstance } from "fastify";
import { loginUser, registerUser } from "../services/auth.service";
import { authBodySchema, authResponseSchema, errorResponseSchema } from "./schemas";

interface AuthBody {
  email: string;
  password: string;
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: AuthBody }>(
    "/register",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: {
        tags: ["auth"],
        summary: "Register a new user",
        body: authBodySchema,
        response: {
          201: authResponseSchema,
          400: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const result = await registerUser(app, request.body.email, request.body.password);
      return reply.code(201).send(result);
    },
  );

  app.post<{ Body: AuthBody }>(
    "/login",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: {
        tags: ["auth"],
        summary: "Log in and receive a JWT",
        body: authBodySchema,
        response: {
          200: authResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
    async (request) => {
      return loginUser(app, request.body.email, request.body.password);
    },
  );
}

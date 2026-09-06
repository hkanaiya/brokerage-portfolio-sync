import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { env } from "../config/env";
import { UnauthorizedError } from "../lib/errors";

export default fp(async function jwtPlugin(app: FastifyInstance) {
  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: "7d" },
  });

  app.decorate("authenticate", async function authenticate(request: FastifyRequest, _reply: FastifyReply) {
    try {
      await request.jwtVerify();
    } catch {
      throw new UnauthorizedError();
    }

    if (request.user.typ && request.user.typ !== "access") {
      throw new UnauthorizedError("Invalid access token");
    }
  });
});

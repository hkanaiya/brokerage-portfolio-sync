import "@fastify/jwt";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      sub: string;
      email: string;
      typ?: "access" | "oauth_state";
      brokerId?: string;
      nonce?: string;
    };
    user: {
      sub: string;
      email: string;
      typ?: "access" | "oauth_state";
      brokerId?: string;
      nonce?: string;
    };
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export {};

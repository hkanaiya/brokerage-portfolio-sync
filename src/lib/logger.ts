import type { FastifyServerOptions } from "fastify";

/**
 * Paths that must never appear in logs. Broker tokens, passwords,
 * authorization codes, and encryption material are redacted.
 */
export const redactPaths = [
  "password",
  "passwordHash",
  "encryptedToken",
  "token",
  "accessToken",
  "refreshToken",
  "authorization",
  "Authorization",
  "code",
  "ENCRYPTION_KEY",
  "JWT_SECRET",
  "DATABASE_URL",
  "*.password",
  "*.passwordHash",
  "*.encryptedToken",
  "*.token",
  "*.accessToken",
  "*.refreshToken",
  "*.code",
  "req.headers.authorization",
  "req.headers.cookie",
  "req.body.password",
  "req.body.code",
  "req.body.encryptedToken",
  "res.headers[\"set-cookie\"]",
];

export function buildLoggerOptions(level: string): FastifyServerOptions["logger"] {
  return {
    level,
    redact: {
      paths: redactPaths,
      censor: "[REDACTED]",
    },
    serializers: {
      req(request) {
        return {
          method: request.method,
          url: request.url,
          hostname: request.hostname,
          remoteAddress: request.ip,
        };
      },
    },
  };
}

export function sanitizeErrorMessage(message: string): string {
  return message.replace(
    /(password|token|secret|authorization|bearer)\s*[:=]\s*\S+/gi,
    "$1=[REDACTED]",
  );
}

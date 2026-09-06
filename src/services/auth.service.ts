import bcrypt from "bcryptjs";
import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { ConflictError, UnauthorizedError, ValidationError } from "../lib/errors";
import { prisma } from "../lib/prisma";

const BCRYPT_ROUNDS = 12;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface AuthResult {
  token: string;
  user: { id: string; email: string };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function assertPassword(password: string): void {
  if (password.length < 8) {
    throw new ValidationError("Password must be at least 8 characters");
  }
}

export async function registerUser(
  app: FastifyInstance,
  email: string,
  password: string,
): Promise<AuthResult> {
  const normalized = normalizeEmail(email);
  if (!EMAIL_REGEX.test(normalized)) {
    throw new ValidationError("A valid email address is required");
  }
  assertPassword(password);

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  try {
    const user = await prisma.user.create({
      data: { email: normalized, passwordHash },
      select: { id: true, email: true },
    });

    const token = await app.jwt.sign(
      { sub: user.id, email: user.email, typ: "access" },
      { expiresIn: "7d" },
    );

    return { token, user };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ConflictError("An account with that email already exists");
    }
    throw error;
  }
}

export async function loginUser(
  app: FastifyInstance,
  email: string,
  password: string,
): Promise<AuthResult> {
  const normalized = normalizeEmail(email);
  const user = await prisma.user.findUnique({
    where: { email: normalized },
    select: { id: true, email: true, passwordHash: true },
  });

  if (!user) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const token = await app.jwt.sign(
    { sub: user.id, email: user.email, typ: "access" },
    { expiresIn: "7d" },
  );

  return { token, user: { id: user.id, email: user.email } };
}

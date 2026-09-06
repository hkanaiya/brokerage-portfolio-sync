import type { FastifyInstance } from "fastify";
import { getAdapter, listConnectors } from "../adapters/registry";
import { parseManualHoldings } from "../adapters/val-private";
import type { NormalizedAccount } from "../adapters/types";
import { encrypt, generateStateNonce } from "../lib/crypto";
import { ValidationError } from "../lib/errors";
import { prisma } from "../lib/prisma";

export function getConnectors() {
  return listConnectors();
}

export async function initiateConnect(
  app: FastifyInstance,
  userId: string,
  email: string,
  brokerId: string,
) {
  const adapter = getAdapter(brokerId);
  const nonce = generateStateNonce();
  const state = await app.jwt.sign(
    { sub: userId, email, typ: "oauth_state", brokerId: adapter.brokerId, nonce },
    { expiresIn: "10m" },
  );

  return {
    brokerId: adapter.brokerId,
    displayName: adapter.displayName,
    flow: adapter.flow,
    authUrl: adapter.getAuthUrl(state),
    state,
  };
}

export async function completeConnect(
  app: FastifyInstance,
  userId: string,
  input: {
    brokerId: string;
    code: string;
    state: string;
    holdings?: unknown;
  },
) {
  const adapter = getAdapter(input.brokerId);

  let statePayload: { sub: string; typ?: string; brokerId?: string };
  try {
    statePayload = app.jwt.verify<{ sub: string; typ?: string; brokerId?: string }>(input.state);
  } catch {
    throw new ValidationError("Invalid or expired connection state");
  }

  if (statePayload.typ !== "oauth_state") {
    throw new ValidationError("Invalid connection state");
  }
  if (statePayload.sub !== userId) {
    throw new ValidationError("Connection state does not match the authenticated user");
  }
  if (statePayload.brokerId !== adapter.brokerId) {
    throw new ValidationError("Connection state broker does not match");
  }

  const token = await adapter.exchangeToken(input.code || (adapter.flow === "manual" ? "manual" : ""));

  if (adapter.flow === "manual" && input.holdings != null) {
    token.holdings = parseManualHoldings(input.holdings) as NormalizedAccount[];
  }

  const encryptedToken = encrypt(JSON.stringify(token));

  const existing = await prisma.brokerageConnection.findUnique({
    where: { userId_brokerId: { userId, brokerId: adapter.brokerId } },
  });

  const connection = existing
    ? await prisma.brokerageConnection.update({
        where: { id: existing.id },
        data: { encryptedToken, status: "active" },
        select: {
          id: true,
          brokerId: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    : await prisma.brokerageConnection.create({
        data: {
          userId,
          brokerId: adapter.brokerId,
          encryptedToken,
          status: "active",
        },
        select: {
          id: true,
          brokerId: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });

  return connection;
}

export async function listConnections(userId: string) {
  return prisma.brokerageConnection.findMany({
    where: { userId },
    select: {
      id: true,
      brokerId: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      accounts: {
        select: {
          id: true,
          brokerAccountId: true,
          name: true,
          type: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

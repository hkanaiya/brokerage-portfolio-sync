import { Prisma } from "@prisma/client";
import { getAdapter } from "../adapters/registry";
import type { NormalizedAccount, StoredBrokerToken } from "../adapters/types";
import { decrypt } from "../lib/crypto";
import { ConflictError, NotFoundError } from "../lib/errors";
import { sanitizeErrorMessage } from "../lib/logger";
import { prisma } from "../lib/prisma";

function toDecimal(value: string, scale: number): Prisma.Decimal {
  const parsed = Number(value);
  const safe = Number.isFinite(parsed) ? parsed : 0;
  return new Prisma.Decimal(safe.toFixed(scale));
}

function parseStoredToken(encryptedToken: string): StoredBrokerToken {
  const raw = decrypt(encryptedToken);
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== "object" || parsed === null || !("accessToken" in parsed)) {
    throw new Error("Stored broker token is malformed");
  }
  return parsed as StoredBrokerToken;
}

async function upsertAccountsAndHoldings(
  connectionId: string,
  accounts: NormalizedAccount[],
  syncedAt: Date,
): Promise<number> {
  let itemsSynced = 0;

  for (const account of accounts) {
    const persisted = await prisma.account.upsert({
      where: {
        connectionId_brokerAccountId: {
          connectionId,
          brokerAccountId: account.brokerAccountId,
        },
      },
      create: {
        connectionId,
        brokerAccountId: account.brokerAccountId,
        name: account.name,
        type: account.type,
      },
      update: {
        name: account.name,
        type: account.type,
      },
    });

    for (const holding of account.holdings) {
      const ticker = holding.ticker.trim().toUpperCase();
      await prisma.holding.upsert({
        where: {
          accountId_ticker: {
            accountId: persisted.id,
            ticker,
          },
        },
        create: {
          accountId: persisted.id,
          ticker,
          quantity: toDecimal(holding.quantity, 6),
          price: toDecimal(holding.price, 4),
          marketValue: toDecimal(holding.marketValue, 2),
          lastSyncedAt: syncedAt,
        },
        update: {
          quantity: toDecimal(holding.quantity, 6),
          price: toDecimal(holding.price, 4),
          marketValue: toDecimal(holding.marketValue, 2),
          lastSyncedAt: syncedAt,
        },
      });
      itemsSynced += 1;
    }
  }

  return itemsSynced;
}

export async function syncConnection(connectionId: string, userId?: string) {
  const connection = await prisma.brokerageConnection.findFirst({
    where: userId ? { id: connectionId, userId } : { id: connectionId },
  });

  if (!connection) {
    throw new NotFoundError("Connection not found");
  }

  const running = await prisma.syncRun.findFirst({
    where: { connectionId, status: "running" },
    orderBy: { startedAt: "desc" },
  });
  if (running) {
    throw new ConflictError("A sync is already running for this connection");
  }

  const syncRun = await prisma.syncRun.create({
    data: {
      connectionId,
      status: "running",
    },
  });

  try {
    const adapter = getAdapter(connection.brokerId);
    const token = parseStoredToken(connection.encryptedToken);
    const accounts = await adapter.fetchHoldings(token);
    const syncedAt = new Date();
    const itemsSynced = await upsertAccountsAndHoldings(connectionId, accounts, syncedAt);

    const [completed] = await prisma.$transaction([
      prisma.syncRun.update({
        where: { id: syncRun.id },
        data: {
          status: "success",
          itemsSynced,
          completedAt: syncedAt,
        },
      }),
      prisma.brokerageConnection.update({
        where: { id: connectionId },
        data: { status: "active" },
      }),
    ]);

    return completed;
  } catch (error) {
    const message = sanitizeErrorMessage(
      error instanceof Error ? error.message : "Unknown sync error",
    );

    await prisma.$transaction([
      prisma.syncRun.update({
        where: { id: syncRun.id },
        data: {
          status: "failed",
          error: message,
          completedAt: new Date(),
        },
      }),
      prisma.brokerageConnection.update({
        where: { id: connectionId },
        data: { status: "error" },
      }),
    ]);

    throw error;
  }
}

export async function syncAllActiveConnections(): Promise<{
  attempted: number;
  succeeded: number;
  failed: number;
}> {
  const connections = await prisma.brokerageConnection.findMany({
    where: { status: { in: ["active", "error"] } },
    select: { id: true },
  });

  let succeeded = 0;
  let failed = 0;

  for (const connection of connections) {
    try {
      await syncConnection(connection.id);
      succeeded += 1;
    } catch {
      failed += 1;
    }
  }

  return { attempted: connections.length, succeeded, failed };
}

export async function listHoldings(userId: string) {
  const holdings = await prisma.holding.findMany({
    where: {
      account: {
        connection: { userId },
      },
    },
    select: {
      ticker: true,
      quantity: true,
      price: true,
      marketValue: true,
      lastSyncedAt: true,
      account: {
        select: {
          id: true,
          name: true,
          type: true,
          connection: {
            select: {
              brokerId: true,
            },
          },
        },
      },
    },
    orderBy: [{ ticker: "asc" }],
  });

  return holdings.map((holding) => ({
    account: holding.account.name,
    accountId: holding.account.id,
    accountType: holding.account.type,
    broker: holding.account.connection.brokerId,
    ticker: holding.ticker,
    quantity: Number(holding.quantity.toString()),
    price: Number(holding.price.toString()),
    marketValue: Number(holding.marketValue.toString()),
    lastSyncedAt: holding.lastSyncedAt,
  }));
}

export async function getPortfolioSummary(userId: string) {
  const holdings = await listHoldings(userId);
  const totalMarketValue = holdings.reduce((sum, row) => sum + row.marketValue, 0);

  const brokerMap = new Map<string, { broker: string; marketValue: number; accountIds: Set<string> }>();
  const accountMap = new Map<
    string,
    { accountId: string; name: string; broker: string; marketValue: number }
  >();

  for (const row of holdings) {
    const broker = brokerMap.get(row.broker) ?? {
      broker: row.broker,
      marketValue: 0,
      accountIds: new Set<string>(),
    };
    broker.marketValue += row.marketValue;
    broker.accountIds.add(row.accountId);
    brokerMap.set(row.broker, broker);

    const account = accountMap.get(row.accountId) ?? {
      accountId: row.accountId,
      name: row.account,
      broker: row.broker,
      marketValue: 0,
    };
    account.marketValue += row.marketValue;
    accountMap.set(row.accountId, account);
  }

  return {
    totalMarketValue: Number(totalMarketValue.toFixed(2)),
    byBroker: [...brokerMap.values()].map((entry) => ({
      broker: entry.broker,
      marketValue: Number(entry.marketValue.toFixed(2)),
      accountCount: entry.accountIds.size,
    })),
    byAccount: [...accountMap.values()].map((entry) => ({
      ...entry,
      marketValue: Number(entry.marketValue.toFixed(2)),
    })),
  };
}

export async function listSyncRuns(userId: string, connectionId?: string) {
  return prisma.syncRun.findMany({
    where: {
      connection: {
        userId,
        ...(connectionId ? { id: connectionId } : {}),
      },
    },
    select: {
      id: true,
      connectionId: true,
      status: true,
      itemsSynced: true,
      error: true,
      startedAt: true,
      completedAt: true,
      connection: {
        select: { brokerId: true },
      },
    },
    orderBy: { startedAt: "desc" },
    take: 100,
  });
}

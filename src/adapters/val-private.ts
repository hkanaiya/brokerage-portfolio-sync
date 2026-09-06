import { ValidationError } from "../lib/errors";
import type {
  BrokerAdapter,
  NormalizedAccount,
  NormalizedHolding,
  StoredBrokerToken,
} from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseHolding(raw: unknown): NormalizedHolding {
  if (!isRecord(raw) || typeof raw.ticker !== "string" || !raw.ticker.trim()) {
    throw new ValidationError("Each holding must include a ticker");
  }
  return {
    ticker: raw.ticker.trim().toUpperCase(),
    quantity: String(raw.quantity ?? "0"),
    price: String(raw.price ?? "0"),
    marketValue: String(raw.marketValue ?? "0"),
  };
}

function parseAccount(raw: unknown): NormalizedAccount {
  if (!isRecord(raw) || typeof raw.brokerAccountId !== "string" || !raw.brokerAccountId.trim()) {
    throw new ValidationError("Each account must include a brokerAccountId");
  }
  const holdings = Array.isArray(raw.holdings) ? raw.holdings.map(parseHolding) : [];
  return {
    brokerAccountId: raw.brokerAccountId.trim(),
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : "Manual Account",
    type: typeof raw.type === "string" && raw.type.trim() ? raw.type.trim() : "brokerage",
    holdings,
  };
}

export function parseManualHoldings(input: unknown): NormalizedAccount[] {
  if (input == null) {
    return [];
  }
  if (!Array.isArray(input)) {
    throw new ValidationError("Manual holdings must be an array of accounts");
  }
  return input.map(parseAccount);
}

export const valPrivateAdapter: BrokerAdapter = {
  brokerId: "val-private",
  displayName: "VAL Private (manual ingest)",
  flow: "manual",

  getAuthUrl(state: string): string {
    return `manual://val-private?state=${encodeURIComponent(state)}`;
  },

  async exchangeToken(code: string): Promise<StoredBrokerToken> {
    const trimmed = code.trim();
    let holdings: NormalizedAccount[] = [];

    if (trimmed && trimmed !== "manual") {
      try {
        const parsed: unknown = JSON.parse(trimmed);
        holdings = parseManualHoldings(parsed);
      } catch (error) {
        if (error instanceof ValidationError) {
          throw error;
        }
        throw new ValidationError("Manual ingest code must be valid JSON holdings");
      }
    }

    return {
      accessToken: "manual",
      tokenType: "manual",
      obtainedAt: new Date().toISOString(),
      holdings,
    };
  },

  async fetchHoldings(token: StoredBrokerToken): Promise<NormalizedAccount[]> {
    return token.holdings ?? [];
  },
};

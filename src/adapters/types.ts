export type BrokerId = "robinhood" | "ibkr" | "schwab" | "itrustcapital" | "val-private";

export interface NormalizedHolding {
  ticker: string;
  quantity: string;
  price: string;
  marketValue: string;
}

export interface NormalizedAccount {
  brokerAccountId: string;
  name: string;
  type: string;
  holdings: NormalizedHolding[];
}

export interface StoredBrokerToken {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  expiresAt?: string;
  obtainedAt: string;
  holdings?: NormalizedAccount[];
}

export interface BrokerAdapter {
  readonly brokerId: BrokerId;
  readonly displayName: string;
  readonly flow: "oauth" | "manual";
  getAuthUrl(state: string): string;
  exchangeToken(code: string): Promise<StoredBrokerToken>;
  fetchHoldings(token: StoredBrokerToken): Promise<NormalizedAccount[]>;
}

export interface ConnectorDescriptor {
  brokerId: BrokerId;
  displayName: string;
  flow: "oauth" | "manual";
}

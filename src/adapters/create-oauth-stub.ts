import { ValidationError } from "../lib/errors";
import type { BrokerAdapter, BrokerId, NormalizedAccount, StoredBrokerToken } from "./types";

interface OAuthStubOptions {
  brokerId: BrokerId;
  displayName: string;
  authorizeBaseUrl: string;
  clientId: string;
  redirectUri: string;
}

/**
 * Production-shaped OAuth adapter used until a live broker integration is wired.
 * Token exchange stores the authorization code as a stand-in access token.
 * fetchHoldings returns an empty set so the sync pipeline can run end-to-end.
 */
export function createOAuthStubAdapter(options: OAuthStubOptions): BrokerAdapter {
  return {
    brokerId: options.brokerId,
    displayName: options.displayName,
    flow: "oauth",

    getAuthUrl(state: string): string {
      const url = new URL(options.authorizeBaseUrl);
      if (options.clientId) {
        url.searchParams.set("client_id", options.clientId);
      }
      if (options.redirectUri) {
        url.searchParams.set("redirect_uri", options.redirectUri);
      }
      url.searchParams.set("response_type", "code");
      url.searchParams.set("state", state);
      url.searchParams.set("scope", "read");
      return url.toString();
    },

    async exchangeToken(code: string): Promise<StoredBrokerToken> {
      if (!code.trim()) {
        throw new ValidationError("Authorization code is required");
      }
      return {
        accessToken: code.trim(),
        tokenType: "stub",
        obtainedAt: new Date().toISOString(),
      };
    },

    async fetchHoldings(_token: StoredBrokerToken): Promise<NormalizedAccount[]> {
      return [];
    },
  };
}

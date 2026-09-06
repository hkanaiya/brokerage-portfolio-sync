import { env } from "../config/env";
import { createOAuthStubAdapter } from "./create-oauth-stub";

export const ibkrAdapter = createOAuthStubAdapter({
  brokerId: "ibkr",
  displayName: "Interactive Brokers",
  authorizeBaseUrl: "https://www.interactivebrokers.com/sso/Login",
  clientId: env.IBKR_CLIENT_ID,
  redirectUri: env.IBKR_REDIRECT_URI || `${env.APP_URL}/oauth/ibkr/callback`,
});

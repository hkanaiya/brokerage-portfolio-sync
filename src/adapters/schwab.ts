import { env } from "../config/env";
import { createOAuthStubAdapter } from "./create-oauth-stub";

export const schwabAdapter = createOAuthStubAdapter({
  brokerId: "schwab",
  displayName: "Charles Schwab",
  authorizeBaseUrl: "https://api.schwabapi.com/v1/oauth/authorize",
  clientId: env.SCHWAB_CLIENT_ID,
  redirectUri: env.SCHWAB_REDIRECT_URI || `${env.APP_URL}/oauth/schwab/callback`,
});

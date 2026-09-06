import { env } from "../config/env";
import { createOAuthStubAdapter } from "./create-oauth-stub";

export const robinhoodAdapter = createOAuthStubAdapter({
  brokerId: "robinhood",
  displayName: "Robinhood",
  authorizeBaseUrl: "https://api.robinhood.com/oauth2/authorize/",
  clientId: env.ROBINHOOD_CLIENT_ID,
  redirectUri: env.ROBINHOOD_REDIRECT_URI || `${env.APP_URL}/oauth/robinhood/callback`,
});

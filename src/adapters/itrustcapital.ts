import { env } from "../config/env";
import { createOAuthStubAdapter } from "./create-oauth-stub";

export const itrustcapitalAdapter = createOAuthStubAdapter({
  brokerId: "itrustcapital",
  displayName: "iTrustCapital",
  authorizeBaseUrl: "https://itrustcapital.com/oauth/authorize",
  clientId: env.ITRUSTCAPITAL_CLIENT_ID,
  redirectUri: env.ITRUSTCAPITAL_REDIRECT_URI || `${env.APP_URL}/oauth/itrustcapital/callback`,
});

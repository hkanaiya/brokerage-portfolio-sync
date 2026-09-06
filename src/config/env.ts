import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z.string().default("info"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, "ENCRYPTION_KEY must be a 64-character hex string (32 bytes)"),
  CORS_ORIGIN: z.string().default("*"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  CRON_TZ: z.string().default("America/New_York"),
  ROBINHOOD_CLIENT_ID: z.string().optional().default(""),
  ROBINHOOD_REDIRECT_URI: z.string().optional().default(""),
  IBKR_CLIENT_ID: z.string().optional().default(""),
  IBKR_REDIRECT_URI: z.string().optional().default(""),
  SCHWAB_CLIENT_ID: z.string().optional().default(""),
  SCHWAB_REDIRECT_URI: z.string().optional().default(""),
  ITRUSTCAPITAL_CLIENT_ID: z.string().optional().default(""),
  ITRUSTCAPITAL_REDIRECT_URI: z.string().optional().default(""),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${details}`);
  }
  return parsed.data;
}

export const env = loadEnv();

export const isProduction = env.NODE_ENV === "production";

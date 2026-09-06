export const errorResponseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    statusCode: { type: "integer" },
    error: { type: "string" },
    message: { type: "string" },
    code: { type: "string" },
  },
  required: ["statusCode", "error", "message"],
} as const;

export const authBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["email", "password"],
  properties: {
    email: { type: "string", format: "email" },
    password: { type: "string", minLength: 8 },
  },
} as const;

export const authResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["token", "user"],
  properties: {
    token: { type: "string" },
    user: {
      type: "object",
      additionalProperties: false,
      required: ["id", "email"],
      properties: {
        id: { type: "string" },
        email: { type: "string" },
      },
    },
  },
} as const;

export const connectorSchema = {
  type: "object",
  additionalProperties: false,
  required: ["brokerId", "displayName", "flow"],
  properties: {
    brokerId: { type: "string" },
    displayName: { type: "string" },
    flow: { type: "string", enum: ["oauth", "manual"] },
  },
} as const;

export const holdingSchema = {
  type: "object",
  additionalProperties: false,
  required: ["account", "broker", "ticker", "quantity", "price", "marketValue"],
  properties: {
    account: { type: "string" },
    accountId: { type: "string" },
    accountType: { type: "string" },
    broker: { type: "string" },
    ticker: { type: "string" },
    quantity: { type: "number" },
    price: { type: "number" },
    marketValue: { type: "number" },
    lastSyncedAt: { type: "string", format: "date-time" },
  },
} as const;

import type { FastifyInstance } from "fastify";
import {
  completeConnect,
  getConnectors,
  initiateConnect,
  listConnections,
} from "../services/connection.service";
import {
  getPortfolioSummary,
  listHoldings,
  listSyncRuns,
  syncConnection,
} from "../services/sync.service";
import { connectorSchema, errorResponseSchema, holdingSchema } from "./schemas";

interface InitiateBody {
  brokerId: string;
}

interface CallbackBody {
  brokerId: string;
  code?: string;
  state: string;
  holdings?: unknown;
}

interface SyncParams {
  connectionId: string;
}

interface SyncRunsQuery {
  connectionId?: string;
}

export async function portfolioRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", app.authenticate);

  app.get(
    "/connectors",
    {
      schema: {
        tags: ["portfolio"],
        summary: "List supported brokerage connectors",
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: "object",
            properties: {
              connectors: { type: "array", items: connectorSchema },
            },
          },
        },
      },
    },
    async () => ({ connectors: getConnectors() }),
  );

  app.post<{ Body: InitiateBody }>(
    "/connect/initiate",
    {
      schema: {
        tags: ["portfolio"],
        summary: "Start a brokerage connection (OAuth or manual)",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          additionalProperties: false,
          required: ["brokerId"],
          properties: {
            brokerId: {
              type: "string",
              enum: ["robinhood", "ibkr", "schwab", "itrustcapital", "val-private"],
            },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              brokerId: { type: "string" },
              displayName: { type: "string" },
              flow: { type: "string" },
              authUrl: { type: "string" },
              state: { type: "string" },
            },
          },
          400: errorResponseSchema,
        },
      },
    },
    async (request) => {
      return initiateConnect(app, request.user.sub, request.user.email, request.body.brokerId);
    },
  );

  app.post<{ Body: CallbackBody }>(
    "/connect/callback",
    {
      schema: {
        tags: ["portfolio"],
        summary: "Complete a brokerage connection after OAuth or manual ingest",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          additionalProperties: false,
          required: ["brokerId", "state"],
          properties: {
            brokerId: {
              type: "string",
              enum: ["robinhood", "ibkr", "schwab", "itrustcapital", "val-private"],
            },
            code: { type: "string" },
            state: { type: "string" },
            holdings: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: true,
                properties: {
                  brokerAccountId: { type: "string" },
                  name: { type: "string" },
                  type: { type: "string" },
                  holdings: { type: "array", items: { type: "object", additionalProperties: true } },
                },
              },
            },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              id: { type: "string" },
              brokerId: { type: "string" },
              status: { type: "string" },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
            },
          },
          400: errorResponseSchema,
        },
      },
    },
    async (request) => {
      return completeConnect(app, request.user.sub, {
        brokerId: request.body.brokerId,
        code: request.body.code ?? "",
        state: request.body.state,
        holdings: request.body.holdings,
      });
    },
  );

  app.get(
    "/connections",
    {
      schema: {
        tags: ["portfolio"],
        summary: "List the authenticated user's brokerage connections",
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: "object",
            properties: {
              connections: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    brokerId: { type: "string" },
                    status: { type: "string" },
                    createdAt: { type: "string", format: "date-time" },
                    updatedAt: { type: "string", format: "date-time" },
                    accounts: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          brokerAccountId: { type: "string" },
                          name: { type: "string" },
                          type: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request) => ({ connections: await listConnections(request.user.sub) }),
  );

  app.get(
    "/holdings",
    {
      schema: {
        tags: ["portfolio"],
        summary: "Aggregated holdings across all connected brokers",
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: "object",
            properties: {
              holdings: { type: "array", items: holdingSchema },
            },
          },
        },
      },
    },
    async (request) => ({ holdings: await listHoldings(request.user.sub) }),
  );

  app.get(
    "/summary",
    {
      schema: {
        tags: ["portfolio"],
        summary: "Portfolio totals by broker and account",
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: "object",
            properties: {
              totalMarketValue: { type: "number" },
              byBroker: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    broker: { type: "string" },
                    marketValue: { type: "number" },
                    accountCount: { type: "integer" },
                  },
                },
              },
              byAccount: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    accountId: { type: "string" },
                    name: { type: "string" },
                    broker: { type: "string" },
                    marketValue: { type: "number" },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request) => getPortfolioSummary(request.user.sub),
  );

  app.post<{ Params: SyncParams }>(
    "/sync/:connectionId",
    {
      schema: {
        tags: ["portfolio"],
        summary: "Trigger an on-demand holdings sync for a connection",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          required: ["connectionId"],
          properties: {
            connectionId: { type: "string", format: "uuid" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              id: { type: "string" },
              connectionId: { type: "string" },
              status: { type: "string" },
              itemsSynced: { type: "integer" },
              error: { type: ["string", "null"] },
              startedAt: { type: "string", format: "date-time" },
              completedAt: { type: ["string", "null"], format: "date-time" },
            },
          },
          404: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
    },
    async (request) => syncConnection(request.params.connectionId, request.user.sub),
  );

  app.get<{ Querystring: SyncRunsQuery }>(
    "/sync-runs",
    {
      schema: {
        tags: ["portfolio"],
        summary: "List recent sync runs for the authenticated user",
        security: [{ bearerAuth: [] }],
        querystring: {
          type: "object",
          additionalProperties: false,
          properties: {
            connectionId: { type: "string", format: "uuid" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              syncRuns: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    connectionId: { type: "string" },
                    status: { type: "string" },
                    itemsSynced: { type: "integer" },
                    error: { type: ["string", "null"] },
                    startedAt: { type: "string", format: "date-time" },
                    completedAt: { type: ["string", "null"], format: "date-time" },
                    connection: {
                      type: "object",
                      properties: {
                        brokerId: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request) => ({
      syncRuns: await listSyncRuns(request.user.sub, request.query.connectionId),
    }),
  );
}

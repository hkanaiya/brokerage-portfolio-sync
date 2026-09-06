import { ValidationError } from "../lib/errors";
import { ibkrAdapter } from "./ibkr";
import { itrustcapitalAdapter } from "./itrustcapital";
import { robinhoodAdapter } from "./robinhood";
import { schwabAdapter } from "./schwab";
import type { BrokerAdapter, BrokerId, ConnectorDescriptor } from "./types";
import { valPrivateAdapter } from "./val-private";

const adapters: Record<BrokerId, BrokerAdapter> = {
  robinhood: robinhoodAdapter,
  ibkr: ibkrAdapter,
  schwab: schwabAdapter,
  itrustcapital: itrustcapitalAdapter,
  "val-private": valPrivateAdapter,
};

export function listConnectors(): ConnectorDescriptor[] {
  return Object.values(adapters).map((adapter) => ({
    brokerId: adapter.brokerId,
    displayName: adapter.displayName,
    flow: adapter.flow,
  }));
}

export function getAdapter(brokerId: string): BrokerAdapter {
  const adapter = adapters[brokerId as BrokerId];
  if (!adapter) {
    throw new ValidationError(`Unsupported broker: ${brokerId}`);
  }
  return adapter;
}

export function isBrokerId(value: string): value is BrokerId {
  return value in adapters;
}

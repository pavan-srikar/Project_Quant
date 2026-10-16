import type { Account, ClosedPosition, Fill, Order, Position } from "../../schemas.ts";
import { getKnownPrice } from "../binance.ts";
import { getSeedPrice } from "../candles.ts";

export const STARTING_BALANCE = 100_000;
export const DEFAULT_LEVERAGE = 100;

export const account: Account = {
  id: crypto.randomUUID(),
  userId: "demo-user",
  templateId: "demo",
  label: "Demo Account",
  status: "ACTIVE",
  balance: STARTING_BALANCE,
  equity: STARTING_BALANCE,
  margin: 0,
  freeMargin: STARTING_BALANCE,
  phase: "LIVE",
  startDate: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isHftMode: false,
  template: { name: "Demo Account", startingBalance: STARTING_BALANCE, instrumentType: "CRYPTO" },
};

export const positions: Position[] = [];
export const orders: Order[] = [];
export const closed: ClosedPosition[] = [];
export const fills: Fill[] = [];
export const lastPrice = new Map<string, number>();

export function getAccount(): Account {
  return { ...account };
}

export function getAccounts(): Account[] {
  return [getAccount()];
}

export function getPositions(): Position[] {
  return positions.map((p) => ({ ...p }));
}

export function getOrders(): Order[] {
  return orders.map((o) => ({ ...o }));
}

export function getClosedPositions(): ClosedPosition[] {
  return closed.map((c) => ({ ...c }));
}

export function getFills(): Fill[] {
  return fills.map((f) => ({ ...f }));
}

export function getLastPrice(symbol: string): number {
  const p = lastPrice.get(symbol);
  if (p && p > 0) return p;
  const seed = getSeedPrice(symbol);
  if (seed && seed > 0) return seed;
  const known = getKnownPrice(symbol);
  if (known && known > 0) return known;
  return 0;
}

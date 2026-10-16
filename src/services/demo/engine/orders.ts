import type { Order, Position } from "../../schemas.ts";
import { publish } from "../bus.ts";
import { account, orders, positions, lastPrice } from "./state.ts";
import { pnlOf, recomputeEquity, emitEquity } from "./accounting.ts";
import { openPosition, closePosition } from "./positions.ts";

export type PlaceOrderArgs = {
  accountId: string;
  symbol: string;
  side: string;
  type: string;
  quantity: number;
  price?: number;
  stopPrice?: number;
  takeProfit?: number;
  stopLoss?: number;
};

export function makeFilledOrder(input: PlaceOrderArgs, price: number): Order {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    accountId: account.id,
    symbolName: input.symbol,
    side: input.side === "BUY" ? "BUY" : "SELL",
    type: (input.type as Order["type"]) ?? "MARKET",
    quantity: input.quantity,
    price: input.price ?? null,
    stopPrice: input.stopPrice ?? null,
    takeProfit: input.takeProfit ?? null,
    stopLoss: input.stopLoss ?? null,
    status: "FILLED",
    filledQuantity: input.quantity,
    avgFillPrice: price,
    comment: null,
    createdAt: now,
    updatedAt: now,
  };
}

/** Market orders fill instantly at the latest price; an open position is created. */
export function placeOrder(input: PlaceOrderArgs): Order {
  const price = input.price ?? lastPrice.get(input.symbol) ?? 0;
  const order = makeFilledOrder(input, price);
  orders.unshift(order);
  publish("orders", { eventType: "OrderPlaced", accountId: account.id, orderId: order.id, _entity: { ...order } });
  publish("orders", { eventType: "OrderFilled", accountId: account.id, orderId: order.id, _entity: { ...order } });
  openPosition(input.symbol, input.side, input.quantity, price, input.takeProfit, input.stopLoss);
  recomputeEquity();
  emitEquity();
  return order;
}

export function modifyOrder(
  orderId: string,
  mods: {
    price?: number | null;
    stopPrice?: number | null;
    quantity?: number;
    takeProfit?: number | null;
    stopLoss?: number | null;
  },
): Order | undefined {
  const ord = orders.find((o) => o.id === orderId);
  if (!ord) return undefined;
  if (mods.price !== undefined) ord.price = mods.price;
  if (mods.stopPrice !== undefined) ord.stopPrice = mods.stopPrice;
  if (mods.quantity !== undefined) ord.quantity = mods.quantity;
  if (mods.takeProfit !== undefined) ord.takeProfit = mods.takeProfit;
  if (mods.stopLoss !== undefined) ord.stopLoss = mods.stopLoss;
  ord.updatedAt = new Date().toISOString();
  publish("orders", { eventType: "OrderUpdated", accountId: account.id, orderId, _entity: { ...ord } });
  return { ...ord };
}

export function cancelOrder(orderId: string): { success: boolean } {
  const idx = orders.findIndex((o) => o.id === orderId);
  if (idx >= 0) orders.splice(idx, 1);
  publish("orders", { eventType: "OrderCanceled", accountId: account.id, orderId });
  return { success: true };
}

export function checkStops(pos: Position, price: number): boolean {
  const hitTp = pos.takeProfit != null && (pos.side === "LONG" ? price >= pos.takeProfit : price <= pos.takeProfit);
  const hitSl = pos.stopLoss != null && (pos.side === "LONG" ? price <= pos.stopLoss : price >= pos.stopLoss);
  return hitTp || hitSl;
}

/** Called by the feed on every replayed tick: marks positions, fires SL/TP. */
export function mark(symbol: string, price: number): void {
  lastPrice.set(symbol, price);
  const affected = positions.filter((p) => p.symbolName === symbol);
  if (affected.length === 0) return;
  for (const pos of affected) {
    if (checkStops(pos, price)) {
      closePosition(pos.id);
      continue;
    }
    pos.currentPrice = price;
    pos.unrealizedPnl = pnlOf(pos, price);
    publish("positions", {
      eventType: "PositionUpdated",
      accountId: account.id,
      positionId: pos.id,
      unrealizedPnl: pos.unrealizedPnl,
      quantity: pos.quantity,
      averagePrice: pos.entryPrice,
    });
  }
  recomputeEquity();
  emitEquity();
}

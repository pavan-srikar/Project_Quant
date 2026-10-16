import type { Position } from "../../schemas.ts";
import { publish } from "../bus.ts";
import { getDemoSymbol } from "../instruments.ts";
import { account, positions, closed, fills, lastPrice, DEFAULT_LEVERAGE } from "./state.ts";
import { notional, pnlOf, recomputeEquity, emitEquity } from "./accounting.ts";

export function openPosition(
  symbol: string,
  side: string,
  qty: number,
  price: number,
  tp?: number,
  sl?: number,
): Position {
  const isLong = side === "BUY";
  const pos: Position = {
    id: crypto.randomUUID(),
    accountId: account.id,
    symbolName: symbol,
    side: isLong ? "LONG" : "SHORT",
    quantity: qty,
    entryPrice: price,
    currentPrice: price,
    unrealizedPnl: 0,
    margin: notional(symbol, qty, price) / DEFAULT_LEVERAGE,
    contractSize: getDemoSymbol(symbol)?.contractSize ?? 1,
    openedAt: new Date().toISOString(),
    takeProfit: tp ?? null,
    stopLoss: sl ?? null,
  };
  positions.push(pos);
  publish("positions", {
    eventType: "PositionOpened",
    accountId: account.id,
    positionId: pos.id,
    _entity: { ...pos },
  });
  return pos;
}

export function recordClose(pos: Position, qty: number, exitPrice: number, realized: number): void {
  const now = new Date().toISOString();
  closed.unshift({
    id: crypto.randomUUID(),
    accountId: account.id,
    symbolName: pos.symbolName,
    side: pos.side,
    quantity: qty,
    entryPrice: pos.entryPrice,
    exitPrice,
    realizedPnl: realized,
    commission: 0,
    swap: 0,
    openedAt: pos.openedAt,
    closedAt: now,
    isPartialClose: qty < pos.quantity,
  });
  fills.unshift({
    id: crypto.randomUUID(),
    orderId: pos.id,
    accountId: account.id,
    symbolName: pos.symbolName,
    side: pos.side === "LONG" ? "SELL" : "BUY",
    quantity: qty,
    price: exitPrice,
    commission: 0,
    realizedPnl: realized,
    createdAt: now,
  });
}

export function closePosition(positionId: string, quantity?: number): { success: boolean } {
  const idx = positions.findIndex((p) => p.id === positionId);
  if (idx < 0) return { success: false };
  const pos = positions[idx]!;
  const price = lastPrice.get(pos.symbolName) ?? pos.entryPrice;
  const qty = quantity && quantity < pos.quantity ? quantity : pos.quantity;
  const realized = pnlOf({ ...pos, quantity: qty }, price);
  account.balance += realized;
  recordClose(pos, qty, price, realized);
  if (qty >= pos.quantity) {
    positions.splice(idx, 1);
    publish("positions", { eventType: "PositionClosed", accountId: account.id, positionId });
  } else {
    pos.quantity -= qty;
    publish("positions", {
      eventType: "PositionUpdated",
      accountId: account.id,
      positionId,
      quantity: pos.quantity,
    });
  }
  recomputeEquity();
  emitEquity();
  return { success: true };
}

export function closeAllPositions(): { success: boolean } {
  for (const p of [...positions]) closePosition(p.id);
  return { success: true };
}

export function modifyPosition(
  positionId: string,
  mods: { takeProfit?: number | null; stopLoss?: number | null },
): Position | undefined {
  const pos = positions.find((p) => p.id === positionId);
  if (!pos) return undefined;
  if (mods.takeProfit !== undefined) pos.takeProfit = mods.takeProfit;
  if (mods.stopLoss !== undefined) pos.stopLoss = mods.stopLoss;
  publish("positions", {
    eventType: "PositionUpdated",
    accountId: account.id,
    positionId,
    unrealizedPnl: pos.unrealizedPnl,
    quantity: pos.quantity,
    averagePrice: pos.entryPrice,
  });
  return { ...pos };
}

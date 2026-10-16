import type { Position, Order } from "../../services/schemas.ts";

export type MarketDataEvent =
  | {
      eventType: "MarketTick";
      symbol: string;
      bid: number;
      ask: number;
      occurredAt?: number | string;
    }
  | {
      eventType: "CandleUpdate";
      symbol: string;
      timeframe: string;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
      timestamp: number;
    }
  | { eventType: "CandleClosed"; symbol: string; timeframe: string }
  | {
      eventType: "ReplayStateChanged";
      action?: string;
      speed?: number;
      userId?: string;
      cursorTimestamp?: number;
    };

// Position WS event types — enriched server-side with _entity for direct cache updates
export type PositionWsEvent = {
  eventType: "PositionOpened" | "PositionUpdated" | "PositionClosed";
  accountId: string;
  positionId: string;
  // PositionUpdated fields (surgical patch — no DB lookup needed)
  unrealizedPnl?: number;
  quantity?: number;
  averagePrice?: number;
  // Attached by ws-handler enrichment (PositionOpened only)
  _entity?: Position;
};

export type OrderWsEvent = {
  eventType: "OrderPlaced" | "OrderFilled" | "OrderCanceled" | "OrderAccepted" | string;
  accountId: string;
  orderId?: string;
  // Attached by ws-handler enrichment
  _entity?: Order;
};

export type AccountWsEvent = {
  eventType: string;
  accountId?: string;
  equity?: number;
  balance?: number;
  freeMargin?: number;
  marginUsed?: number;
};

export function toTimestamp(value: number | string | undefined): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? Date.now() : parsed;
  }
  return Date.now();
}

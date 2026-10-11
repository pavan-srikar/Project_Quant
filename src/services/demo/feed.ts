import { fetchSinglePrice, getKnownPrice, onTickersUpdated } from "./binance.ts";
import { publish } from "./bus.ts";
import { getSeedPrice } from "./candles.ts";
import { mark } from "./engine.ts";
import { DEMO_SYMBOLS } from "./instruments.ts";

/**
 * Demo market-data feed.
 * Drives real-time tick updates for all active symbols using genuine current prices
 * with realistic sub-tick micro-jitter, and seamlessly synchronizes with Binance ticker updates.
 */

const TICK_MS = 600;

type SymbolCursor = {
  symbol: string;
  currentPrice: number;
  spread: number;
  tickSize: number;
};

let timer: ReturnType<typeof setInterval> | null = null;
let cursors: SymbolCursor[] = [];

function buildCursors(): SymbolCursor[] {
  return DEMO_SYMBOLS.map((s) => {
    const seed = getKnownPrice(s.name) ?? getSeedPrice(s.name);
    const tickSize = s.tickSize ?? 0.01;
    const spread = Math.max(tickSize, (seed > 0 ? seed : 1) * 0.0001);
    const cursor: SymbolCursor = {
      symbol: s.name,
      currentPrice: seed > 0 ? seed : 0,
      spread,
      tickSize,
    };
    if (seed <= 0) {
      void fetchSinglePrice(s.name).then((price) => {
        if (price > 0) updateFeedPrice(s.name, price, s.tickSize);
      });
    }
    return cursor;
  });
}

function emitTick(cursor: SymbolCursor): void {
  if (cursor.currentPrice <= 0) {
    const known = getKnownPrice(cursor.symbol) ?? getSeedPrice(cursor.symbol);
    if (known && known > 0) {
      cursor.currentPrice = known;
      cursor.spread = Math.max(cursor.tickSize, known * 0.0001);
    } else {
      return;
    }
  }

  // Realistic sub-tick micro-fluctuations around currentPrice
  const jitter = (Math.random() - 0.495) * cursor.spread * 0.35;
  const price = Math.max(cursor.tickSize, cursor.currentPrice + jitter);

  const half = cursor.spread / 2;
  const bid = price - half;
  const ask = price + half;
  if (bid <= 0 || ask <= 0) return;

  publish("market-data", {
    eventType: "MarketTick",
    symbol: cursor.symbol,
    bid,
    ask,
    occurredAt: Date.now(),
  });
  mark(cursor.symbol, price);
}

export function updateFeedPrice(symbolName: string, price: number, tickSize?: number): void {
  if (!Number.isFinite(price) || price <= 0) return;
  const s = DEMO_SYMBOLS.find((item) => item.name === symbolName);
  const ts = tickSize ?? s?.tickSize ?? 0.01;
  const spread = Math.max(ts, price * 0.0001);

  const existing = cursors.find((c) => c.symbol === symbolName);
  if (existing) {
    existing.currentPrice = price;
    existing.spread = spread;
    existing.tickSize = ts;
    emitTick(existing);
    return;
  }

  const cursor: SymbolCursor = {
    symbol: symbolName,
    currentPrice: price,
    spread,
    tickSize: ts,
  };
  cursors.push(cursor);
  emitTick(cursor);
}

// Automatically sync feed cursors whenever 24hr tickers arrive from Binance
onTickersUpdated((tickers) => {
  const tickerMap = new Map(tickers.map((t) => [t.symbol, t]));
  for (const s of DEMO_SYMBOLS) {
    const t = tickerMap.get(s.name);
    if (t && t.price > 0) {
      updateFeedPrice(s.name, t.price, s.tickSize);
    }
  }
});

export function registerFeedSymbol(symbolName: string): void {
  const s = DEMO_SYMBOLS.find((item) => item.name === symbolName);
  let seed = getKnownPrice(symbolName);
  if (!seed || seed <= 0) {
    seed = getSeedPrice(symbolName);
  }
  if (seed && seed > 0) {
    updateFeedPrice(symbolName, seed, s?.tickSize);
  } else {
    void fetchSinglePrice(symbolName).then((price) => {
      if (price > 0) {
        updateFeedPrice(symbolName, price, s?.tickSize);
      }
    });
  }
}

export function startDemoFeed(): void {
  if (timer) return;
  cursors = buildCursors();
  // Seed an initial price for every symbol so panels render immediately.
  for (const c of cursors) emitTick(c);
  timer = setInterval(() => {
    for (const c of cursors) emitTick(c);
  }, TICK_MS);
}

export function stopDemoFeed(): void {
  if (timer) clearInterval(timer);
  timer = null;
}

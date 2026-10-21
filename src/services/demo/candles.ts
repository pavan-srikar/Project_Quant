import type { Candle } from "../schemas.ts";
import { getKnownPrice } from "./binance.ts";
import { DEMO_SYMBOLS } from "./instruments.ts";
import {
  areCandlesConnecting,
  candleRepository,
  hasDiscontinuity,
} from "../market-data/index.ts";

export { areCandlesConnecting, hasDiscontinuity };

/**
 * Real history for a symbol/timeframe. Returns genuine Binance series from the unified repository.
 */
export function getHistory(
  symbol: string,
  timeframe: string,
  limit?: number,
  targetTimeSec?: number,
): Candle[] {
  const bars = candleRepository.getSeries(symbol, timeframe);
  if (bars.length === 0) return [];
  if (targetTimeSec && targetTimeSec > 0) return bars;
  return limit && limit < bars.length ? bars.slice(-limit) : bars;
}

/**
 * Dynamic on-demand candle fetcher: uses the unified CandleRepository Single Source of Truth.
 */
export async function ensureCandlesLoaded(
  symbol: string,
  timeframe: string,
  limit = 1000,
  range?: { fromMs: number; toMs: number },
  targetTimeSec?: number,
): Promise<Candle[]> {
  if (range && range.toMs > 0) {
    return candleRepository.fetchRange(symbol, timeframe, range.fromMs, range.toMs);
  }

  if (targetTimeSec && targetTimeSec > 0) {
    return candleRepository.loadHistoricalWindow(symbol, timeframe, targetTimeSec);
  }

  return candleRepository.loadLive(symbol, timeframe, limit);
}

/** Fine-grained close series (1m) used by the feed to replay real ticks. */
export function getTickPrices(symbol: string): number[] {
  const live1m = candleRepository.getSeries(symbol, "1m");
  if (live1m && live1m.length > 0) {
    return live1m.map((c) => c.close);
  }
  const live15m = candleRepository.getSeries(symbol, "15m");
  if (live15m && live15m.length > 0) {
    return live15m.map((c) => c.close);
  }
  return [];
}

/** Latest real close — seed price before the feed starts streaming. */
export function getSeedPrice(symbol: string): number {
  const prices = getTickPrices(symbol);
  if (prices.length > 0) return prices[prices.length - 1] ?? 0;
  return getKnownPrice(symbol) ?? 0;
}

// Prefetch live candles for all watchlist symbols on boot
for (const s of DEMO_SYMBOLS) {
  void candleRepository.loadLive(s.name, "15m", 1000);
}
void candleRepository.loadLive("BTCUSD", "1m", 1000);

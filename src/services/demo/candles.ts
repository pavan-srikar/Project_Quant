import type { Candle } from "../schemas.ts";
import {
  fetchBinanceKlines,
  fetchBinanceKlinesMulti,
  fetchBinanceKlinesRange,
  getKnownPrice,
  saveKnownPrice,
  symbolToBinancePair,
} from "./binance.ts";
import { updateFeedPrice } from "./feed.ts";
import { DEMO_SYMBOLS } from "./instruments.ts";

/**
 * Loads the bundled REAL OHLC history and serves it to the chart / feed.
 * Dynamically fetches missing symbols from Binance on demand.
 */

// Bundled offline fallback files (loaded lazily on demand to avoid bundle bloat)
const fallbackLoaders = import.meta.glob<{ default: Candle[] }>("./data/*.json");
const fallbackSeries = new Map<string, Candle[]>();

async function loadFallbackSeries(symbol: string, timeframe: string): Promise<Candle[]> {
  const key = `${symbol}_${timeframe}`;
  const existing = fallbackSeries.get(key);
  if (existing) return existing;

  const path = `./data/${key}.json`;
  const loader = fallbackLoaders[path];
  if (!loader) return [];

  try {
    const mod = await loader();
    const data = mod.default || [];
    fallbackSeries.set(key, data);
    return data;
  } catch {
    return [];
  }
}

// Live series fetched directly from Binance API
const series = new Map<string, Candle[]>();

const TF_SECONDS: Record<string, number> = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "30m": 1800,
  "1h": 3600,
  "4h": 14400,
  "1d": 86400,
  "1w": 604800,
};

function rawSeries(symbol: string, timeframe: string): Candle[] {
  return series.get(`${symbol}_${timeframe}`) ?? fallbackSeries.get(`${symbol}_${timeframe}`) ?? [];
}



export function areCandlesConnecting(a: Candle[], b: Candle[], timeframe: string): boolean {
  if (a.length === 0 || b.length === 0) return true;
  const intervalSec = TF_SECONDS[timeframe] ?? 3600;
  const maxGapSec = Math.max(intervalSec * 4, 4 * 86400);
  const aFirst = a[0]!.time;
  const aLast = a[a.length - 1]!.time;
  const bFirst = b[0]!.time;
  const bLast = b[b.length - 1]!.time;
  if (bLast < aFirst) return (aFirst - bLast) <= maxGapSec;
  if (aLast < bFirst) return (bFirst - aLast) <= maxGapSec;
  return true;
}

export function hasDiscontinuity(bars: Candle[], timeframe: string): boolean {
  if (bars.length < 2) return false;
  const intervalSec = TF_SECONDS[timeframe] ?? 3600;
  const maxGapSec = Math.max(intervalSec * 4, 4 * 86400);
  for (let i = 1; i < bars.length; i++) {
    if (bars[i]!.time - bars[i - 1]!.time > maxGapSec) return true;
  }
  return false;
}

function mergeCandleArrays(a: Candle[], b: Candle[]): Candle[] {
  const map = new Map<number, Candle>();
  for (const c of a) map.set(c.time, c);
  for (const c of b) map.set(c.time, c);
  return Array.from(map.values()).sort((x, y) => x.time - y.time);
}

/** Real history for a symbol/timeframe. Returns genuine Binance series or bundled offline snapshot as-is. */
export function getHistory(
  symbol: string,
  timeframe: string,
  limit?: number,
  targetTimeSec?: number,
): Candle[] {
  const key = `${symbol}_${timeframe}`;
  const isLive = series.has(key);
  const bars = isLive ? series.get(key)! : fallbackSeries.get(key) ?? [];
  if (bars.length === 0) return [];

  if (targetTimeSec && targetTimeSec > 0) return bars;
  return limit && limit < bars.length ? bars.slice(-limit) : bars;
}

const liveLoaded = new Set<string>();

/** Dynamic on-demand candle fetcher: always fetches real live data from Binance first, falls back to bundled data if offline */
export async function ensureCandlesLoaded(
  symbol: string,
  timeframe: string,
  limit = 1000,
  range?: { fromMs: number; toMs: number },
  targetTimeSec?: number,
): Promise<Candle[]> {
  const cacheKey = `${symbol}_${timeframe}`;
  const pair = symbolToBinancePair(symbol);

  // 1. If range is specified (scroll-triggered backfill from ChartPanel)
  if (range && range.toMs > 0) {
    try {
      const fetched = await fetchBinanceKlinesRange(pair, timeframe, range.fromMs, range.toMs);
      if (fetched.length > 0) {
        const existing = series.get(cacheKey) ?? [];
        if (areCandlesConnecting(existing, fetched, timeframe)) {
          const merged = mergeCandleArrays(existing, fetched);
          series.set(cacheKey, merged);
        } else {
          series.set(cacheKey, fetched);
        }
        return fetched;
      }
    } catch (err) {
      console.warn(`Range fetch failed for ${symbol} (${timeframe}):`, err);
    }
    return [];
  }

  // 2. Standard limit or target-based load
  const existing = series.get(cacheKey) ?? [];

  if (targetTimeSec && targetTimeSec > 0) {
    const coversTarget =
      existing.length > 0 &&
      existing[0]!.time <= targetTimeSec &&
      targetTimeSec <= existing[existing.length - 1]!.time &&
      !hasDiscontinuity(existing, timeframe);
    if (coversTarget) return existing;

    try {
      const intervalSec = TF_SECONDS[timeframe] ?? 3600;
      const nowSec = Math.floor(Date.now() / 1000);
      const endMs = Math.min(nowSec, targetTimeSec + 500 * intervalSec) * 1000;
      const targetCandles = await fetchBinanceKlinesMulti(pair, timeframe, 1500, endMs);
      if (targetCandles.length > 0) {
        if (areCandlesConnecting(existing, targetCandles, timeframe)) {
          const merged = mergeCandleArrays(existing, targetCandles);
          series.set(cacheKey, merged);
          return merged;
        } else {
          series.set(cacheKey, targetCandles);
          return targetCandles;
        }
      }
    } catch (err) {
      console.warn(`Target-time fetch failed for ${symbol} (${timeframe}):`, err);
    }
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const intervalSec = TF_SECONDS[timeframe] ?? 3600;
  const isExistingLive =
    existing.length > 0 &&
    nowSec - existing[existing.length - 1]!.time <= Math.max(intervalSec * 3, 86400 * 3) &&
    !hasDiscontinuity(existing, timeframe);

  // If already loaded from live source and have enough candles, return slice immediately
  if (!targetTimeSec && isExistingLive && liveLoaded.has(cacheKey) && existing.length >= limit) {
    return existing.slice(-limit);
  }

  try {
    if (!liveLoaded.has(cacheKey) || !isExistingLive || existing.length === 0) {
      const toFetch = Math.max(limit, 1000);
      const fetched = await fetchBinanceKlinesMulti(pair, timeframe, toFetch);
      if (fetched.length > 0) {
        const merged = areCandlesConnecting(existing, fetched, timeframe)
          ? mergeCandleArrays(existing, fetched)
          : fetched;
        series.set(cacheKey, merged);
        liveLoaded.add(cacheKey);
        const lastClose = fetched[fetched.length - 1]!.close;
        saveKnownPrice(symbol, lastClose);
        updateFeedPrice(symbol, lastClose);

        if (timeframe === "1m") {
          series.set(`${symbol}_1m`, merged);
          liveLoaded.add(`${symbol}_1m`);
        } else if (!liveLoaded.has(`${symbol}_1m`)) {
          fetchBinanceKlines(pair, "1m", 1000)
            .then((m1) => {
              if (m1.length > 0) {
                series.set(`${symbol}_1m`, m1);
                liveLoaded.add(`${symbol}_1m`);
              }
            })
            .catch(() => {});
        }

        return targetTimeSec || limit >= merged.length ? merged : merged.slice(-limit);
      }
    } else if (existing.length < limit) {
      const needed = limit - existing.length;
      const oldestMs = existing[0]!.time * 1000 - 1;
      const older = await fetchBinanceKlinesMulti(pair, timeframe, needed, oldestMs);
      if (older.length > 0) {
        const merged = areCandlesConnecting(existing, older, timeframe)
          ? mergeCandleArrays(older, existing)
          : existing;
        series.set(cacheKey, merged);
        liveLoaded.add(cacheKey);
        return targetTimeSec || limit >= merged.length ? merged : merged.slice(-limit);
      }
      return existing;
    }
  } catch (err) {
    console.warn(`Live Binance fetch failed for ${symbol} (${timeframe}), using bundled fallback:`, err);
  }

  let fallback = rawSeries(symbol, timeframe);
  if (fallback.length === 0) {
    fallback = await loadFallbackSeries(symbol, timeframe);
  }
  if (fallback.length > 0) {
    return getHistory(symbol, timeframe, limit, targetTimeSec);
  }

  return existing;
}

/** Fine-grained close series (1m) used by the feed to replay real ticks. */
export function getTickPrices(symbol: string): number[] {
  const live1m = series.get(`${symbol}_1m`);
  if (live1m && live1m.length > 0) {
    return live1m.map((c) => c.close);
  }
  for (const [key, b] of series.entries()) {
    if (key.startsWith(`${symbol}_`) && b.length > 0) {
      return b.map((c) => c.close);
    }
  }
  const fallback = rawSeries(symbol, "1m");
  if (fallback.length > 0) {
    return fallback.map((c) => c.close);
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
  void ensureCandlesLoaded(s.name, "15m", 1000);
}
void ensureCandlesLoaded("BTCUSD", "1m", 1000);


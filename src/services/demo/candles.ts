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

/** Start of the current period (seconds) for a timeframe. */
function currentBucketSec(timeframe: string): number {
  const interval = TF_SECONDS[timeframe] ?? 60;
  const nowSec = Math.floor(Date.now() / 1000);
  return nowSec - (nowSec % interval);
}

/** Per-(symbol,timeframe) time delta that maps the last real bar onto "now" (used only for offline fallback data). */
function shiftDelta(bars: Candle[], timeframe: string): number {
  if (bars.length === 0) return 0;
  const lastReal = bars[bars.length - 1]!.time;
  return currentBucketSec(timeframe) - lastReal;
}

function mergeCandleArrays(a: Candle[], b: Candle[]): Candle[] {
  const map = new Map<number, Candle>();
  for (const c of a) map.set(c.time, c);
  for (const c of b) map.set(c.time, c);
  return Array.from(map.values()).sort((x, y) => x.time - y.time);
}

function extendHistoryBackwards(candles: Candle[], targetCount: number, intervalSec: number): Candle[] {
  if (candles.length >= targetCount || candles.length === 0) return candles;
  const countToGenerate = targetCount - candles.length;
  const first = candles[0]!;
  let currentPrice = first.open;
  let currentTime = first.time;
  const generated: Candle[] = [];

  const sample = candles.slice(0, 50);
  const avgRange =
    sample.reduce((sum, c) => sum + Math.abs(c.high - c.low), 0) / sample.length || currentPrice * 0.005;

  for (let i = 0; i < countToGenerate; i++) {
    currentTime -= intervalSec;
    const delta = (Math.random() - 0.495) * avgRange;
    const close = Math.max(currentPrice * 0.1, currentPrice);
    const open = Math.max(currentPrice * 0.1, close - delta);
    const high = Math.max(open, close) + Math.random() * avgRange * 0.4;
    const low = Math.min(open, close) - Math.random() * avgRange * 0.4;
    const volume = Math.floor(Math.random() * 500 + 100);

    generated.unshift({
      time: currentTime,
      open,
      high,
      low,
      close,
      volume,
    });
    currentPrice = open;
  }

  return [...generated, ...candles];
}

/** Real history for a symbol/timeframe. Fallback snapshots are shifted to current time; live data is returned as-is. */
export function getHistory(symbol: string, timeframe: string, limit?: number): Candle[] {
  const key = `${symbol}_${timeframe}`;
  const isLive = series.has(key);
  const bars = isLive ? series.get(key)! : fallbackSeries.get(key) ?? [];
  if (bars.length === 0) return [];

  // Live Binance data already has genuine current timestamps — do NOT shift it!
  const shifted = isLive
    ? bars
    : (() => {
        const delta = shiftDelta(bars, timeframe);
        const shiftedBars = bars.map((c) => ({ ...c, time: c.time + delta }));
        if (limit && limit > shiftedBars.length) {
          const interval = TF_SECONDS[timeframe] ?? 60;
          return extendHistoryBackwards(shiftedBars, limit, interval);
        }
        return shiftedBars;
      })();

  return limit && limit < shifted.length ? shifted.slice(-limit) : shifted;
}

const liveLoaded = new Set<string>();

/** Dynamic on-demand candle fetcher: always fetches real live data from Binance first, falls back to bundled data if offline */
export async function ensureCandlesLoaded(
  symbol: string,
  timeframe: string,
  limit = 1000,
  range?: { fromMs: number; toMs: number },
): Promise<Candle[]> {
  const cacheKey = `${symbol}_${timeframe}`;
  const pair = symbolToBinancePair(symbol);

  // 1. If range is specified (scroll-triggered backfill from ChartPanel)
  if (range && range.toMs > 0) {
    try {
      const fetched = await fetchBinanceKlinesRange(pair, timeframe, range.fromMs, range.toMs);
      if (fetched.length > 0) {
        const existing = series.get(cacheKey) ?? [];
        const merged = mergeCandleArrays(existing, fetched);
        series.set(cacheKey, merged);
        return fetched;
      }
    } catch (err) {
      console.warn(`Range fetch failed for ${symbol} (${timeframe}):`, err);
    }
    // Fallback to offline dataset for range if Binance request failed or offline
    const fallback = getHistory(symbol, timeframe, 10000);
    const fromSec = Math.floor(range.fromMs / 1000);
    const toSec = Math.floor(range.toMs / 1000);
    const inRange = fallback.filter((c) => c.time >= fromSec && c.time <= toSec);
    if (inRange.length > 0) {
      return inRange;
    }
    return [];
  }

  // 2. Standard limit-based load
  const existing = series.get(cacheKey) ?? [];

  // If already loaded from live source and have enough candles, return slice immediately
  if (liveLoaded.has(cacheKey) && existing.length >= limit) {
    return existing.slice(-limit);
  }

  try {
    if (!liveLoaded.has(cacheKey) || existing.length === 0) {
      // First load: fetch at least 1,000 candles or full requested limit
      const toFetch = Math.max(limit, 1000);
      const fetched = await fetchBinanceKlinesMulti(pair, timeframe, toFetch);
      if (fetched.length > 0) {
        series.set(cacheKey, fetched);
        liveLoaded.add(cacheKey);
        const lastClose = fetched[fetched.length - 1]!.close;
        saveKnownPrice(symbol, lastClose);
        updateFeedPrice(symbol, lastClose);

        // Also ensure 1m tick series is available from Binance for tick simulator
        if (timeframe === "1m") {
          series.set(`${symbol}_1m`, fetched);
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

        return limit && limit < fetched.length ? fetched.slice(-limit) : fetched;
      }
    } else if (existing.length < limit) {
      // Expanding cache for deep history request
      const needed = limit - existing.length;
      const oldestMs = existing[0]!.time * 1000 - 1;
      const older = await fetchBinanceKlinesMulti(pair, timeframe, needed, oldestMs);
      if (older.length > 0) {
        const merged = mergeCandleArrays(older, existing);
        series.set(cacheKey, merged);
        liveLoaded.add(cacheKey);
        return limit && limit < merged.length ? merged.slice(-limit) : merged;
      }
      return existing;
    }
  } catch (err) {
    console.warn(`Live Binance fetch failed for ${symbol} (${timeframe}), using bundled fallback:`, err);
  }

  // Fallback to bundled offline dataset if network unavailable
  let fallback = rawSeries(symbol, timeframe);
  if (fallback.length === 0) {
    fallback = await loadFallbackSeries(symbol, timeframe);
  }
  if (fallback.length > 0) {
    return getHistory(symbol, timeframe, limit);
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


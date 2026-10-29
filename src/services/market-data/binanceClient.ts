import type { Candle } from "../schemas.ts";
import { symbolToBinancePair } from "../demo/binance/symbolMapping.ts";

export const TF_SECONDS: Record<string, number> = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "30m": 1800,
  "1h": 3600,
  "4h": 14400,
  "1d": 86400,
  "1w": 604800,
};

// Bundled offline fallback files loaded lazily on demand
const fallbackLoaders = import.meta.glob<{ default: Candle[] }>("../demo/data/*.json");
const fallbackSeries = new Map<string, Candle[]>();

async function loadFallbackSeries(symbol: string, timeframe: string): Promise<Candle[]> {
  const key = `${symbol}_${timeframe}`;
  const existing = fallbackSeries.get(key);
  if (existing) return existing;

  const path = `../demo/data/${key}.json`;
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

// In-flight request deduplication map to prevent redundant concurrent fetches
const inflightRequests = new Map<string, Promise<Candle[]>>();

/**
 * Direct typed fetcher for Binance v3 klines with deduplication and error handling.
 */
export async function fetchBinanceKlinesRaw(
  binancePair: string,
  timeframe: string,
  limit = 1000,
  options?: { startTime?: number; endTime?: number },
): Promise<Candle[]> {
  const safeLimit = Math.min(Math.max(limit, 10), 1000);
  const start = options?.startTime && options.startTime > 0 ? Math.floor(options.startTime) : 0;
  const end = options?.endTime && options.endTime > 0 ? Math.floor(options.endTime) : 0;
  const reqKey = `${binancePair}:${timeframe}:${safeLimit}:${start}:${end}`;

  const existingReq = inflightRequests.get(reqKey);
  if (existingReq) return existingReq;

  const reqPromise = (async () => {
    let url = `https://api.binance.com/api/v3/klines?symbol=${binancePair}&interval=${timeframe}&limit=${safeLimit}`;
    if (start > 0) url += `&startTime=${start}`;
    if (end > 0) url += `&endTime=${end}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Binance klines error (${binancePair} ${timeframe}): ${res.status}`);
    }
    const rows = (await res.json()) as (number | string)[][];
    return rows.map((row) => {
      const volume = Number(row[5]);
      const takerBuy = row[9] !== undefined ? Number(row[9]) : undefined;
      return {
        time: Math.floor(Number(row[0]) / 1000),
        open: Number(row[1]),
        high: Number(row[2]),
        low: Number(row[3]),
        close: Number(row[4]),
        volume,
        takerBuyVolume: takerBuy,
        delta: takerBuy !== undefined ? 2 * takerBuy - volume : undefined,
      };
    });
  })().finally(() => {
    inflightRequests.delete(reqKey);
  });

  inflightRequests.set(reqKey, reqPromise);
  return reqPromise;
}

/**
 * Fetches up to `targetCount` klines backwards in time from `beforeMs`.
 * Chunked by 1,000 bars (Binance API maximum) up to 10 batches.
 */
export async function fetchBinanceKlinesBatch(
  symbol: string,
  timeframe: string,
  targetCount: number,
  beforeMs?: number,
): Promise<Candle[]> {
  const pair = symbolToBinancePair(symbol);
  const results: Candle[] = [];
  let currentEndTime = beforeMs;
  const maxBatches = Math.min(Math.ceil(targetCount / 1000), 10);

  for (let b = 0; b < maxBatches; b++) {
    const batchLimit = Math.min(1000, targetCount - results.length);
    if (batchLimit <= 0) break;

    try {
      const batch = await fetchBinanceKlinesRaw(
        pair,
        timeframe,
        batchLimit,
        currentEndTime ? { endTime: currentEndTime } : undefined,
      );
      if (batch.length === 0) break;

      results.unshift(...batch);
      currentEndTime = batch[0]!.time * 1000 - 1;
      if (batch.length < batchLimit) break;
    } catch (err) {
      console.warn(`Binance multi-fetch batch ${b} failed for ${symbol}:`, err);
      break;
    }
  }

  // Fallback to bundled data if offline or network error on first batch
  if (results.length === 0) {
    const fallback = await loadFallbackSeries(symbol, timeframe);
    if (fallback.length > 0) {
      return beforeMs
        ? fallback.filter((c) => c.time * 1000 <= beforeMs).slice(-targetCount)
        : fallback.slice(-targetCount);
    }
  }

  // Deduplicate and ensure monotonic ascending sort
  const seen = new Set<number>();
  const deduped: Candle[] = [];
  for (const c of results) {
    if (!seen.has(c.time)) {
      seen.add(c.time);
      deduped.push(c);
    }
  }
  deduped.sort((a, b) => a.time - b.time);
  return deduped;
}

/**
 * Fetches klines within a specific time range [fromMs, toMs] with automatic multi-batch paging.
 */
export async function fetchBinanceKlinesRangePaged(
  symbol: string,
  timeframe: string,
  fromMs: number,
  toMs: number,
): Promise<Candle[]> {
  const pair = symbolToBinancePair(symbol);
  const results: Candle[] = [];
  let currentEndTime = toMs;
  const maxPages = 10;

  for (let page = 0; page < maxPages; page++) {
    try {
      const batch = await fetchBinanceKlinesRaw(pair, timeframe, 1000, {
        startTime: fromMs > 0 ? fromMs : undefined,
        endTime: currentEndTime > 0 ? currentEndTime : undefined,
      });
      if (batch.length === 0) break;

      results.unshift(...batch);
      const oldestTimeMs = batch[0]!.time * 1000;
      if (oldestTimeMs <= fromMs || batch.length < 1000) break;
      currentEndTime = oldestTimeMs - 1;
    } catch (err) {
      console.warn(`Range paged fetch failed for ${symbol} (${timeframe}):`, err);
      break;
    }
  }

  if (results.length === 0) {
    const fallback = await loadFallbackSeries(symbol, timeframe);
    if (fallback.length > 0) {
      return fallback.filter(
        (c) => c.time * 1000 >= fromMs && c.time * 1000 <= toMs,
      );
    }
  }

  const seen = new Set<number>();
  const deduped: Candle[] = [];
  for (const c of results) {
    if (!seen.has(c.time)) {
      seen.add(c.time);
      deduped.push(c);
    }
  }
  deduped.sort((a, b) => a.time - b.time);
  return deduped;
}

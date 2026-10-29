import type { Candle } from "../../schemas.ts";

export async function fetchBinanceKlines(
  binancePair: string,
  timeframe: string,
  limit = 1000,
  options?: { startTime?: number; endTime?: number },
): Promise<Candle[]> {
  const safeLimit = Math.min(Math.max(limit, 10), 1000);
  let url = `https://api.binance.com/api/v3/klines?symbol=${binancePair}&interval=${timeframe}&limit=${safeLimit}`;
  if (options?.startTime && options.startTime > 0) {
    url += `&startTime=${Math.floor(options.startTime)}`;
  }
  if (options?.endTime && options.endTime > 0) {
    url += `&endTime=${Math.floor(options.endTime)}`;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Binance klines error (${binancePair} ${timeframe}): ${res.status}`);
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
}

/**
 * Multi-batch historical fetcher: automatically fetches multiple 1,000-candle batches
 * from Binance backwards in time up to targetCount (or until reaching the dawn of market data).
 */
export async function fetchBinanceKlinesMulti(
  binancePair: string,
  timeframe: string,
  targetCount: number,
  beforeMs?: number,
): Promise<Candle[]> {
  const results: Candle[] = [];
  let currentEndTime = beforeMs;
  const maxBatches = Math.min(Math.ceil(targetCount / 1000), 10); // up to 10k bars

  for (let b = 0; b < maxBatches; b++) {
    const batchLimit = Math.min(1000, targetCount - results.length);
    if (batchLimit <= 0) break;

    try {
      const batch = await fetchBinanceKlines(
        binancePair,
        timeframe,
        batchLimit,
        currentEndTime ? { endTime: currentEndTime } : undefined,
      );
      if (batch.length === 0) break;

      // batch is sorted chronologically (oldest to newest). Prepend to our historical accumulator.
      results.unshift(...batch);
      const oldestTimeMs = batch[0]!.time * 1000;
      currentEndTime = oldestTimeMs - 1;

      if (batch.length < batchLimit) {
        // Reached the earliest historical bar available on Binance for this pair
        break;
      }
    } catch (err) {
      console.warn(`Binance multi-fetch batch ${b} failed:`, err);
      break;
    }
  }

  // Deduplicate and sort chronologically
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
 * Fetches klines within a specific time range [fromMs, toMs] (for scroll-triggered historical backfill).
 */
export async function fetchBinanceKlinesRange(
  binancePair: string,
  timeframe: string,
  fromMs: number,
  toMs: number,
): Promise<Candle[]> {
  return fetchBinanceKlines(binancePair, timeframe, 1000, {
    startTime: fromMs > 0 ? fromMs : undefined,
    endTime: toMs > 0 ? toMs : undefined,
  });
}

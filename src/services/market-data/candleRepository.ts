import type { Candle } from "../schemas.ts";
import { saveKnownPrice } from "../demo/binance/priceStorage.ts";
import {
  TF_SECONDS,
  fetchBinanceKlinesBatch,
  fetchBinanceKlinesRangePaged,
} from "./binanceClient.ts";

let priceUpdateListener: ((symbol: string, price: number) => void) | null = null;
let activeAnchor: { symbol: string; fromTime: number; toTime: number } | null = null;

export function setRepositoryAnchor(
  anchor: { symbol: string; fromTime: number; toTime: number } | null,
): void {
  activeAnchor = anchor;
}

export function registerPriceUpdateListener(
  listener: (symbol: string, price: number) => void,
): void {
  priceUpdateListener = listener;
}

/**
 * Validates that two candle chunks connect or overlap without a multi-interval gap.
 * Allows up to 4 bar intervals or 4 calendar days (for weekend forex/traditional gaps).
 */
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

/**
 * Checks for any internal multi-interval discontinuity within a candle series.
 */
export function hasDiscontinuity(bars: Candle[], timeframe: string): boolean {
  if (bars.length < 2) return false;
  const intervalSec = TF_SECONDS[timeframe] ?? 3600;
  const maxGapSec = Math.max(intervalSec * 4, 4 * 86400);
  for (let i = 1; i < bars.length; i++) {
    if (bars[i]!.time - bars[i - 1]!.time > maxGapSec) return true;
  }
  return false;
}

export function mergeCandleArrays(a: Candle[], b: Candle[]): Candle[] {
  const map = new Map<number, Candle>();
  for (const c of a) map.set(c.time, c);
  for (const c of b) map.set(c.time, c);
  return Array.from(map.values()).sort((x, y) => x.time - y.time);
}

class CandleRepository {
  private seriesMap = new Map<string, Candle[]>();
  private liveLoadedSet = new Set<string>();

  private getKey(symbol: string, timeframe: string): string {
    return `${symbol}_${timeframe}`;
  }

  public getSeries(symbol: string, timeframe: string): Candle[] {
    return this.seriesMap.get(this.getKey(symbol, timeframe)) ?? [];
  }

  public setSeries(symbol: string, timeframe: string, candles: Candle[]): void {
    this.seriesMap.set(this.getKey(symbol, timeframe), candles);
  }

  /**
   * Loads the live edge candles up to the current moment.
   */
  public async loadLive(
    symbol: string,
    timeframe: string,
    limit = 1000,
  ): Promise<Candle[]> {
    const key = this.getKey(symbol, timeframe);
    const existing = this.seriesMap.get(key) ?? [];
    const nowSec = Math.floor(Date.now() / 1000);
    const intervalSec = TF_SECONDS[timeframe] ?? 3600;
    const isLive =
      existing.length > 0 &&
      nowSec - existing[existing.length - 1]!.time <= Math.max(intervalSec * 3, 86400 * 3) &&
      !hasDiscontinuity(existing, timeframe);

    if (isLive && this.liveLoadedSet.has(key) && existing.length >= limit) {
      return existing.slice(-limit);
    }

    const toFetch = Math.max(limit, 1000);
    const fetched = await fetchBinanceKlinesBatch(symbol, timeframe, toFetch);
    if (fetched.length > 0) {
      const merged =
        isLive && areCandlesConnecting(existing, fetched, timeframe)
          ? mergeCandleArrays(existing, fetched)
          : fetched;

      this.seriesMap.set(key, merged);
      this.liveLoadedSet.add(key);

      const lastClose = fetched[fetched.length - 1]!.close;
      saveKnownPrice(symbol, lastClose);
      priceUpdateListener?.(symbol, lastClose);

      return limit >= merged.length ? merged : merged.slice(-limit);
    }

    return existing;
  }

  /**
   * Loads a clean continuous historical window centered on targetTimeSec.
   * Guarantees no disconnected Frankencharts are created.
   */
  public async loadHistoricalWindow(
    symbol: string,
    timeframe: string,
    targetTimeSec: number,
    windowBars = 2000,
  ): Promise<Candle[]> {
    const key = this.getKey(symbol, timeframe);
    const existing = this.seriesMap.get(key) ?? [];
    const intervalSec = TF_SECONDS[timeframe] ?? 3600;
    const nowSec = Math.floor(Date.now() / 1000);

    const isAnchor = Boolean(activeAnchor && activeAnchor.symbol === symbol);
    const anchor = isAnchor ? activeAnchor : null;

    // Check if existing cleanly covers target and anchor with adequate buffer
    const coversTarget =
      existing.length >= 100 &&
      !hasDiscontinuity(existing, timeframe) &&
      (isAnchor && anchor
        ? existing[0]!.time <= anchor.fromTime - 20 * intervalSec &&
          anchor.toTime + 20 * intervalSec <= existing[existing.length - 1]!.time
        : existing[0]!.time <= targetTimeSec - 100 * intervalSec &&
          targetTimeSec + 100 * intervalSec <= existing[existing.length - 1]!.time);

    if (coversTarget) return existing;

    const bufferSec = Math.max(intervalSec * 200, 86400 * 5);
    const targetEndSec = isAnchor && anchor
      ? Math.max(anchor.toTime + bufferSec, targetTimeSec + Math.floor(windowBars / 2) * intervalSec)
      : targetTimeSec + Math.floor(windowBars / 2) * intervalSec;
    const endMs = Math.min(nowSec, targetEndSec) * 1000;

    const spanBars = isAnchor && anchor
      ? Math.ceil((targetEndSec - (anchor.fromTime - bufferSec)) / intervalSec)
      : windowBars;
    const barsToFetch = Math.max(windowBars, Math.min(spanBars, 3000));

    const targetCandles = await fetchBinanceKlinesBatch(symbol, timeframe, barsToFetch, endMs);

    if (targetCandles.length > 0) {
      if (areCandlesConnecting(existing, targetCandles, timeframe)) {
        const merged = mergeCandleArrays(existing, targetCandles);
        this.seriesMap.set(key, merged);
        return merged;
      }
      // Disconnected islands! Replace series with targetCandles so no Frankenstein gap exists
      this.seriesMap.set(key, targetCandles);
      return targetCandles;
    }

    return existing;
  }

  /**
   * Backfills older candles contiguous to the current oldest bar.
   */
  public async fetchOlder(
    symbol: string,
    timeframe: string,
    count = 500,
  ): Promise<Candle[]> {
    const key = this.getKey(symbol, timeframe);
    const existing = this.seriesMap.get(key) ?? [];
    if (existing.length === 0) {
      return this.loadLive(symbol, timeframe, count);
    }

    const oldestMs = existing[0]!.time * 1000 - 1;
    const older = await fetchBinanceKlinesBatch(symbol, timeframe, count, oldestMs);
    if (older.length > 0) {
      if (areCandlesConnecting(existing, older, timeframe)) {
        const merged = mergeCandleArrays(older, existing);
        this.seriesMap.set(key, merged);
        return older;
      }
    }
    return [];
  }

  /**
   * Forwards newer candles contiguous to the current newest bar up towards live edge.
   */
  public async fetchNewer(
    symbol: string,
    timeframe: string,
    count = 500,
  ): Promise<Candle[]> {
    const key = this.getKey(symbol, timeframe);
    const existing = this.seriesMap.get(key) ?? [];
    if (existing.length === 0) {
      return this.loadLive(symbol, timeframe, count);
    }

    const newestSec = existing[existing.length - 1]!.time;
    const nowSec = Math.floor(Date.now() / 1000);
    const intervalSec = TF_SECONDS[timeframe] ?? 3600;
    if (nowSec - newestSec <= intervalSec * 2) {
      return []; // Already at live edge
    }

    const startMs = (newestSec + 1) * 1000;
    const toMs = Math.min(nowSec, (newestSec + count * intervalSec)) * 1000;
    const newer = await fetchBinanceKlinesRangePaged(symbol, timeframe, startMs, toMs);
    if (newer.length > 0) {
      if (areCandlesConnecting(existing, newer, timeframe)) {
        const merged = mergeCandleArrays(existing, newer);
        this.seriesMap.set(key, merged);
        return newer;
      }
    }
    return [];
  }

  /**
   * Range fetch for explicit time windows.
   */
  public async fetchRange(
    symbol: string,
    timeframe: string,
    fromMs: number,
    toMs: number,
  ): Promise<Candle[]> {
    const key = this.getKey(symbol, timeframe);
    const fetched = await fetchBinanceKlinesRangePaged(symbol, timeframe, fromMs, toMs);
    if (fetched.length > 0) {
      const existing = this.seriesMap.get(key) ?? [];
      if (areCandlesConnecting(existing, fetched, timeframe)) {
        const merged = mergeCandleArrays(existing, fetched);
        this.seriesMap.set(key, merged);
      } else {
        this.seriesMap.set(key, fetched);
      }
      return fetched;
    }
    return [];
  }

  public clear(symbol?: string, timeframe?: string): void {
    if (symbol && timeframe) {
      const key = this.getKey(symbol, timeframe);
      this.seriesMap.delete(key);
      this.liveLoadedSet.delete(key);
    } else {
      this.seriesMap.clear();
      this.liveLoadedSet.clear();
    }
  }
}

export const candleRepository = new CandleRepository();

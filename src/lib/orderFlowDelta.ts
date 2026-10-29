import type { Candle } from "../services/schemas.ts";

export interface BarDeltaResult {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  buyVol: number;
  sellVol: number;
  delta: number;
  deltaPercent: number;
  cvd: number;
}

/**
 * Calculates buy volume, sell volume, net delta, and delta % for a single bar.
 * If takerBuyVolume is provided (e.g. from Binance row index 9), exact taker delta is used.
 * If takerBuyVolume is missing, estimates volume delta from price movement.
 */
export function calculateBarDelta(candle: Candle): {
  buyVol: number;
  sellVol: number;
  delta: number;
  deltaPercent: number;
} {
  const vol = candle.volume ?? 0;
  if (vol <= 0) {
    return { buyVol: 0, sellVol: 0, delta: 0, deltaPercent: 0 };
  }

  let buyVol: number;
  if (candle.takerBuyVolume !== undefined && Number.isFinite(candle.takerBuyVolume)) {
    buyVol = Math.max(0, Math.min(vol, candle.takerBuyVolume));
  } else if (candle.delta !== undefined && Number.isFinite(candle.delta)) {
    // If delta is directly known: buyVol = (vol + delta) / 2
    buyVol = Math.max(0, Math.min(vol, (vol + candle.delta) / 2));
  } else {
    // Fallback: estimate from bar polarity
    const range = candle.high - candle.low;
    if (range > 0) {
      const pos = (candle.close - candle.low) / range;
      buyVol = vol * pos;
    } else {
      buyVol = vol * 0.5;
    }
  }

  const sellVol = Math.max(0, vol - buyVol);
  const delta = buyVol - sellVol;
  const deltaPercent = vol > 0 ? (delta / vol) * 100 : 0;

  return { buyVol, sellVol, delta, deltaPercent };
}

/**
 * Computes Bar Delta and Cumulative Volume Delta (CVD) series for an array of candles.
 */
export function calculateCvdSeries(candles: Candle[]): BarDeltaResult[] {
  let runningCvd = 0;
  const results: BarDeltaResult[] = [];

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i]!;
    const { buyVol, sellVol, delta, deltaPercent } = calculateBarDelta(c);
    runningCvd += delta;

    results.push({
      time: c.time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
      buyVol,
      sellVol,
      delta,
      deltaPercent,
      cvd: runningCvd,
    });
  }

  return results;
}

/**
 * Format delta into a clean string representation with +/- sign.
 */
export function formatDelta(val: number): string {
  if (!Number.isFinite(val)) return "0";
  const abs = Math.abs(val);
  const sign = val > 0 ? "+" : val < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(2)}K`;
  return `${sign}${abs.toFixed(2)}`;
}

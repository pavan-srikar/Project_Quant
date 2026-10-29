import type { Candle } from "../../../services/schemas.ts";
import { calculateBarDelta } from "../../orderFlowDelta.ts";
import type {
  HeatmapGridData,
  LeverageTier,
  LiquidationBand,
  SensitivityPreset,
} from "./heatmap-types.ts";

const LEVERAGE_TIERS: Array<{
  leverage: LeverageTier;
  offset: number;
  weight: number;
}> = [
  { leverage: 100, offset: 0.008, weight: 0.35 },
  { leverage: 50, offset: 0.018, weight: 0.3 },
  { leverage: 25, offset: 0.038, weight: 0.2 },
  { leverage: 10, offset: 0.095, weight: 0.15 },
];

export function calculateLiqPrice(
  entryPrice: number,
  side: "long" | "short",
  leverage: LeverageTier,
): number {
  const tier = LEVERAGE_TIERS.find((t) => t.leverage === leverage) ?? LEVERAGE_TIERS[0]!;
  if (side === "long") {
    return Number((entryPrice * (1 - tier.offset)).toFixed(4));
  }
  return Number((entryPrice * (1 + tier.offset)).toFixed(4));
}

function computeBucketStep(minPrice: number, maxPrice: number): number {
  const range = maxPrice - minPrice;
  if (range <= 0) return 1;
  const rawStep = range / 110;
  const power = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const fraction = rawStep / power;
  let niceMult = 1;
  if (fraction > 5) niceMult = 5;
  else if (fraction > 2) niceMult = 2.5;
  else if (fraction > 1) niceMult = 2;
  return Number((niceMult * power).toFixed(6));
}

export function generateLiquidationBands(
  candles: Candle[],
  sensitivity: SensitivityPreset = "medium",
  maxBands = 180,
): LiquidationBand[] {
  if (!candles || candles.length === 0) return [];

  let minP = Number.POSITIVE_INFINITY;
  let maxP = Number.NEGATIVE_INFINITY;
  for (const c of candles) {
    if (c.low < minP) minP = c.low;
    if (c.high > maxP) maxP = c.high;
  }
  if (!Number.isFinite(minP) || !Number.isFinite(maxP) || minP >= maxP) {
    return [];
  }

  const step = computeBucketStep(minP, maxP);

  // Active pools accumulating volume per price bucket
  const activeLongs = new Map<number, LiquidationBand>();
  const activeShorts = new Map<number, LiquidationBand>();
  const completedBands: LiquidationBand[] = [];

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i]!;
    const timeSec = Number(c.time);
    const vol = c.volume ?? 0;

    // 1. Check for sweeps: price reaching bucket level terminates the accumulated pool
    for (const [bucketPrice, band] of activeLongs) {
      if (c.low <= bucketPrice) {
        band.isSwept = true;
        band.endTime = timeSec;
        completedBands.push(band);
        activeLongs.delete(bucketPrice);
      }
    }
    for (const [bucketPrice, band] of activeShorts) {
      if (c.high >= bucketPrice) {
        band.isSwept = true;
        band.endTime = timeSec;
        completedBands.push(band);
        activeShorts.delete(bucketPrice);
      }
    }

    if (vol <= 0) continue;

    const { buyVol, sellVol } = calculateBarDelta(c);
    const entryPrice = (c.open + c.close + c.high + c.low) / 4;

    // 2. Accumulate incoming liquidation volume into quantized price buckets
    for (const tier of LEVERAGE_TIERS) {
      if (buyVol > 0) {
        const rawLiq = calculateLiqPrice(entryPrice, "long", tier.leverage);
        const bucket = Number((Math.round(rawLiq / step) * step).toFixed(4));
        const deltaVol = buyVol * tier.weight;

        const existing = activeLongs.get(bucket);
        if (existing) {
          existing.volume += deltaVol;
        } else {
          activeLongs.set(bucket, {
            id: `long_${bucket}_${timeSec}`,
            side: "long",
            leverage: tier.leverage,
            entryPrice,
            liqPrice: bucket,
            volume: deltaVol,
            startTime: timeSec,
            endTime: null,
            isSwept: false,
          });
        }
      }

      if (sellVol > 0) {
        const rawLiq = calculateLiqPrice(entryPrice, "short", tier.leverage);
        const bucket = Number((Math.round(rawLiq / step) * step).toFixed(4));
        const deltaVol = sellVol * tier.weight;

        const existing = activeShorts.get(bucket);
        if (existing) {
          existing.volume += deltaVol;
        } else {
          activeShorts.set(bucket, {
            id: `short_${bucket}_${timeSec}`,
            side: "short",
            leverage: tier.leverage,
            entryPrice,
            liqPrice: bucket,
            volume: deltaVol,
            startTime: timeSec,
            endTime: null,
            isSwept: false,
          });
        }
      }
    }
  }

  // Combine remaining active bands + completed bands
  const allBands = [...completedBands, ...activeLongs.values(), ...activeShorts.values()];
  if (allBands.length === 0) return [];

  let maxVol = 0;
  for (const b of allBands) {
    if (b.volume > maxVol) maxVol = b.volume;
  }

  // CoinGlass Sensitivity Threshold filtering:
  // High = 6% threshold (shows many emerging pools)
  // Medium = 18% threshold (balanced view)
  // Low = 38% threshold (major whale pools only)
  const thresholdRatio =
    sensitivity === "high" ? 0.06 : sensitivity === "low" ? 0.38 : 0.18;
  const minVolThreshold = maxVol * thresholdRatio;

  const filtered = allBands.filter((b) => b.volume >= minVolThreshold);
  filtered.sort((a, b) => b.volume - a.volume);
  return filtered.slice(0, maxBands);
}

/**
 * Generates continuous 2D Liquidation Heatmap matrix matching CoinGlass model.
 * Each column i is a candle in time; each row r is a quantized price bucket.
 */
export function generateHeatmapGrid(
  candles: Candle[],
  sensitivity: SensitivityPreset = "medium",
  rowCount = 160,
  customThresholdRatio?: number,
  customCeilingRatio?: number,
): HeatmapGridData {
  if (!candles || candles.length === 0) {
    return {
      times: [],
      minPrice: 0,
      maxPrice: 0,
      bucketStep: 1,
      rowCount: 0,
      colCount: 0,
      grid: new Float32Array(0),
      maxVol: 0,
      threshold: 0,
      ceiling: 0,
    };
  }

  let rawMin = Number.POSITIVE_INFINITY;
  let rawMax = Number.NEGATIVE_INFINITY;
  for (const c of candles) {
    if (c.low < rawMin) rawMin = c.low;
    if (c.high > rawMax) rawMax = c.high;
  }
  if (!Number.isFinite(rawMin) || !Number.isFinite(rawMax) || rawMin >= rawMax) {
    rawMin = 100;
    rawMax = 110;
  }

  const minPrice = rawMin * 0.88;
  const maxPrice = rawMax * 1.12;
  const priceSpan = maxPrice - minPrice;
  const M = Math.max(30, Math.min(200, rowCount));
  const N = candles.length;
  const bucketStep = priceSpan / M;

  const times = new Array<number>(N);
  const grid = new Float32Array(N * M);
  const activeLongs = new Float32Array(M);
  const activeShorts = new Float32Array(M);

  let maxVol = 0;

  for (let i = 0; i < N; i++) {
    const c = candles[i]!;
    times[i] = Number(c.time);
    const vol = c.volume ?? 0;

    // 1. Sweeps: price touching level wipes out accumulated liquidations
    for (let r = 0; r < M; r++) {
      const rowPrice = maxPrice - r * bucketStep;
      if (c.low <= rowPrice && (activeLongs[r] ?? 0) > 0) activeLongs[r] = 0;
      if (c.high >= rowPrice && (activeShorts[r] ?? 0) > 0) activeShorts[r] = 0;
      activeLongs[r] = (activeLongs[r] ?? 0) * 0.9992;
      activeShorts[r] = (activeShorts[r] ?? 0) * 0.9992;
    }

    // 2. Accumulate incoming order flow into discrete leverage tier price rows
    if (vol > 0) {
      const { buyVol, sellVol } = calculateBarDelta(c);
      const entryPrice = (c.open + c.close + c.high + c.low) / 4;

      for (const tier of LEVERAGE_TIERS) {
        if (buyVol > 0) {
          const rawLiq = calculateLiqPrice(entryPrice, "long", tier.leverage);
          const r = Math.round(((maxPrice - rawLiq) / priceSpan) * (M - 1));
          if (r >= 0 && r < M) {
            activeLongs[r] = (activeLongs[r] ?? 0) + buyVol * tier.weight;
          }
        }
        if (sellVol > 0) {
          const rawLiq = calculateLiqPrice(entryPrice, "short", tier.leverage);
          const r = Math.round(((maxPrice - rawLiq) / priceSpan) * (M - 1));
          if (r >= 0 && r < M) {
            activeShorts[r] = (activeShorts[r] ?? 0) + sellVol * tier.weight;
          }
        }
      }
    }

    // 3. Snapshot column i and carve out active candle trading corridor
    const colOffset = i * M;
    for (let r = 0; r < M; r++) {
      const rowPrice = maxPrice - r * bucketStep;
      if (rowPrice >= c.low && rowPrice <= c.high) {
        grid[colOffset + r] = 0;
      } else {
        const total = (activeLongs[r] ?? 0) + (activeShorts[r] ?? 0);
        grid[colOffset + r] = total;
        if (total > maxVol) maxVol = total;
      }
    }
  }

  let threshold = sensitivity === "high" ? maxVol * 0.03 : sensitivity === "low" ? maxVol * 0.25 : maxVol * 0.10;
  let ceiling = sensitivity === "high" ? maxVol * 0.45 : sensitivity === "low" ? maxVol * 0.90 : maxVol * 0.65;
  if (customThresholdRatio !== undefined && customThresholdRatio >= 0) {
    threshold = maxVol * customThresholdRatio;
    ceiling = maxVol * Math.min(1, Math.max(customThresholdRatio + 0.15, 0.95));
  }
  if (customCeilingRatio !== undefined && customCeilingRatio > 0) {
    ceiling = maxVol * customCeilingRatio;
  }
  if (ceiling <= threshold) ceiling = threshold + maxVol * 0.01;
  return { times, minPrice, maxPrice, bucketStep, rowCount: M, colCount: N, grid, maxVol, threshold, ceiling };
}

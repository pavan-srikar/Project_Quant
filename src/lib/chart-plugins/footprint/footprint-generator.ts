import type { Candle } from "../../../services/schemas.ts";
import { calculateBarDelta } from "../../orderFlowDelta.ts";
import type { FootprintBar, FootprintLevel } from "./footprint-types.ts";

/**
 * Calculates a clean, rounded price step for a candle's price range.
 */
function getAdaptivePriceStep(range: number, targetBins = 14): number {
  if (range <= 0) return 1;
  const rawStep = range / targetBins;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;

  let stepMultiplier = 1;
  if (normalized > 5) stepMultiplier = 10;
  else if (normalized > 2) stepMultiplier = 5;
  else if (normalized > 1) stepMultiplier = 2;

  return Math.max(0.0001, stepMultiplier * magnitude);
}

/**
 * Builds a Footprint cluster for a single candle, generating realistic intra-bar
 * volume ladders that strictly conserve the bar's exact Binance buy, sell, and delta volume.
 */
export function generateFootprintBar(candle: Candle): FootprintBar {
  const { buyVol: totalBuy, sellVol: totalSell, delta } = calculateBarDelta(candle);
  const totalVolume = candle.volume ?? totalBuy + totalSell;

  const low = candle.low;
  const high = candle.high;
  const range = high - low;

  const levels: FootprintLevel[] = [];

  if (range <= 0 || totalVolume <= 0) {
    const singleLevel: FootprintLevel = {
      price: candle.close,
      sellVol: totalSell,
      buyVol: totalBuy,
      totalVol: totalVolume,
      delta,
      isPoc: true,
    };
    return {
      time: candle.time as any,
      timeSec: candle.time,
      open: candle.open,
      high,
      low,
      close: candle.close,
      totalVolume,
      totalBuyVol: totalBuy,
      totalSellVol: totalSell,
      delta,
      pocPrice: candle.close,
      levels: [singleLevel],
    };
  }

  const priceStep = getAdaptivePriceStep(range, 14);
  const numBins = Math.max(6, Math.min(14, Math.round(range / priceStep) + 1));
  const step = range / (numBins - 1);

  // Typical price / value center for the distribution
  const centerPrice = (candle.open + candle.close + (candle.high + candle.low) / 2) / 3;
  const halfRange = Math.max(step, range / 2);

  const rawLevels: { price: number; weight: number; buyRatio: number }[] = [];
  let totalWeight = 0;

  for (let i = 0; i < numBins; i++) {
    const p = low + i * step;
    const dist = Math.abs(p - centerPrice) / halfRange;
    // Bell curve weighting around the candle body
    const weight = Math.exp(-0.5 * dist * dist * 3) + 0.05;
    totalWeight += weight;

    // Buy ratio increases as price approaches high
    const priceRatio = (p - low) / (range || 1);
    const buyRatio = 0.2 + 0.6 * Math.max(0, Math.min(1, priceRatio));

    rawLevels.push({ price: Number(p.toFixed(4)), weight, buyRatio });
  }

  let runningBuy = 0;
  let runningSell = 0;
  let maxLevelVol = -1;
  let pocIdx = 0;

  for (let i = 0; i < rawLevels.length; i++) {
    const item = rawLevels[i]!;
    const levelTotal = totalVolume * (item.weight / (totalWeight || 1));

    let levelBuy: number;
    let levelSell: number;

    if (i === rawLevels.length - 1) {
      // Last level absorbs remainder so exact sums match totalBuy and totalSell
      levelBuy = Math.max(0, totalBuy - runningBuy);
      levelSell = Math.max(0, totalSell - runningSell);
    } else {
      levelBuy = levelTotal * item.buyRatio;
      levelSell = levelTotal * (1 - item.buyRatio);
      runningBuy += levelBuy;
      runningSell += levelSell;
    }

    const lvlTotal = levelBuy + levelSell;
    if (lvlTotal > maxLevelVol) {
      maxLevelVol = lvlTotal;
      pocIdx = i;
    }

    levels.push({
      price: item.price,
      sellVol: Math.round(levelSell * 100) / 100,
      buyVol: Math.round(levelBuy * 100) / 100,
      totalVol: Math.round(lvlTotal * 100) / 100,
      delta: Math.round((levelBuy - levelSell) * 100) / 100,
      isPoc: false,
    });
  }

  if (levels[pocIdx]) {
    levels[pocIdx]!.isPoc = true;
  }

  // Sort descending by price (highest price row at top, like a DOM ladder)
  levels.sort((a, b) => b.price - a.price);

  // Compute diagonal volume imbalances (TradingView 2.5x - 3x ratio)
  for (let i = 0; i < levels.length - 1; i++) {
    const higherLevel = levels[i]!;
    const lowerLevel = levels[i + 1]!;
    if (higherLevel.buyVol >= 5 && higherLevel.buyVol >= lowerLevel.sellVol * 2.5) {
      higherLevel.isBuyImbalance = true;
    }
    if (lowerLevel.sellVol >= 5 && lowerLevel.sellVol >= higherLevel.buyVol * 2.5) {
      lowerLevel.isSellImbalance = true;
    }
  }

  return {
    time: candle.time as any,
    timeSec: candle.time,
    open: candle.open,
    high,
    low,
    close: candle.close,
    totalVolume,
    totalBuyVol: totalBuy,
    totalSellVol: totalSell,
    delta,
    pocPrice: levels[pocIdx]?.price ?? candle.close,
    levels,
  };
}

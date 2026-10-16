import type { DrawingLine } from "../../../pages/trading/constants";
import type { ResolvedVolumeProfile, VolumeProfileBucket } from "./types";
import { timeToX, type ResolveCtx } from "./coords";

export function resolveVolumeProfile(
  d: DrawingLine,
  ctx: ResolveCtx,
): ResolvedVolumeProfile | undefined {
  if (d.time == null) return undefined;
  const t1 = d.time;
  const t2 = d.time2 ?? d.time;
  const tStart = Math.min(t1, t2);
  const tEnd = Math.max(t1, t2);

  // Source bars: prefer ctx.candles (with full volume), fallback to ctx.data
  const rawBars: readonly any[] = ctx.candles && ctx.candles.length > 0 ? ctx.candles : ctx.data;
  if (!rawBars || rawBars.length === 0) return undefined;

  // Filter bars in range [tStart, tEnd]
  const inRange: Array<{ open: number; high: number; low: number; close: number; volume: number }> = [];
  for (const bar of rawBars) {
    const bTime = typeof bar.time === "number" ? bar.time : Number(bar.time);
    if (Number.isNaN(bTime)) continue;
    if (bTime < tStart) continue;
    if (bTime > tEnd) {
      if (inRange.length > 0) break;
      continue;
    }
    const open = typeof bar.open === "number" ? bar.open : (bar.close ?? 0);
    const high = typeof bar.high === "number" ? bar.high : open;
    const low = typeof bar.low === "number" ? bar.low : open;
    const close = typeof bar.close === "number" ? bar.close : open;
    const volume = typeof bar.volume === "number" && bar.volume > 0 ? bar.volume : 1;
    inRange.push({ open, high, low, close, volume });
  }

  // If no bars matched (e.g. range between bars or future), grab nearest bar if possible
  if (inRange.length === 0) {
    let closestBar: any = null;
    let minDist = Infinity;
    for (const bar of rawBars) {
      const bTime = typeof bar.time === "number" ? bar.time : Number(bar.time);
      const dist = Math.abs(bTime - tStart);
      if (dist < minDist) {
        minDist = dist;
        closestBar = bar;
      }
    }
    if (closestBar) {
      const open = typeof closestBar.open === "number" ? closestBar.open : (closestBar.close ?? 0);
      const high = typeof closestBar.high === "number" ? closestBar.high : open;
      const low = typeof closestBar.low === "number" ? closestBar.low : open;
      const close = typeof closestBar.close === "number" ? closestBar.close : open;
      const volume = typeof closestBar.volume === "number" && closestBar.volume > 0 ? closestBar.volume : 1;
      inRange.push({ open, high, low, close, volume });
    } else {
      return undefined;
    }
  }

  let minPrice = Infinity;
  let maxPrice = -Infinity;
  for (const c of inRange) {
    if (c.low < minPrice) minPrice = c.low;
    if (c.high > maxPrice) maxPrice = c.high;
  }

  if (minPrice === Infinity || maxPrice === -Infinity || maxPrice <= minPrice) {
    const flat = minPrice === Infinity ? d.price : minPrice;
    minPrice = flat * 0.999;
    maxPrice = flat * 1.001;
  }

  const numRows = d.numRows && d.numRows >= 5 && d.numRows <= 2000 ? d.numRows : 500;
  const step = (maxPrice - minPrice) / numRows;

  // Initialize buckets
  const buckets: VolumeProfileBucket[] = [];
  for (let i = 0; i < numRows; i++) {
    const pLow = minPrice + i * step;
    const pHigh = minPrice + (i + 1) * step;
    const pCenter = (pLow + pHigh) / 2;
    buckets.push({
      priceLow: pLow,
      priceHigh: pHigh,
      priceCenter: pCenter,
      yTop: ctx.series.priceToCoordinate(pHigh),
      yBottom: ctx.series.priceToCoordinate(pLow),
      upVol: 0,
      downVol: 0,
      totalVol: 0,
      isPoc: false,
      isValueArea: false,
    });
  }

  // Distribute candle volume across overlapping price buckets
  let grandTotalVol = 0;
  for (const c of inRange) {
    const isUp = c.close >= c.open;
    const cLow = c.low;
    const cHigh = Math.max(c.high, c.low + 1e-8);
    const candleSpan = cHigh - cLow;
    const cVol = c.volume;

    const startIdx = Math.max(0, Math.min(numRows - 1, Math.floor((cLow - minPrice) / step)));
    const endIdx = Math.max(0, Math.min(numRows - 1, Math.floor((cHigh - minPrice) / step)));

    for (let b = startIdx; b <= endIdx; b++) {
      const bucket = buckets[b]!;
      const overlapLow = Math.max(cLow, bucket.priceLow);
      const overlapHigh = Math.min(cHigh, bucket.priceHigh);
      const overlap = Math.max(0, overlapHigh - overlapLow);
      if (overlap <= 0) continue;

      const frac = overlap / candleSpan;
      const volShare = cVol * frac;

      if (isUp) {
        bucket.upVol += volShare;
      } else {
        bucket.downVol += volShare;
      }
      bucket.totalVol += volShare;
      grandTotalVol += volShare;
    }
  }

  // Find POC (Point of Control)
  let maxBucketVol = 0;
  let pocIdx = 0;
  for (let i = 0; i < buckets.length; i++) {
    if (buckets[i]!.totalVol > maxBucketVol) {
      maxBucketVol = buckets[i]!.totalVol;
      pocIdx = i;
    }
  }
  buckets[pocIdx]!.isPoc = true;
  const pocPrice = buckets[pocIdx]!.priceCenter;
  const pocY = ctx.series.priceToCoordinate(pocPrice);

  // Compute Value Area (default 70% of total volume)
  const vaPct = d.vaPct && d.vaPct > 0 && d.vaPct <= 100 ? d.vaPct : 70;
  const targetVaVol = grandTotalVol * (vaPct / 100);

  let curVaVol = buckets[pocIdx]!.totalVol;
  buckets[pocIdx]!.isValueArea = true;

  let upPointer = pocIdx + 1;
  let downPointer = pocIdx - 1;

  while (curVaVol < targetVaVol && (upPointer < numRows || downPointer >= 0)) {
    const nextUpVol = upPointer < numRows ? buckets[upPointer]!.totalVol : -1;
    const nextDownVol = downPointer >= 0 ? buckets[downPointer]!.totalVol : -1;

    if (nextUpVol >= nextDownVol && upPointer < numRows) {
      buckets[upPointer]!.isValueArea = true;
      curVaVol += buckets[upPointer]!.totalVol;
      upPointer++;
    } else if (downPointer >= 0) {
      buckets[downPointer]!.isValueArea = true;
      curVaVol += buckets[downPointer]!.totalVol;
      downPointer--;
    } else if (upPointer < numRows) {
      buckets[upPointer]!.isValueArea = true;
      curVaVol += buckets[upPointer]!.totalVol;
      upPointer++;
    } else {
      break;
    }
  }

  // VAH / VAL prices
  const vaBuckets = buckets.filter((b) => b.isValueArea);
  const vahPrice = vaBuckets.length > 0 ? Math.max(...vaBuckets.map((b) => b.priceHigh)) : maxPrice;
  const valPrice = vaBuckets.length > 0 ? Math.min(...vaBuckets.map((b) => b.priceLow)) : minPrice;
  const vahY = ctx.series.priceToCoordinate(vahPrice);
  const valY = ctx.series.priceToCoordinate(valPrice);

  const x1 = timeToX(ctx, t1);
  const x2 = timeToX(ctx, t2);
  const xStart = x1 !== null && x2 !== null ? Math.min(x1, x2) : (x1 ?? x2);
  const xEnd = x1 !== null && x2 !== null ? Math.max(x1, x2) : (x2 ?? x1);

  return {
    buckets,
    maxVol: Math.max(maxBucketVol, 1),
    pocPrice,
    pocY,
    vahPrice,
    vahY,
    valPrice,
    valY,
    totalVol: grandTotalVol,
    xStart,
    xEnd,
    upColor: d.upColor ?? "#5b84c4",
    downColor: d.downColor ?? "#7e60a8",
    pocColor: d.pocColor ?? "#ea3943",
  };
}

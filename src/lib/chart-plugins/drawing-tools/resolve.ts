import type { IChartApi, ISeriesApi, Logical, SeriesOptionsMap, Time } from "lightweight-charts";
import type { DrawingLine } from "../../../pages/trading/constants";
import type {
  EntryState,
  ResolvedEntry,
  ResolvedFibLevel,
  ResolvedVolumeProfile,
  VolumeProfileBucket,
} from "./types";

export const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1] as const;
export const FIB_EXT_LEVELS = [0, 0.618, 1, 1.618, 2.618] as const;
export const FIB_COLORS = [
  "#e91e63",
  "#ff5722",
  "#ff9800",
  "#ffc107",
  "#4caf50",
  "#2196F3",
  "#9c27b0",
];

export type AnySeries = ISeriesApi<keyof SeriesOptionsMap>;

export interface ResolveCandle {
  time: number | Time;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

/**
 * Shared per-pass conversion context. Drawings store unix-second anchors that
 * may not fall on this timeframe's bar grid (drawn on another TF) or may sit
 * beyond the loaded data (future anchors) — both need interpolation /
 * extrapolation, which needs the series data and the TF interval.
 */
export interface ResolveCtx {
  chart: IChartApi;
  series: AnySeries;
  intervalSec: number;
  data: readonly { time: Time }[];
  candles?: readonly ResolveCandle[];
}

export function makeResolveCtx(
  chart: IChartApi,
  series: AnySeries,
  intervalSec: number,
  getCandles?: () => readonly ResolveCandle[],
): ResolveCtx {
  const candles = getCandles ? getCandles() : undefined;
  return { chart, series, intervalSec, data: series.data(), candles };
}

// ── Time ↔ pixel conversion with interpolation/extrapolation ────────────────

/** First index whose bar time is >= time (data is time-sorted ascending). */
function lowerBound(data: readonly { time: Time }[], time: number): number {
  let lo = 0;
  let hi = data.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((data[mid]!.time as number) < time) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * Time → x coordinate. Falls back to logical-index interpolation for times
 * between bars (cross-timeframe anchors) and extrapolation past either end of
 * the data (future anchors / unloaded history).
 */
export function timeToX(ctx: ResolveCtx, time: number): number | null {
  const ts = ctx.chart.timeScale();
  const direct = ts.timeToCoordinate(time as Time);
  if (direct !== null) return direct;
  const logical = timeToLogical(ctx, time);
  if (logical === null) return null;
  return logicalToX(ts, logical);
}

/**
 * lightweight-charts' `logicalToCoordinate` returns 0 for any *non-integer*
 * index (its internal `indexToCoordinate` bails on `!isInteger`). Cross-
 * timeframe and future anchors land between bars at fractional logicals, so we
 * can't pass those through directly — that snapped every off-grid anchor to the
 * chart's left edge. Integer logicals are always valid (and extrapolate
 * linearly even past the data), so resolve the two surrounding integer bar
 * positions and interpolate in pixel space between them.
 */
function logicalToX(ts: ReturnType<IChartApi["timeScale"]>, logical: number): number | null {
  const lo = Math.floor(logical);
  const xLo = ts.logicalToCoordinate(lo as Logical);
  if (xLo === null) return null;
  const frac = logical - lo;
  if (frac === 0) return xLo;
  const xHi = ts.logicalToCoordinate((lo + 1) as Logical);
  if (xHi === null) return null;
  return xLo + frac * (xHi - xLo);
}

function timeToLogical(ctx: ResolveCtx, time: number): number | null {
  const { data, intervalSec } = ctx;
  if (data.length === 0 || intervalSec <= 0) return null;
  const firstTime = data[0]!.time as number;
  const lastTime = data[data.length - 1]!.time as number;
  if (time <= firstTime) return (time - firstTime) / intervalSec;
  if (time >= lastTime) return data.length - 1 + (time - lastTime) / intervalSec;
  const idx = lowerBound(data, time);
  const t1 = data[idx - 1]!.time as number;
  const t2 = data[idx]!.time as number;
  return idx - 1 + (time - t1) / Math.max(t2 - t1, 1);
}

/**
 * X coordinate → time. Falls back to bar-interval extrapolation in the
 * whitespace beyond the loaded data so anchors can be placed in the future.
 */
export function xToTime(ctx: ResolveCtx, x: number): number | null {
  const direct = ctx.chart.timeScale().coordinateToTime(x);
  if (direct !== null) return direct as number;
  const { data, intervalSec } = ctx;
  if (data.length === 0 || intervalSec <= 0) return null;
  const logical = ctx.chart.timeScale().coordinateToLogical(x);
  if (logical === null) return null;
  const lastIdx = data.length - 1;
  const lastTime = data[lastIdx]!.time as number;
  const firstTime = data[0]!.time as number;
  // Snap to whole bar offsets so future anchors stay on the bar grid.
  if (logical > lastIdx) return lastTime + Math.round(logical - lastIdx) * intervalSec;
  if (logical < 0) return firstTime + Math.round(logical) * intervalSec;
  return null;
}

// ── Drawing resolution ───────────────────────────────────────────────────────

/** Convert a drawing's data-space anchors into pane pixel coordinates. */
export function resolveEntry(d: DrawingLine, ctx: ResolveCtx, state: EntryState): ResolvedEntry {
  const entry: ResolvedEntry = {
    d,
    x1: d.time != null ? timeToX(ctx, d.time) : null,
    y1: Number.isFinite(d.price) ? ctx.series.priceToCoordinate(d.price) : null,
    x2: d.time2 != null ? timeToX(ctx, d.time2) : null,
    y2: d.price2 != null ? ctx.series.priceToCoordinate(d.price2) : null,
    state,
  };
  if (d.type === "fibonacci" || d.type === "fibextension") {
    entry.fibLevels = resolveFibLevels(d, ctx.series);
  }
  if (d.type === "trendline") {
    entry.seg = trendlineSegment(entry, ctx.chart.timeScale().width());
    if (state === "selected" || state === "preview") entry.stats = trendlineStats(d, ctx);
  }
  if (d.type === "position") {
    entry.yStop = d.stopPrice != null ? ctx.series.priceToCoordinate(d.stopPrice) : null;
    entry.yTarget = d.targetPrice != null ? ctx.series.priceToCoordinate(d.targetPrice) : null;

    if (ctx.data.length > 0 && d.time != null) {
      const tStart = Math.min(d.time, d.time2 ?? d.time);
      const tEnd = Math.max(d.time, d.time2 ?? d.time);
      const isLong = d.side !== "short";

      let hasTriggered = false;
      let entryHitTime: number | null = null;
      let trackingPrice: number | null = null;
      let trackingTime: number | null = null;
      let trackingStatus: "ACTIVE" | "CLOSED" = "ACTIVE";

      for (let i = 0; i < ctx.data.length; i++) {
        const bar = ctx.data[i] as { time: Time; open?: number; high?: number; low?: number; close?: number };
        const bTime = bar.time as number;
        if (bTime < tStart) continue;
        if (bTime > tEnd) break;

        const high = typeof bar.high === "number" ? bar.high : bar.close ?? d.price;
        const low = typeof bar.low === "number" ? bar.low : bar.close ?? d.price;
        const close = typeof bar.close === "number" ? bar.close : d.price;
        const open = typeof bar.open === "number" ? bar.open : close;

        // 1. If trade has not triggered yet, check if this bar touched or crossed the entry price
        if (!hasTriggered) {
          const prevClose = i > 0 ? (ctx.data[i - 1] as { close?: number })?.close ?? null : null;
          const touchesEntry =
            (low <= d.price && high >= d.price) ||
            (prevClose !== null && (
              (prevClose <= d.price && (high >= d.price || open >= d.price)) ||
              (prevClose >= d.price && (low <= d.price || open <= d.price))
            ));

          if (touchesEntry) {
            hasTriggered = true;
            entryHitTime = bTime;
          } else {
            // Price hasn't reached entry level yet; trade is not active
            continue;
          }
        }

        // 2. Once triggered, evaluate Take Profit / Stop Loss / Candle Close
        if (isLong) {
          const hitStop = d.stopPrice != null && low <= d.stopPrice;
          const hitTarget = d.targetPrice != null && high >= d.targetPrice;
          if (hitStop && hitTarget) {
            // In the rare event both are touched on the same candle, infer order from open
            if (open >= d.price) {
              trackingPrice = d.stopPrice ?? null;
              trackingTime = bTime;
              trackingStatus = "CLOSED";
              break;
            } else {
              trackingPrice = d.targetPrice ?? null;
              trackingTime = bTime;
              trackingStatus = "CLOSED";
              break;
            }
          } else if (hitStop) {
            trackingPrice = d.stopPrice ?? null;
            trackingTime = bTime;
            trackingStatus = "CLOSED";
            break;
          } else if (hitTarget) {
            trackingPrice = d.targetPrice ?? null;
            trackingTime = bTime;
            trackingStatus = "CLOSED";
            break;
          }
        } else {
          // Short position
          const hitStop = d.stopPrice != null && high >= d.stopPrice;
          const hitTarget = d.targetPrice != null && low <= d.targetPrice;
          if (hitStop && hitTarget) {
            if (open <= d.price) {
              trackingPrice = d.stopPrice ?? null;
              trackingTime = bTime;
              trackingStatus = "CLOSED";
              break;
            } else {
              trackingPrice = d.targetPrice ?? null;
              trackingTime = bTime;
              trackingStatus = "CLOSED";
              break;
            }
          } else if (hitStop) {
            trackingPrice = d.stopPrice ?? null;
            trackingTime = bTime;
            trackingStatus = "CLOSED";
            break;
          } else if (hitTarget) {
            trackingPrice = d.targetPrice ?? null;
            trackingTime = bTime;
            trackingStatus = "CLOSED";
            break;
          }
        }

        trackingPrice = close;
        trackingTime = bTime;
      }

      if (hasTriggered && trackingPrice !== null && trackingTime !== null && entryHitTime !== null) {
        const lastSeriesTime = ctx.data[ctx.data.length - 1]!.time as number;
        if (lastSeriesTime > tEnd || trackingTime >= tEnd) {
          trackingStatus = "CLOSED";
        }

        entry.hasTriggered = true;
        entry.entryHitTime = entryHitTime;
        entry.xHitEntry = timeToX(ctx, entryHitTime);
        entry.yHitEntry = ctx.series.priceToCoordinate(d.price);
        entry.currentPrice = trackingPrice;
        entry.yCurrent = ctx.series.priceToCoordinate(trackingPrice);
        entry.xCurrent = timeToX(ctx, trackingTime);
        entry.trackingStatus = trackingStatus;
      } else {
        entry.hasTriggered = false;
        entry.entryHitTime = null;
        entry.xHitEntry = null;
        entry.yHitEntry = null;
        entry.currentPrice = null;
        entry.yCurrent = null;
        entry.xCurrent = null;
      }
    }
  }
  if (d.type === "channel") {
    entry.x3 = d.time3 != null ? timeToX(ctx, d.time3) : null;
    entry.y3 = d.price3 != null ? ctx.series.priceToCoordinate(d.price3) : null;
  }
  if (d.type === "fixed-range-volume-profile") {
    entry.volumeProfile = resolveVolumeProfile(d, ctx);
  }
  return entry;
}

// Δprice / % / bar-count readout shown while drawing or selected (TV-style).
function trendlineStats(d: DrawingLine, ctx: ResolveCtx): string[] {
  if (d.price2 == null || d.time == null || d.time2 == null) return [];
  const dp = d.price2 - d.price;
  const pct = d.price !== 0 ? (dp / d.price) * 100 : 0;
  const bars = ctx.intervalSec > 0 ? Math.round(Math.abs(d.time2 - d.time) / ctx.intervalSec) : 0;
  const formatted = ctx.series.priceFormatter().format(Math.abs(dp));
  return [`${dp >= 0 ? "+" : "−"}${formatted} (${pct.toFixed(2)}%)`, `${bars} bars`];
}

type Segment = NonNullable<ResolvedEntry["seg"]>;

// The drawn/hit segment for a trendline: the anchors (ordered left→right),
// optionally stretched to the pane edges when extendLeft/extendRight are set.
function trendlineSegment(e: ResolvedEntry, paneWidth: number): Segment | undefined {
  if (e.x1 === null || e.y1 === null || e.x2 === null || e.y2 === null) return undefined;
  const seg: Segment =
    e.x1 <= e.x2
      ? { x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2 }
      : { x1: e.x2, y1: e.y2, x2: e.x1, y2: e.y1 };
  return extendSegment(seg, e.d, paneWidth);
}

function extendSegment(seg: Segment, d: DrawingLine, paneWidth: number): Segment {
  if ((!d.extendLeft && !d.extendRight) || seg.x2 - seg.x1 < 0.5) return seg;
  const slope = (seg.y2 - seg.y1) / (seg.x2 - seg.x1);
  const out = { ...seg };
  if (d.extendLeft) {
    out.y1 -= slope * out.x1;
    out.x1 = 0;
  }
  if (d.extendRight && paneWidth > out.x2) {
    out.y2 += slope * (paneWidth - out.x2);
    out.x2 = paneWidth;
  }
  return out;
}

// Retracement convention: level 0 sits at the second anchor (p2), level 1 at
// the first (p1), matching TradingView's fib retracement direction.
function fibLevelsFor(d: DrawingLine): readonly number[] {
  if (d.fibLevels && d.fibLevels.length > 0) return d.fibLevels;
  return d.type === "fibextension" ? FIB_EXT_LEVELS : FIB_LEVELS;
}

function resolveFibLevels(d: DrawingLine, series: AnySeries): ResolvedFibLevel[] {
  if (d.price2 == null) return [];
  const formatter = series.priceFormatter();
  return fibLevelsFor(d).map((level, i) => {
    const price = d.price2! + (d.price - d.price2!) * level;
    return {
      level,
      price,
      y: series.priceToCoordinate(price),
      color: FIB_COLORS[i] ?? "#2196F3",
      label: `${level} (${formatter.format(price)})`,
    };
  });
}

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


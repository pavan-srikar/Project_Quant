import type { IChartApi, ISeriesApi, Logical, SeriesOptionsMap, Time } from "lightweight-charts";

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
export function lowerBound(data: readonly { time: Time }[], time: number): number {
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
export function logicalToX(ts: ReturnType<IChartApi["timeScale"]>, logical: number): number | null {
  const lo = Math.floor(logical);
  const xLo = ts.logicalToCoordinate(lo as Logical);
  if (xLo === null) return null;
  const frac = logical - lo;
  if (frac === 0) return xLo;
  const xHi = ts.logicalToCoordinate((lo + 1) as Logical);
  if (xHi === null) return null;
  return xLo + frac * (xHi - xLo);
}

export function timeToLogical(ctx: ResolveCtx, time: number): number | null {
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

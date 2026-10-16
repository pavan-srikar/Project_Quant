import type { ISeriesApi, SeriesType } from "lightweight-charts";
import type { MagnetMode } from "../../../pages/trading/constants";
import { dist, type Pt } from "./geometry";
import type { DataPoint, ResolvedEntry } from "./types";

// Magnet mode: snap an anchor's price to the nearest O/H/L/C of the bar under
// the cursor when within this many pixels (TradingView's "weak magnet").
export const MAGNET_THRESHOLD_PX = 14;

// Object snapping: snap a placed/dragged anchor onto another drawing's anchor
// when the cursor is within this many pixels of it.
export const SNAP_ANCHOR_PX = 8;

export interface OhlcBar {
  open: number;
  high: number;
  low: number;
  close: number;
}

export function asOhlc(bar: object): OhlcBar | null {
  const b = bar as Partial<OhlcBar>;
  const valid =
    typeof b.open === "number" &&
    typeof b.high === "number" &&
    typeof b.low === "number" &&
    typeof b.close === "number";
  return valid ? (b as OhlcBar) : null;
}

/** Binary search the series data for the bar at the given unix time. */
export function candleAt(series: ISeriesApi<SeriesType>, time: number): OhlcBar | null {
  const data = series.data();
  let lo = 0;
  let hi = data.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const t = data[mid]!.time as number;
    if (t === time) return asOhlc(data[mid]!);
    if (t < time) lo = mid + 1;
    else hi = mid - 1;
  }
  return null;
}

export function magnetSnap(
  series: ISeriesApi<SeriesType>,
  pt: DataPoint,
  cursorY: number,
  magnetMode: MagnetMode,
): DataPoint {
  const candle = candleAt(series, pt.time);
  if (!candle) return pt;
  let bestPrice = pt.price;
  // Strong magnet always snaps to the nearest OHLC; weak only when close.
  let bestDist = magnetMode === "strong" ? Number.POSITIVE_INFINITY : MAGNET_THRESHOLD_PX;
  for (const price of [candle.open, candle.high, candle.low, candle.close]) {
    const y = series.priceToCoordinate(price);
    if (y === null) continue;
    const d = Math.abs(y - cursorY);
    if (d < bestDist) {
      bestDist = d;
      bestPrice = price;
    }
  }
  return { time: pt.time, price: bestPrice };
}

export function anchorPoints(e: ResolvedEntry): Array<{ x: number; y: number } & DataPoint> {
  const d = e.d;
  const out: Array<{ x: number; y: number } & DataPoint> = [];
  if (e.x1 != null && e.y1 != null && d.time != null) {
    out.push({ x: e.x1, y: e.y1, time: d.time, price: d.price });
  }
  if (e.x2 != null && e.y2 != null && d.time2 != null && d.price2 != null) {
    out.push({ x: e.x2, y: e.y2, time: d.time2, price: d.price2 });
  }
  if (e.x3 != null && e.y3 != null && d.time3 != null && d.price3 != null) {
    out.push({ x: e.x3, y: e.y3, time: d.time3, price: d.price3 });
  }
  return out;
}

// Snap an anchor to a nearby *other* drawing's anchor (object snapping). The
// currently-selected drawings are skipped so dragging never snaps to itself.
export function snapToNearbyAnchor(
  entries: ResolvedEntry[],
  selectedIds: string[],
  pos: Pt,
): DataPoint | null {
  for (const e of entries) {
    if (selectedIds.includes(e.d.id)) continue;
    for (const c of anchorPoints(e)) {
      if (dist(pos, { x: c.x, y: c.y }) <= SNAP_ANCHOR_PX)
        return { time: c.time, price: c.price };
    }
  }
  return null;
}

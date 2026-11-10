import type { DrawingLine } from "../../../pages/trading/constants";
import type { ResolvedEntry } from "./types";
import type { ResolveCtx } from "./coords";

export type Segment = NonNullable<ResolvedEntry["seg"]>;

export function formatDuration(sec: number): string {
  const totalMinutes = Math.round(Math.abs(sec) / 60);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const mins = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${mins}m`;
  }
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

// Δprice / % / bar-count / time duration readout shown while drawing or selected (TV-style).
export function trendlineStats(d: DrawingLine, ctx: ResolveCtx): string[] {
  if (d.price2 == null || d.time == null || d.time2 == null) return [];
  const dp = d.price2 - d.price;
  const pct = d.price !== 0 ? (dp / d.price) * 100 : 0;
  const dtSec = Math.abs(d.time2 - d.time);
  const bars = ctx.intervalSec > 0 ? Math.round(dtSec / ctx.intervalSec) : 0;
  const formatted = ctx.series.priceFormatter().format(Math.abs(dp));
  const duration = formatDuration(dtSec);
  return [
    `${dp >= 0 ? "+" : "−"}${formatted} (${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%)`,
    `${bars} bars`,
    duration,
  ];
}

// The drawn/hit segment for a trendline: the anchors (ordered left→right),
// optionally stretched to the pane edges when extendLeft/extendRight are set.
export function trendlineSegment(e: ResolvedEntry, paneWidth: number): Segment | undefined {
  if (e.x1 === null || e.y1 === null || e.x2 === null || e.y2 === null) return undefined;
  const seg: Segment =
    e.x1 <= e.x2
      ? { x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2 }
      : { x1: e.x2, y1: e.y2, x2: e.x1, y2: e.y1 };
  return extendSegment(seg, e.d, paneWidth);
}

export function extendSegment(seg: Segment, d: DrawingLine, paneWidth: number): Segment {
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

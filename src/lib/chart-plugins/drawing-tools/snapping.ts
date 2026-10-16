import type { ISeriesApi, SeriesType } from "lightweight-charts";
import type { DrawingTool, MagnetMode } from "../../../pages/trading/constants";
import { type Pt, snapAngle } from "./geometry";
import { magnetSnap, snapToNearbyAnchor } from "./magnet";
import { type ResolveCtx, timeToX } from "./resolve";
import type { DataPoint, ResolvedEntry } from "./types";
import type { DragState } from "./drag-controller";

/**
 * Resolve a cursor position to a data point, applying Shift angle-snap
 * (trendlines, when an opposite anchor exists) or magnet OHLC snapping.
 */
export function resolveDataPoint(
  series: ISeriesApi<SeriesType>,
  toPoint: (p: Pt) => DataPoint | null,
  resolvedEntries: ResolvedEntry[],
  selectedIds: string[],
  magnetMode: MagnetMode,
  pos: Pt,
  shiftKey: boolean,
  angleAnchor: Pt | null,
): DataPoint | null {
  const snapped = snapToNearbyAnchor(resolvedEntries, selectedIds, pos);
  if (snapped) return snapped;
  if (shiftKey && angleAnchor) return toPoint(snapAngle(angleAnchor, pos));
  const pt = toPoint(pos);
  if (!pt || magnetMode === "none") return pt;
  return magnetSnap(series, pt, pos.y, magnetMode);
}

/** Pixel position of the first anchor while placing a trendline. */
export function getPlacementAnchorPx(
  ctx: ResolveCtx,
  series: ISeriesApi<SeriesType>,
  tool: DrawingTool,
  placingP1: DataPoint | null,
): Pt | null {
  if (!placingP1 || tool !== "trendline") return null;
  const x = timeToX(ctx, placingP1.time);
  const y = series.priceToCoordinate(placingP1.price);
  return x !== null && y !== null ? { x, y } : null;
}

/** Pixel position of the anchor opposite the one being dragged. */
export function getDragAnchorPx(drag: DragState): Pt | null {
  if (drag.origin.type !== "trendline" || drag.hit.region.kind !== "point") return null;
  const en = drag.originEntry;
  const movingP1 = drag.hit.region.timeKey === "time";
  const x = movingP1 ? en.x2 : en.x1;
  const y = movingP1 ? en.y2 : en.y1;
  return x !== null && y !== null ? { x, y } : null;
}

import type { ISeriesApi, SeriesType } from "lightweight-charts";
import type { DrawingLine } from "../../../pages/trading/constants";
import type { Pt } from "./geometry";
import type { DataPoint, Hit, ResolvedEntry } from "./types";

export interface GroupMember {
  origin: DrawingLine;
  entry: ResolvedEntry;
}

export interface DragState {
  hit: Hit;
  startX: number;
  startY: number;
  origin: DrawingLine;
  originEntry: ResolvedEntry;
  /** Other selected drawings that move together on body drags. */
  group: GroupMember[];
  moved: boolean;
  isTouch: boolean;
}

export function shiftPoint(
  toPoint: (p: Pt) => DataPoint | null,
  x: number | null,
  y: number | null,
  dx: number,
  dy: number,
): DataPoint | null {
  if (x === null || y === null) return null;
  return toPoint({ x: x + dx, y: y + dy });
}

// Body-drag a position: shift the box in time and every price row together.
export function shiftPosition(
  toPoint: (p: Pt) => DataPoint | null,
  origin: DrawingLine,
  entry: ResolvedEntry,
  dx: number,
  dy: number,
): DrawingLine | null {
  const p = shiftPoint(toPoint, entry.x1, entry.y1, dx, dy);
  if (!p) return null;
  const dPrice = p.price - origin.price;
  const dTime = p.time - (origin.time ?? p.time);
  return {
    ...origin,
    time: (origin.time ?? 0) + dTime,
    time2: (origin.time2 ?? 0) + dTime,
    price: p.price,
    stopPrice: origin.stopPrice != null ? origin.stopPrice + dPrice : undefined,
    targetPrice: origin.targetPrice != null ? origin.targetPrice + dPrice : undefined,
  };
}

// Body-drag a parallel channel: move all three anchors together.
export function shiftChannel(
  toPoint: (p: Pt) => DataPoint | null,
  origin: DrawingLine,
  entry: ResolvedEntry,
  dx: number,
  dy: number,
): DrawingLine | null {
  const p1 = shiftPoint(toPoint, entry.x1, entry.y1, dx, dy);
  const p2 = shiftPoint(toPoint, entry.x2, entry.y2, dx, dy);
  const p3 = shiftPoint(toPoint, entry.x1, entry.y3 ?? entry.y1, dx, dy);
  if (!p1 || !p2 || !p3) return null;
  return {
    ...origin,
    time: p1.time,
    price: p1.price,
    time2: p2.time,
    price2: p2.price,
    time3: p3.time,
    price3: p3.price,
  };
}

/** Move a whole drawing by a pixel delta (body / group drag). */
export function shiftDrawing(
  series: ISeriesApi<SeriesType>,
  toPoint: (p: Pt) => DataPoint | null,
  origin: DrawingLine,
  entry: ResolvedEntry,
  dx: number,
  dy: number,
): DrawingLine | null {
  if (origin.type === "horizontal") {
    if (entry.y1 === null) return null;
    const price = series.coordinateToPrice(entry.y1 + dy);
    return price === null ? null : { ...origin, price };
  }
  if (origin.type === "vertical") {
    const p = shiftPoint(toPoint, entry.x1, entry.y1, dx, 0);
    return p ? { ...origin, time: p.time } : null;
  }
  if (origin.type === "position") return shiftPosition(toPoint, origin, entry, dx, dy);
  if (origin.type === "channel") return shiftChannel(toPoint, origin, entry, dx, dy);
  const p1 = shiftPoint(toPoint, entry.x1, entry.y1, dx, dy);
  const p2 = shiftPoint(toPoint, entry.x2, entry.y2, dx, dy);
  if (!p1 || !p2) return null;
  return { ...origin, time: p1.time, price: p1.price, time2: p2.time, price2: p2.price };
}

/** Other selected, unlocked drawings that ride along on a body drag. */
export function groupForSelection(
  selectedIds: readonly string[],
  drawings: readonly DrawingLine[],
  entries: readonly ResolvedEntry[],
  primaryId: string,
): GroupMember[] {
  if (selectedIds.length < 2 || !selectedIds.includes(primaryId)) return [];
  const out: GroupMember[] = [];
  for (const id of selectedIds) {
    if (id === primaryId) continue;
    const origin = drawings.find((d) => d.id === id);
    const entry = entries.find((en) => en.d.id === id);
    if (origin && entry && !origin.locked) out.push({ origin: { ...origin }, entry });
  }
  return out;
}

export function dragPoint(
  drag: DragState,
  pt: DataPoint | null,
): DrawingLine | null {
  if (drag.hit.region.kind !== "point" || !pt) return null;
  const updated: DrawingLine = { ...drag.origin };
  const { timeKey, priceKey } = drag.hit.region;
  if (timeKey) updated[timeKey] = pt.time;
  if (priceKey) updated[priceKey] = pt.price;
  return updated;
}

export function computeDragUpdates(
  drag: DragState,
  pos: Pt,
  series: ISeriesApi<SeriesType>,
  toPoint: (p: Pt) => DataPoint | null,
  dragPointFn: () => DrawingLine | null,
): DrawingLine[] {
  if (drag.hit.region.kind !== "body") {
    const u = dragPointFn();
    return u ? [u] : [];
  }
  const dx = pos.x - drag.startX;
  const dy = pos.y - drag.startY;
  const updates: DrawingLine[] = [];
  const primary = shiftDrawing(series, toPoint, drag.origin, drag.originEntry, dx, dy);
  if (!primary) return [];
  updates.push(primary);
  for (const g of drag.group) {
    const u = shiftDrawing(series, toPoint, g.origin, g.entry, dx, dy);
    if (u) updates.push(u);
  }
  return updates;
}


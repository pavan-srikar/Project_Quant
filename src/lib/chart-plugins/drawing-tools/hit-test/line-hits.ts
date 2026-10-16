import { distToSegment, type Pt } from "../geometry";
import type { Hit, ResolvedEntry } from "../types";
import { type Tol, anchorHit, bodyHit } from "./common";

export function hitVertical(e: ResolvedEntry, p: Pt, tol: Tol): Hit | null {
  if (e.x1 === null || Math.abs(p.x - e.x1) > tol.line) return null;
  return { id: e.d.id, region: { kind: "point", timeKey: "time", priceKey: null } };
}

// A horizontal line only has a price — dragging it anywhere moves the price.
export function hitHorizontal(e: ResolvedEntry, p: Pt, tol: Tol): Hit | null {
  if (e.y1 === null || Math.abs(p.y - e.y1) > tol.line) return null;
  return { id: e.d.id, region: { kind: "point", timeKey: null, priceKey: "price" } };
}

export function hitTrendline(e: ResolvedEntry, p: Pt, tol: Tol): Hit | null {
  const anchor = anchorHit(e, p, tol);
  if (anchor) return anchor;
  const seg =
    e.seg ??
    (e.x1 !== null && e.y1 !== null && e.x2 !== null && e.y2 !== null
      ? { x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2 }
      : null);
  if (!seg) return null;
  const near = distToSegment(p, { x: seg.x1, y: seg.y1 }, { x: seg.x2, y: seg.y2 }) <= tol.line;
  return near ? bodyHit(e) : null;
}

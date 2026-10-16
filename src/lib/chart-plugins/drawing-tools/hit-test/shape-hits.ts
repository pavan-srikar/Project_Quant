import { dist, distToSegment, pointInBox, type Pt } from "../geometry";
import type { Hit, ResolvedEntry } from "../types";
import { type Tol, anchorHit, bodyHit } from "./common";

// Each corner maps to the time/price keys it controls, so dragging a derived
// corner (e.g. x1,y2) resizes via time + price2 like TradingView.
export function rectCornerHit(e: ResolvedEntry, p: Pt, tol: Tol): Hit | null {
  const corners = [
    { x: e.x1!, y: e.y1!, timeKey: "time", priceKey: "price" },
    { x: e.x2!, y: e.y2!, timeKey: "time2", priceKey: "price2" },
    { x: e.x1!, y: e.y2!, timeKey: "time", priceKey: "price2" },
    { x: e.x2!, y: e.y1!, timeKey: "time2", priceKey: "price" },
  ] as const;
  for (const c of corners) {
    if (dist(p, c) <= tol.handle) {
      return { id: e.d.id, region: { kind: "point", timeKey: c.timeKey, priceKey: c.priceKey } };
    }
  }
  return null;
}

export function hitRectangle(e: ResolvedEntry, p: Pt, tol: Tol): Hit | null {
  if (e.x1 === null || e.y1 === null || e.x2 === null || e.y2 === null) return null;
  const corner = rectCornerHit(e, p, tol);
  if (corner) return corner;
  return pointInBox(p, e.x1, e.y1, e.x2, e.y2, tol.line) ? bodyHit(e) : null;
}

export function hitChannel(e: ResolvedEntry, p: Pt, tol: Tol): Hit | null {
  const anchor = anchorHit(e, p, tol);
  if (anchor) return anchor;
  if (e.x1 !== null && e.y3 != null && dist(p, { x: e.x1, y: e.y3 }) <= tol.handle) {
    return { id: e.d.id, region: { kind: "point", timeKey: "time3", priceKey: "price3" } };
  }
  if (e.x1 === null || e.y1 === null || e.x2 === null || e.y2 === null || e.y3 == null) return null;
  const dy = e.y3 - e.y1;
  const onMain = distToSegment(p, { x: e.x1, y: e.y1 }, { x: e.x2, y: e.y2 }) <= tol.line;
  const onOff = distToSegment(p, { x: e.x1, y: e.y3 }, { x: e.x2, y: e.y2 + dy }) <= tol.line;
  return onMain || onOff ? bodyHit(e) : null;
}

// Ellipse / triangle: corner anchors resize, body = inside the bounding box.
export function hitBoxShape(e: ResolvedEntry, p: Pt, tol: Tol): Hit | null {
  if (e.x1 === null || e.y1 === null || e.x2 === null || e.y2 === null) return null;
  const corner = rectCornerHit(e, p, tol);
  if (corner) return corner;
  return pointInBox(p, e.x1, e.y1, e.x2, e.y2, tol.line) ? bodyHit(e) : null;
}

export function hitText(e: ResolvedEntry, p: Pt, tol: Tol): Hit | null {
  if (e.x1 === null || e.y1 === null) return null;
  const size = e.d.fontSize ?? 14;
  const lines = (e.d.text ?? "Text").split("\n");
  const longest = lines.reduce((m, l) => Math.max(m, l.length), 4);
  const w = longest * size * 0.6;
  const h = lines.length * size * 1.3;
  const inside =
    p.x >= e.x1 - tol.line &&
    p.x <= e.x1 + w + tol.line &&
    p.y >= e.y1 - tol.line &&
    p.y <= e.y1 + h + tol.line;
  return inside
    ? { id: e.d.id, region: { kind: "point", timeKey: "time", priceKey: "price" } }
    : null;
}

import { dist, type Pt } from "../geometry";
import type { Hit, PriceKey, ResolvedEntry, TimeKey } from "../types";

export const HANDLE_TOLERANCE = 8;
export const LINE_TOLERANCE = 6;

/** Pixel tolerances, scaled up for touch input (fat-finger friendly). */
export interface Tol {
  handle: number;
  line: number;
}

export function pointHit(e: ResolvedEntry, timeKey: TimeKey | null, priceKey: PriceKey | null): Hit {
  return { id: e.d.id, region: { kind: "point", timeKey, priceKey } };
}

export function bodyHit(e: ResolvedEntry): Hit {
  return { id: e.d.id, region: { kind: "body" } };
}

/** Anchor-handle check shared by all two-point drawings. */
export function anchorHit(e: ResolvedEntry, p: Pt, tol: Tol): Hit | null {
  if (e.x1 !== null && e.y1 !== null && dist(p, { x: e.x1, y: e.y1 }) <= tol.handle) {
    return { id: e.d.id, region: { kind: "point", timeKey: "time", priceKey: "price" } };
  }
  if (e.x2 !== null && e.y2 !== null && dist(p, { x: e.x2, y: e.y2 }) <= tol.handle) {
    return { id: e.d.id, region: { kind: "point", timeKey: "time2", priceKey: "price2" } };
  }
  return null;
}

import { dist, type Pt } from "../geometry";
import type { Hit, ResolvedEntry } from "../types";
import { type Tol, anchorHit, bodyHit, pointHit } from "./common";

export function hitFibonacci(e: ResolvedEntry, p: Pt, tol: Tol): Hit | null {
  const anchor = anchorHit(e, p, tol);
  if (anchor) return anchor;
  if (e.x1 === null || e.x2 === null || !e.fibLevels) return null;
  if (p.x < Math.min(e.x1, e.x2) - tol.line) return null;
  if (p.x > Math.max(e.x1, e.x2) + tol.line) return null;
  const onLevel = e.fibLevels.some((lvl) => lvl.y !== null && Math.abs(p.y - lvl.y) <= tol.line);
  return onLevel ? bodyHit(e) : null;
}

// Position handles: left entry (X & Y) / left target (Y) / left stop (Y) / right width (X)
export function hitPosition(e: ResolvedEntry, p: Pt, tol: Tol): Hit | null {
  const { x1, x2, y1, yStop, yTarget } = e;
  if (x1 === null || x2 === null || y1 === null) return null;
  const xa = Math.min(x1, x2);
  const xb = Math.max(x1, x2);
  const leftTimeKey = (x1 <= x2) ? "time" : "time2";
  const rightTimeKey = (x1 <= x2) ? "time2" : "time";

  // 1. First adjustment middle handle (on entry line, left anchor)
  // Draggable in both X (date axis) and Y (entry price / risk-to-reward)
  if (dist(p, { x: xa, y: y1 }) <= tol.handle) {
    return pointHit(e, leftTimeKey, "price");
  }

  // 2. Target handle (left anchor, target price level)
  if (yTarget != null && dist(p, { x: xa, y: yTarget }) <= tol.handle) {
    return pointHit(e, null, "targetPrice");
  }

  // 3. Stop handle (left anchor, stop price level)
  if (yStop != null && dist(p, { x: xa, y: yStop }) <= tol.handle) {
    return pointHit(e, null, "stopPrice");
  }

  // 4. Right width handle (on entry line, right anchor)
  // Draggable in X (date axis) to adjust position duration
  if (dist(p, { x: xb, y: y1 }) <= tol.handle) {
    return pointHit(e, rightTimeKey, null);
  }

  // Edge line hit-tests
  if (yTarget != null && Math.abs(p.y - yTarget) <= tol.line && p.x >= xa && p.x <= xb) {
    return pointHit(e, null, "targetPrice");
  }
  if (yStop != null && Math.abs(p.y - yStop) <= tol.line && p.x >= xa && p.x <= xb) {
    return pointHit(e, null, "stopPrice");
  }

  const ys = [y1, yStop ?? y1, yTarget ?? y1];
  const top = Math.min(...ys);
  const bot = Math.max(...ys);

  // Position is ONLY hit/selected inside the actual box (not on external tags like target or stop)
  const inside =
    p.x >= xa - tol.line &&
    p.x <= xb + tol.line &&
    p.y >= top - tol.line &&
    p.y <= bot + tol.line;
  return inside ? bodyHit(e) : null;
}

export function hitVolumeProfile(e: ResolvedEntry, p: Pt, tol: Tol): Hit | null {
  const anchor = anchorHit(e, p, tol);
  if (anchor) return anchor;
  if (e.x1 === null || e.x2 === null) return null;
  const xa = Math.min(e.x1, e.x2);
  const xb = Math.max(e.x1, e.x2);

  const vp = e.volumeProfile;
  let yTop = e.y1 != null && e.y2 != null ? Math.min(e.y1, e.y2) : null;
  let yBot = e.y1 != null && e.y2 != null ? Math.max(e.y1, e.y2) : null;
  if (vp && vp.buckets.length > 0) {
    const bTops = vp.buckets.map((b) => b.yTop).filter((y): y is number => y !== null);
    const bBots = vp.buckets.map((b) => b.yBottom).filter((y): y is number => y !== null);
    if (bTops.length && bBots.length) {
      yTop = Math.min(...bTops);
      yBot = Math.max(...bBots);
    }
  }
  if (yTop === null || yBot === null) return null;

  const xStart = vp?.xStart != null ? vp.xStart : xa;
  const xEnd = vp?.xEnd != null ? vp.xEnd : xb;
  const xMin = Math.min(xStart, xEnd);
  const xMax = Math.max(xStart, xEnd);
  const rangeWidth = Math.max(xMax - xMin, 40);
  const maxBarWidth = Math.max(20, rangeWidth * 0.82);

  // 1. Left boundary line
  if (
    Math.abs(p.x - xMin) <= tol.line &&
    p.y >= yTop - tol.line &&
    p.y <= yBot + tol.line
  ) {
    return bodyHit(e);
  }

  // 2. Right boundary line
  if (
    Math.abs(p.x - xMax) <= tol.line &&
    p.y >= yTop - tol.line &&
    p.y <= yBot + tol.line
  ) {
    return bodyHit(e);
  }

  // 3. Point of Control (POC) line
  if (
    vp &&
    vp.pocY !== null &&
    Math.abs(p.y - vp.pocY) <= tol.line &&
    p.x >= xMin - tol.line &&
    p.x <= xMax + tol.line
  ) {
    return bodyHit(e);
  }

  // 4. Value Area High (VAH) & Value Area Low (VAL) lines
  if (
    vp &&
    vp.vahY !== null &&
    Math.abs(p.y - vp.vahY) <= tol.line &&
    p.x >= xMin - tol.line &&
    p.x <= xMax + tol.line
  ) {
    return bodyHit(e);
  }
  if (
    vp &&
    vp.valY !== null &&
    Math.abs(p.y - vp.valY) <= tol.line &&
    p.x >= xMin - tol.line &&
    p.x <= xMax + tol.line
  ) {
    return bodyHit(e);
  }

  // 5. Volume Profile Histogram Bars
  if (
    vp &&
    vp.buckets.length > 0 &&
    vp.maxVol > 0 &&
    p.x >= xMin - tol.line &&
    p.x <= xMin + maxBarWidth + tol.line &&
    p.y >= yTop - tol.line &&
    p.y <= yBot + tol.line
  ) {
    for (const b of vp.buckets) {
      if (b.yTop === null || b.yBottom === null) continue;
      const byTop = Math.min(b.yTop, b.yBottom);
      const byBot = Math.max(b.yTop, b.yBottom);
      if (p.y >= byTop - tol.line && p.y <= byBot + tol.line) {
        const upW = Math.round((b.upVol / vp.maxVol) * maxBarWidth);
        const downW = Math.round((b.downVol / vp.maxVol) * maxBarWidth);
        const barW = upW + downW;
        if (barW > 0 && p.x >= xMin - tol.line && p.x <= xMin + barW + tol.line) {
          return bodyHit(e);
        }
      }
    }
  }

  // 6. Outline fallback for uncalculated / empty profiles (never empty space inside)
  if (!vp || vp.buckets.length === 0) {
    const onTopOrBot =
      p.x >= xMin - tol.line &&
      p.x <= xMax + tol.line &&
      (Math.abs(p.y - yTop) <= tol.line || Math.abs(p.y - yBot) <= tol.line);
    if (onTopOrBot) return bodyHit(e);
  }

  return null;
}

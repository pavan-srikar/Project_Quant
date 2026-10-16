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

// Position handles: entry / target / stop / side width / corners
export function hitPosition(e: ResolvedEntry, p: Pt, tol: Tol): Hit | null {
  const { x1, x2, y1, yStop, yTarget } = e;
  if (x1 === null || x2 === null || y1 === null) return null;
  const xa = Math.min(x1, x2);
  const xb = Math.max(x1, x2);
  const xm = (xa + xb) / 2;

  // Center handles
  if (yTarget != null && dist(p, { x: xm, y: yTarget }) <= tol.handle) {
    return pointHit(e, null, "targetPrice");
  }
  if (yStop != null && dist(p, { x: xm, y: yStop }) <= tol.handle) {
    return pointHit(e, null, "stopPrice");
  }
  if (dist(p, { x: xm, y: y1 }) <= tol.handle) return pointHit(e, null, "price");

  // Side handles (on entry line)
  if (dist(p, { x: xa, y: y1 }) <= tol.handle) return pointHit(e, "time", null);
  if (dist(p, { x: xb, y: y1 }) <= tol.handle) return pointHit(e, "time2", null);

  // Corner handles
  if (yTarget != null && dist(p, { x: xa, y: yTarget }) <= tol.handle) {
    return pointHit(e, "time", "targetPrice");
  }
  if (yTarget != null && dist(p, { x: xb, y: yTarget }) <= tol.handle) {
    return pointHit(e, "time2", "targetPrice");
  }
  if (yStop != null && dist(p, { x: xa, y: yStop }) <= tol.handle) {
    return pointHit(e, "time", "stopPrice");
  }
  if (yStop != null && dist(p, { x: xb, y: yStop }) <= tol.handle) {
    return pointHit(e, "time2", "stopPrice");
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
  // Expand bounds to include outside badges (~32px) so hovering on badges keeps tool hovered
  const badgePad = 32;
  const inside =
    p.x >= Math.min(xa - tol.line, xm - 75) &&
    p.x <= Math.max(xb + tol.line, xm + 75) &&
    p.y >= top - badgePad &&
    p.y <= bot + badgePad;
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

import type { Pt } from "./geometry";
import type { Hit, ResolvedEntry } from "./types";
import { HANDLE_TOLERANCE, LINE_TOLERANCE, type Tol } from "./hit-test/common";
import { hitHorizontal, hitTrendline, hitVertical } from "./hit-test/line-hits";
import { hitBoxShape, hitChannel, hitRectangle, hitText } from "./hit-test/shape-hits";
import { hitFibonacci, hitPosition, hitVolumeProfile } from "./hit-test/complex-hits";

export * from "./hit-test/common";
export * from "./hit-test/line-hits";
export * from "./hit-test/shape-hits";
export * from "./hit-test/complex-hits";

/**
 * Topmost (last-drawn) drawing wins, matching visual stacking order.
 * `scale` multiplies hit tolerances — pass ~2 for touch input.
 */
export function hitTest(entries: ResolvedEntry[], p: Pt, scale = 1): Hit | null {
  const tol: Tol = { handle: HANDLE_TOLERANCE * scale, line: LINE_TOLERANCE * scale };
  for (let i = entries.length - 1; i >= 0; i--) {
    const hit = hitEntry(entries[i]!, p, tol);
    if (hit) return hit;
  }
  return null;
}

export function hitEntry(e: ResolvedEntry, p: Pt, tol: Tol): Hit | null {
  switch (e.d.type) {
    case "trendline":
      return hitTrendline(e, p, tol);
    case "horizontal":
      return hitHorizontal(e, p, tol);
    case "rectangle":
      return hitRectangle(e, p, tol);
    case "fibonacci":
      return hitFibonacci(e, p, tol);
    case "position":
      return hitPosition(e, p, tol);
    case "arrow":
      return hitTrendline(e, p, tol);
    case "fibextension":
      return hitFibonacci(e, p, tol);
    case "vertical":
      return hitVertical(e, p, tol);
    case "channel":
      return hitChannel(e, p, tol);
    case "fixed-range-volume-profile":
      return hitVolumeProfile(e, p, tol);
    case "ellipse":
    case "triangle":
      return hitBoxShape(e, p, tol);
    case "text":
      return hitText(e, p, tol);
    default:
      return null;
  }
}

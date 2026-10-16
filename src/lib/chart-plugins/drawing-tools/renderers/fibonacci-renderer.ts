import type { BitmapCoordinatesRenderingScope } from "fancy-canvas";
import type { ResolvedEntry, ResolvedFibLevel } from "../types";
import {
  FIB_BAND_ALPHA,
  drawHandle,
  hexToRgba,
  showHandles,
  strokeLine,
  toBitmap,
} from "./canvas-utils";

export function renderFibonacci(scope: BitmapCoordinatesRenderingScope, e: ResolvedEntry): void {
  if (e.x1 === null || e.x2 === null || !e.fibLevels || e.fibLevels.length === 0) return;
  const xA = Math.round(Math.min(e.x1, e.x2) * scope.horizontalPixelRatio);
  const xB = Math.round(Math.max(e.x1, e.x2) * scope.horizontalPixelRatio);
  renderFibBands(scope, e.fibLevels, xA, xB);
  for (const lvl of e.fibLevels) renderFibLevel(scope, lvl, xA, xB);
  renderFibConnector(scope, e);
}

export function renderFibBands(
  scope: BitmapCoordinatesRenderingScope,
  levels: ResolvedFibLevel[],
  xA: number,
  xB: number,
): void {
  const ctx = scope.context;
  for (let i = 0; i < levels.length - 1; i++) {
    const top = levels[i]!;
    const bottom = levels[i + 1]!;
    if (top.y === null || bottom.y === null) continue;
    const yA = Math.round(top.y * scope.verticalPixelRatio);
    const yB = Math.round(bottom.y * scope.verticalPixelRatio);
    ctx.fillStyle = hexToRgba(bottom.color, FIB_BAND_ALPHA);
    ctx.fillRect(xA, Math.min(yA, yB), xB - xA, Math.abs(yB - yA));
  }
}

export function renderFibLevel(
  scope: BitmapCoordinatesRenderingScope,
  lvl: ResolvedFibLevel,
  xA: number,
  xB: number,
): void {
  if (lvl.y === null) return;
  const y = Math.round(lvl.y * scope.verticalPixelRatio);
  strokeLine(scope, { x: xA, y }, { x: xB, y }, lvl.color, 1);
  const ctx = scope.context;
  ctx.save();
  ctx.font = `${Math.round(10 * scope.verticalPixelRatio)}px monospace`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillStyle = lvl.color;
  ctx.fillText(lvl.label, xA - 6 * scope.horizontalPixelRatio, y);
  ctx.restore();
}

// Dashed diagonal between the two anchors, like TradingView's fib trend
// connector — also where the drag handles live.
export function renderFibConnector(scope: BitmapCoordinatesRenderingScope, e: ResolvedEntry): void {
  if (e.x1 === null || e.y1 === null || e.x2 === null || e.y2 === null) return;
  const a = toBitmap(scope, e.x1, e.y1);
  const b = toBitmap(scope, e.x2, e.y2);
  strokeLine(scope, a, b, e.d.color, 1, [4, 4]);
  if (showHandles(e)) {
    drawHandle(scope, a, e.d.color);
    drawHandle(scope, b, e.d.color);
  }
}

import type { BitmapCoordinatesRenderingScope } from "fancy-canvas";
import type { DrawCtxInfo, ResolvedEntry } from "../types";
import {
  drawHandle,
  hexToRgba,
  showHandles,
  strokeLine,
  toBitmap,
} from "./canvas-utils";
import { renderLivePositionTracker } from "./position-tracker-renderer.ts";

export const POS_GREEN = "#3179f5";
export const POS_RED = "#ec407a";

export function renderPosition(
  scope: BitmapCoordinatesRenderingScope,
  e: ResolvedEntry,
  info: DrawCtxInfo,
): void {
  const { x1, x2, y1, yStop, yTarget } = e;
  if (x1 === null || x2 === null || y1 === null || yStop == null || yTarget == null) return;
  const xa = Math.min(x1, x2);
  const xb = Math.max(x1, x2);
  const width = xb - xa;
  if (width < 2) return;

  // Target Zone (Profit) & Stop Zone (Loss)
  posZone(scope, xa, xb, y1, yTarget, POS_GREEN);
  posZone(scope, xa, xb, y1, yStop, POS_RED);

  // High-contrast Entry Separator Line
  strokeLine(scope, toBitmap(scope, xa, y1), toBitmap(scope, xb, y1), "#787b86", 1.5);

  // Interactive Live Position Tracker (Entry → Current Price, always visible once triggered)
  renderLivePositionTracker(scope, e, info, xa, xb, y1);

  // Target, Stop, and Risk/Reward badges ONLY appear when you hover over it
  if (e.isHovered || e.state === "hovered") {
    renderPositionBadges(scope, e, info, xa, xb, y1, yTarget, yStop);
  }

  // Handles appear on hover or selection (for resizing)
  if (showHandles(e)) {
    renderPositionHandles(scope, e, xa, xb, y1);
  }
}

export {
  drawLiveTrackerBadge,
  renderLivePositionTracker,
} from "./position-tracker-renderer.ts";

export function posZone(
  scope: BitmapCoordinatesRenderingScope,
  xa: number,
  xb: number,
  yFrom: number,
  yTo: number,
  color: string,
  alpha = 0.2,
): void {
  const ctx = scope.context;
  const a = toBitmap(scope, xa, Math.min(yFrom, yTo));
  const b = toBitmap(scope, xb, Math.max(yFrom, yTo));
  const h = Math.max(1, b.y - a.y);
  const w = Math.max(1, b.x - a.x);

  ctx.save();
  ctx.fillStyle = hexToRgba(color, alpha);
  ctx.fillRect(a.x, a.y, w, h);
  ctx.strokeStyle = hexToRgba(color, 0.85);
  ctx.lineWidth = scope.verticalPixelRatio;
  ctx.strokeRect(a.x, a.y, w, h);
  ctx.restore();
}

export function renderPositionBadges(
  scope: BitmapCoordinatesRenderingScope,
  e: ResolvedEntry,
  info: DrawCtxInfo,
  xa: number,
  xb: number,
  y1: number,
  yTarget: number,
  yStop: number,
): void {
  const d = e.d;
  if (d.stopPrice == null || d.targetPrice == null) return;

  const reward = Math.abs(d.targetPrice - d.price);
  const risk = Math.abs(d.price - d.stopPrice);
  const rr = risk > 0 ? reward / risk : 0;
  const targetDiffPct = d.price !== 0 ? (reward / d.price) * 100 : 0;
  const stopDiffPct = d.price !== 0 ? (risk / d.price) * 100 : 0;

  // Minimal target line: Target: price [+x%]
  const targetLines = [
    `Target: ${info.priceFormat(d.targetPrice)} [+${targetDiffPct.toFixed(2)}%]`,
  ];

  // Minimal stop line: Stop: price [-y%]
  const stopLines = [
    `Stop: ${info.priceFormat(d.stopPrice)} [-${stopDiffPct.toFixed(2)}%]`,
  ];

  const xm = (xa + xb) / 2;
  const isLong = d.side !== "short";

  // Position target badge outside target zone, stop badge outside stop zone (no overlap on position)
  drawTvBadge(scope, xm, yTarget, targetLines, POS_GREEN, isLong ? "above" : "below");
  drawTvBadge(scope, xm, yStop, stopLines, POS_RED, isLong ? "below" : "above");

  // In the middle: show Risk/Reward ratio
  drawTvBadge(scope, xm, y1, [`Risk/Reward: ${rr.toFixed(2)}`], "#2962ff", "center");
}

export function drawTvBadge(
  scope: BitmapCoordinatesRenderingScope,
  centerX: number,
  edgeY: number,
  lines: string[],
  accentColor: string,
  align: "above" | "below" | "center" = "center",
): void {
  const ctx = scope.context;
  const hpr = scope.horizontalPixelRatio;
  const vpr = scope.verticalPixelRatio;

  ctx.save();
  ctx.font = `600 ${Math.round(11 * vpr)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  const lineH = 15 * vpr;
  const padX = 8 * hpr;
  const padY = 5 * vpr;

  const maxTextW = Math.max(...lines.map((l) => ctx.measureText(l).width));
  const boxW = maxTextW + padX * 2;
  const boxH = lines.length * lineH + padY * 2;

  const bx = Math.round(centerX * hpr - boxW / 2);
  const offset = 8 * vpr;
  let by: number;
  if (align === "center") {
    by = Math.round(edgeY * vpr - boxH / 2);
  } else if (align === "above") {
    by = Math.round(edgeY * vpr - boxH - offset);
  } else {
    // "below"
    by = Math.round(edgeY * vpr + offset);
  }

  // Clamp within viewport
  const clampedX = Math.min(Math.max(4 * hpr, bx), scope.bitmapSize.width - boxW - 4 * hpr);
  const clampedY = Math.min(Math.max(4 * vpr, by), scope.bitmapSize.height - boxH - 4 * vpr);

  // Badge background
  ctx.fillStyle = "rgba(18, 22, 34, 0.90)";
  ctx.beginPath();
  ctx.roundRect(clampedX, clampedY, boxW, boxH, 4 * hpr);
  ctx.fill();

  // Subtle border with accent
  ctx.strokeStyle = hexToRgba(accentColor, 0.7);
  ctx.lineWidth = 1 * vpr;
  ctx.stroke();

  // Text rendering
  ctx.textBaseline = "top";
  lines.forEach((l, i) => {
    ctx.fillStyle = i === 0 ? "#ffffff" : "#b2b5be";
    ctx.fillText(l, clampedX + padX, clampedY + padY + i * lineH);
  });
  ctx.restore();
}

export function renderPositionHandles(
  scope: BitmapCoordinatesRenderingScope,
  e: ResolvedEntry,
  xa: number,
  xb: number,
  y1: number,
): void {
  const xm = (xa + xb) / 2;

  // Center handles
  drawHandle(scope, toBitmap(scope, xm, y1), "#ffffff"); // Entry center
  if (e.yTarget != null) drawHandle(scope, toBitmap(scope, xm, e.yTarget), POS_GREEN); // Target center
  if (e.yStop != null) drawHandle(scope, toBitmap(scope, xm, e.yStop), POS_RED); // Stop center

  // Side width handles (left & right on entry line)
  drawHandle(scope, toBitmap(scope, xa, y1), "#ffffff");
  drawHandle(scope, toBitmap(scope, xb, y1), "#ffffff");

  // Corner handles
  if (e.yTarget != null) {
    drawHandle(scope, toBitmap(scope, xa, e.yTarget), POS_GREEN);
    drawHandle(scope, toBitmap(scope, xb, e.yTarget), POS_GREEN);
  }
  if (e.yStop != null) {
    drawHandle(scope, toBitmap(scope, xa, e.yStop), POS_RED);
    drawHandle(scope, toBitmap(scope, xb, e.yStop), POS_RED);
  }
}

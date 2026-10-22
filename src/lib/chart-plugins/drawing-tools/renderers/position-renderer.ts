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

  const targetColor = e.d.targetColor ?? POS_GREEN;
  const stopColor = e.d.stopColor ?? POS_RED;
  const entryLineColor = e.d.entryLineColor ?? "#787b86";

  // Target Zone (Profit) & Stop Zone (Loss)
  posZone(scope, xa, xb, y1, yTarget, targetColor);
  posZone(scope, xa, xb, y1, yStop, stopColor);

  // High-contrast Entry Separator Line
  strokeLine(scope, toBitmap(scope, xa, y1), toBitmap(scope, xb, y1), entryLineColor, 1.5);

  // Interactive Live Position Tracker (Entry → Current Price, always visible once triggered)
  renderLivePositionTracker(scope, e, info, xa, xb, y1);

  // Target, Stop, and Risk/Reward badges ONLY appear when hovered or selected
  if (e.isHovered || e.state === "hovered" || e.state === "selected") {
    renderPositionBadges(scope, e, info, xa, xb, y1, yTarget, yStop, targetColor, stopColor);
  }

  // Handles appear on hover or selection (for resizing)
  if (showHandles(e)) {
    renderPositionHandles(scope, e, xa, xb, y1, targetColor, stopColor);
  }
}

export { renderLivePositionTracker } from "./position-tracker-renderer.ts";

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
  targetColor: string = POS_GREEN,
  stopColor: string = POS_RED,
): void {
  const d = e.d;
  if (d.stopPrice == null || d.targetPrice == null) return;

  const reward = Math.abs(d.targetPrice - d.price);
  const risk = Math.abs(d.price - d.stopPrice);
  const rr = risk > 0 ? reward / risk : 0;
  const targetDiffPct = d.price !== 0 ? (reward / d.price) * 100 : 0;
  const stopDiffPct = d.price !== 0 ? (risk / d.price) * 100 : 0;

  // Minimal target line: Target: price (x%)
  const targetLines = [
    `Target: ${info.priceFormat(d.targetPrice)} (${targetDiffPct.toFixed(2)}%)`,
  ];

  // Minimal stop line: Stop: price (y%)
  const stopLines = [
    `Stop: ${info.priceFormat(d.stopPrice)} (${stopDiffPct.toFixed(2)}%)`,
  ];

  const xm = (xa + xb) / 2;
  const isLong = d.side !== "short";

  // Position target badge outside target zone, stop badge outside stop zone
  drawTvBadge(scope, xm, yTarget, targetLines, targetColor, isLong ? "above" : "below");
  drawTvBadge(scope, xm, yStop, stopLines, stopColor, isLong ? "below" : "above");

  // In the middle: Closed / Open PnL and Risk/reward ratio
  const midLines: string[] = [];
  const inProfit =
    e.currentPrice != null
      ? (isLong ? e.currentPrice >= d.price : e.currentPrice <= d.price)
      : true;

  if (e.trackingStatus === "CLOSED" && e.currentPrice != null) {
    const pct = d.price !== 0 ? ((e.currentPrice - d.price) / d.price) * (isLong ? 100 : -100) : 0;
    const sign = pct >= 0 ? "+" : "";
    midLines.push(`Closed: ${info.priceFormat(e.currentPrice)} [${sign}${pct.toFixed(2)}%]`);
  } else if (e.hasTriggered && e.currentPrice != null) {
    const pct = d.price !== 0 ? ((e.currentPrice - d.price) / d.price) * (isLong ? 100 : -100) : 0;
    const sign = pct >= 0 ? "+" : "";
    midLines.push(`Open: ${info.priceFormat(e.currentPrice)} [${sign}${pct.toFixed(2)}%]`);
  }
  const rrStr = Number.isInteger(rr) ? `${rr}` : rr.toFixed(2);
  midLines.push(`Risk/reward ratio: ${rrStr}`);

  const midColor = inProfit ? targetColor : stopColor;
  drawTvBadge(scope, xm, y1, midLines, midColor, "center", true);
}

export function drawTvBadge(
  scope: BitmapCoordinatesRenderingScope,
  centerX: number,
  edgeY: number,
  lines: string[],
  accentColor: string,
  align: "above" | "below" | "center" = "center",
  hasWhiteBorder: boolean = false,
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

  // Fixed position: If badge is off-screen, do not render (prevents drifting to viewport edges)
  if (by + boxH < 0 || by > scope.bitmapSize.height) {
    ctx.restore();
    return;
  }

  const drawX = bx;
  const drawY = by;

  // Badge background: Solid color from TradingView reference image
  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.roundRect(drawX, drawY, boxW, boxH, 4 * hpr);
  ctx.fill();

  // White border for middle badge / selected state
  if (hasWhiteBorder) {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5 * vpr;
    ctx.stroke();
  } else {
    ctx.strokeStyle = hexToRgba(accentColor, 0.9);
    ctx.lineWidth = 1 * vpr;
    ctx.stroke();
  }

  // Text rendering: Crisp dark text from reference image
  ctx.textBaseline = "top";
  lines.forEach((l, i) => {
    ctx.fillStyle = "#131722";
    ctx.fillText(l, drawX + padX, drawY + padY + i * lineH);
  });
  ctx.restore();
}

export function renderPositionHandles(
  scope: BitmapCoordinatesRenderingScope,
  e: ResolvedEntry,
  xa: number,
  xb: number,
  y1: number,
  targetColor: string = POS_GREEN,
  stopColor: string = POS_RED,
): void {
  // Target & Stop handles on the left anchor line
  if (e.yTarget != null) drawHandle(scope, toBitmap(scope, xa, e.yTarget), targetColor);
  if (e.yStop != null) drawHandle(scope, toBitmap(scope, xa, e.yStop), stopColor);

  // First adjustment middle handle (entry) on left: moves in X and Y
  drawHandle(scope, toBitmap(scope, xa, y1), "#ffffff");

  // Right width handle on entry line: adjusts duration
  drawHandle(scope, toBitmap(scope, xb, y1), "#ffffff");
}


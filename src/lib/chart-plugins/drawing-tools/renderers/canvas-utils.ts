import type { BitmapCoordinatesRenderingScope } from "fancy-canvas";
import type { DrawingLineStyle } from "../../../../pages/trading/constants";
import type { ResolvedEntry } from "../types";

export const HANDLE_RADIUS = 5;
export const LINE_WIDTH = 2;
export const FIB_BAND_ALPHA = 0.08;
export const RECT_FILL_ALPHA = 0.14;

export interface BPt {
  x: number;
  y: number;
}
export { hexToRgba } from "../../../../lib/utils";

export function toBitmap(scope: BitmapCoordinatesRenderingScope, x: number, y: number): BPt {
  return {
    x: Math.round(x * scope.horizontalPixelRatio),
    y: Math.round(y * scope.verticalPixelRatio),
  };
}

export function showHandles(e: ResolvedEntry): boolean {
  return e.state === "hovered" || e.state === "selected";
}

// Dash pattern (media px) for each drawing line style.
export function dashFor(style: DrawingLineStyle | undefined): readonly number[] | undefined {
  if (style === "dashed") return [6, 6];
  if (style === "dotted") return [2, 3];
  return undefined;
}

export function applyDash(
  scope: BitmapCoordinatesRenderingScope,
  dash: readonly number[] | undefined,
): void {
  if (!dash) return;
  scope.context.setLineDash(dash.map((v) => v * scope.horizontalPixelRatio));
}

export function strokeLine(
  scope: BitmapCoordinatesRenderingScope,
  a: BPt,
  b: BPt,
  color: string,
  widthMedia: number,
  dash?: readonly number[],
): void {
  const ctx = scope.context;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = widthMedia * scope.verticalPixelRatio;
  applyDash(scope, dash);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.restore();
}

export function drawHandle(scope: BitmapCoordinatesRenderingScope, p: BPt, color: string): void {
  const ctx = scope.context;
  ctx.save();
  ctx.beginPath();
  ctx.arc(p.x, p.y, HANDLE_RADIUS * scope.horizontalPixelRatio, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.lineWidth = 1.5 * scope.horizontalPixelRatio;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.restore();
}

// Amber bell dot marking a line that fires an alert when price crosses it.
export function drawAlertBadge(scope: BitmapCoordinatesRenderingScope, x: number, y: number): void {
  const ctx = scope.context;
  const r = 4 * scope.horizontalPixelRatio;
  ctx.save();
  ctx.fillStyle = "#f0b90b";
  ctx.strokeStyle = "#1b1f2a";
  ctx.lineWidth = scope.horizontalPixelRatio;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawArrowhead(
  scope: BitmapCoordinatesRenderingScope,
  from: BPt,
  to: BPt,
  color: string,
): void {
  const ctx = scope.context;
  const ang = Math.atan2(to.y - from.y, to.x - from.x);
  const len = 12 * scope.horizontalPixelRatio;
  const spread = Math.PI / 7;
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - len * Math.cos(ang - spread), to.y - len * Math.sin(ang - spread));
  ctx.lineTo(to.x - len * Math.cos(ang + spread), to.y - len * Math.sin(ang + spread));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Reusable dark readout box (stats, text labels).
export function drawLabelBox(
  scope: BitmapCoordinatesRenderingScope,
  x: number,
  y: number,
  lines: string[],
  borderColor: string,
): void {
  const ctx = scope.context;
  const hpr = scope.horizontalPixelRatio;
  const vpr = scope.verticalPixelRatio;
  ctx.save();
  ctx.font = `${Math.round(10 * vpr)}px monospace`;
  const lineH = 13 * vpr;
  const pad = 6 * hpr;
  const width = Math.max(...lines.map((l) => ctx.measureText(l).width)) + pad * 2;
  const height = lines.length * lineH + pad;
  const bx = Math.min(x, scope.bitmapSize.width - width);
  const by = Math.min(Math.max(y, 0), scope.bitmapSize.height - height);
  ctx.fillStyle = "rgba(20, 24, 35, 0.92)";
  ctx.beginPath();
  ctx.roundRect(bx, by, width, height, 4 * hpr);
  ctx.fill();
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#e0e3ea";
  ctx.textBaseline = "top";
  lines.forEach((l, i) => ctx.fillText(l, bx + pad, by + pad / 2 + i * lineH));
  ctx.restore();
}

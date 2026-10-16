import type { BitmapCoordinatesRenderingScope } from "fancy-canvas";
import type { ResolvedEntry } from "../types";
import {
  type BPt,
  LINE_WIDTH,
  RECT_FILL_ALPHA,
  applyDash,
  dashFor,
  drawArrowhead,
  drawHandle,
  hexToRgba,
  showHandles,
  strokeLine,
  toBitmap,
} from "./canvas-utils";

// Parallel channel: the main anchor line plus a copy offset by (price3 − price1),
// with a translucent fill between them.
export function renderChannel(scope: BitmapCoordinatesRenderingScope, e: ResolvedEntry): void {
  if (e.x1 === null || e.y1 === null || e.x2 === null || e.y2 === null) return;
  if (e.y3 == null) return;
  const dy = e.y3 - e.y1;
  const a1 = toBitmap(scope, e.x1, e.y1);
  const b1 = toBitmap(scope, e.x2, e.y2);
  const a2 = toBitmap(scope, e.x1, e.y3);
  const b2 = toBitmap(scope, e.x2, e.y2 + dy);
  const ctx = scope.context;
  ctx.save();
  ctx.fillStyle = hexToRgba(e.d.fillColor ?? e.d.color, e.d.fillOpacity ?? 0.1);
  ctx.beginPath();
  ctx.moveTo(a1.x, a1.y);
  ctx.lineTo(b1.x, b1.y);
  ctx.lineTo(b2.x, b2.y);
  ctx.lineTo(a2.x, a2.y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  const dash = dashFor(e.d.lineStyle);
  strokeLine(scope, a1, b1, e.d.color, e.d.width ?? LINE_WIDTH, dash);
  strokeLine(scope, a2, b2, e.d.color, e.d.width ?? LINE_WIDTH, dash);
  if (showHandles(e)) {
    drawHandle(scope, a1, e.d.color);
    drawHandle(scope, b1, e.d.color);
    drawHandle(scope, a2, e.d.color);
  }
}

export function renderEllipse(scope: BitmapCoordinatesRenderingScope, e: ResolvedEntry): void {
  if (e.x1 === null || e.y1 === null || e.x2 === null || e.y2 === null) return;
  const a = toBitmap(scope, e.x1, e.y1);
  const b = toBitmap(scope, e.x2, e.y2);
  const ctx = scope.context;
  const cx = (a.x + b.x) / 2;
  const cy = (a.y + b.y) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, Math.abs(b.x - a.x) / 2, Math.abs(b.y - a.y) / 2, 0, 0, Math.PI * 2);
  ctx.fillStyle = hexToRgba(e.d.fillColor ?? e.d.color, e.d.fillOpacity ?? RECT_FILL_ALPHA);
  ctx.fill();
  ctx.strokeStyle = e.d.color;
  ctx.lineWidth = (e.d.width ?? 1.5) * scope.verticalPixelRatio;
  applyDash(scope, dashFor(e.d.lineStyle));
  ctx.stroke();
  ctx.restore();
  if (showHandles(e)) drawRectHandles(scope, a, b, e.d.color);
}

export function renderArrow(scope: BitmapCoordinatesRenderingScope, e: ResolvedEntry): void {
  if (e.x1 === null || e.y1 === null || e.x2 === null || e.y2 === null) return;
  const a = toBitmap(scope, e.x1, e.y1);
  const b = toBitmap(scope, e.x2, e.y2);
  strokeLine(scope, a, b, e.d.color, e.d.width ?? LINE_WIDTH, dashFor(e.d.lineStyle));
  drawArrowhead(scope, a, b, e.d.color);
  if (showHandles(e)) {
    drawHandle(scope, a, e.d.color);
    drawHandle(scope, b, e.d.color);
  }
}

export function renderTriangle(scope: BitmapCoordinatesRenderingScope, e: ResolvedEntry): void {
  if (e.x1 === null || e.y1 === null || e.x2 === null || e.y2 === null) return;
  const a = toBitmap(scope, e.x1, e.y1);
  const b = toBitmap(scope, e.x2, e.y2);
  const ctx = scope.context;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo((a.x + b.x) / 2, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.lineTo(a.x, b.y);
  ctx.closePath();
  ctx.fillStyle = hexToRgba(e.d.fillColor ?? e.d.color, e.d.fillOpacity ?? RECT_FILL_ALPHA);
  ctx.fill();
  ctx.strokeStyle = e.d.color;
  ctx.lineWidth = (e.d.width ?? 1.5) * scope.verticalPixelRatio;
  applyDash(scope, dashFor(e.d.lineStyle));
  ctx.stroke();
  ctx.restore();
  if (showHandles(e)) {
    drawHandle(scope, a, e.d.color);
    drawHandle(scope, b, e.d.color);
  }
}

export function renderRectangle(scope: BitmapCoordinatesRenderingScope, e: ResolvedEntry): void {
  if (e.x1 === null || e.y1 === null || e.x2 === null || e.y2 === null) return;
  const a = toBitmap(scope, e.x1, e.y1);
  const b = toBitmap(scope, e.x2, e.y2);
  const ctx = scope.context;
  ctx.save();
  ctx.fillStyle = hexToRgba(e.d.color, RECT_FILL_ALPHA);
  ctx.fillRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
  ctx.strokeStyle = e.d.color;
  ctx.lineWidth = (e.d.width ?? 1.5) * scope.verticalPixelRatio;
  applyDash(scope, dashFor(e.d.lineStyle));
  ctx.strokeRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
  ctx.restore();
  if (showHandles(e)) drawRectHandles(scope, a, b, e.d.color);
}

export function drawRectHandles(
  scope: BitmapCoordinatesRenderingScope,
  a: BPt,
  b: BPt,
  color: string,
): void {
  drawHandle(scope, a, color);
  drawHandle(scope, b, color);
  drawHandle(scope, { x: a.x, y: b.y }, color);
  drawHandle(scope, { x: b.x, y: a.y }, color);
}

import type { BitmapCoordinatesRenderingScope } from "fancy-canvas";
import type { ResolvedEntry } from "../types";
import {
  type BPt,
  LINE_WIDTH,
  dashFor,
  drawAlertBadge,
  drawArrowhead,
  drawHandle,
  showHandles,
  strokeLine,
  toBitmap,
} from "./canvas-utils";

export function renderVertical(scope: BitmapCoordinatesRenderingScope, e: ResolvedEntry): void {
  if (e.x1 === null) return;
  const x = Math.round(e.x1 * scope.horizontalPixelRatio);
  strokeLine(
    scope,
    { x, y: 0 },
    { x, y: scope.bitmapSize.height },
    e.d.color,
    e.d.width ?? 1.5,
    dashFor(e.d.lineStyle),
  );
  if (showHandles(e)) {
    drawHandle(scope, { x, y: Math.round(scope.bitmapSize.height / 2) }, e.d.color);
  }
}

export function renderHorizontal(scope: BitmapCoordinatesRenderingScope, e: ResolvedEntry): void {
  if (e.y1 === null) return;
  const y = Math.round(e.y1 * scope.verticalPixelRatio);
  strokeLine(
    scope,
    { x: 0, y },
    { x: scope.bitmapSize.width, y },
    e.d.color,
    e.d.width ?? 1.5,
    dashFor(e.d.lineStyle),
  );
  if (showHandles(e))
    drawHandle(scope, { x: Math.round(scope.bitmapSize.width / 2), y }, e.d.color);
  if (e.d.alertEnabled) {
    drawAlertBadge(scope, scope.bitmapSize.width - 14 * scope.horizontalPixelRatio, y);
  }
}

export function renderTrendline(scope: BitmapCoordinatesRenderingScope, e: ResolvedEntry): void {
  if (e.x1 === null || e.y1 === null || e.x2 === null || e.y2 === null) return;
  const a = toBitmap(scope, e.x1, e.y1);
  const b = toBitmap(scope, e.x2, e.y2);
  const seg = e.seg ?? { x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2 };
  const sa = toBitmap(scope, seg.x1, seg.y1);
  const sb = toBitmap(scope, seg.x2, seg.y2);
  strokeLine(scope, sa, sb, e.d.color, e.d.width ?? LINE_WIDTH, dashFor(e.d.lineStyle));
  if (e.d.arrowEnd) drawArrowhead(scope, sa, sb, e.d.color);
  if (e.d.arrowStart) drawArrowhead(scope, sb, sa, e.d.color);
  if (showHandles(e)) {
    drawHandle(scope, a, e.d.color);
    drawHandle(scope, b, e.d.color);
    drawMidpointHandle(scope, a, b, e.d.color);
  }
  if (e.d.alertEnabled) {
    const right = a.x >= b.x ? a : b;
    drawAlertBadge(scope, right.x, right.y);
  }
  if (e.stats && e.stats.length > 0) drawStatsBox(scope, b, e.stats, e.d, a);
}

// Smaller square handle at the anchor midpoint — grabbing it body-drags the
// whole line (the hit-test already treats the line body as a move target).
export function drawMidpointHandle(
  scope: BitmapCoordinatesRenderingScope,
  a: BPt,
  b: BPt,
  color: string,
): void {
  const ctx = scope.context;
  const half = 3 * scope.horizontalPixelRatio;
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5 * scope.horizontalPixelRatio;
  ctx.beginPath();
  ctx.rect(mx - half, my - half, half * 2, half * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// Δprice / % / bars / angle readout near the second anchor (TV-style).
export function drawStatsBox(
  scope: BitmapCoordinatesRenderingScope,
  at: BPt,
  stats: string[],
  d: { color: string },
  from: BPt,
): void {
  const ctx = scope.context;
  const hpr = scope.horizontalPixelRatio;
  const vpr = scope.verticalPixelRatio;
  const angleDeg = Math.round((Math.atan2(from.y - at.y, at.x - from.x) * 180) / Math.PI);
  const lines = [...stats, `${angleDeg}°`];
  ctx.save();
  ctx.font = `${Math.round(10 * vpr)}px monospace`;
  const lineH = 13 * vpr;
  const pad = 6 * hpr;
  const width = Math.max(...lines.map((l) => ctx.measureText(l).width)) + pad * 2;
  const height = lines.length * lineH + pad;
  const x = Math.min(at.x + 10 * hpr, scope.bitmapSize.width - width);
  const y = Math.min(at.y + 10 * vpr, scope.bitmapSize.height - height);
  ctx.fillStyle = "rgba(20, 24, 35, 0.92)";
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 4 * hpr);
  ctx.fill();
  ctx.strokeStyle = d.color;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#e0e3ea";
  ctx.textBaseline = "top";
  lines.forEach((line, i) => {
    ctx.fillText(line, x + pad, y + pad / 2 + i * lineH);
  });
  ctx.restore();
}

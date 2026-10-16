import type { BitmapCoordinatesRenderingScope } from "fancy-canvas";
import type { DrawCtxInfo, ResolvedEntry } from "../types";
import {
  hexToRgba,
  strokeLine,
  toBitmap,
} from "./canvas-utils";

export const POS_GREEN = "#3179f5";
export const POS_RED = "#ec407a";

export function drawLiveTrackerBadge(
  scope: BitmapCoordinatesRenderingScope,
  x: number,
  y: number,
  lines: string[],
  accentColor: string,
): void {
  const ctx = scope.context;
  const hpr = scope.horizontalPixelRatio;
  const vpr = scope.verticalPixelRatio;

  ctx.save();
  ctx.font = `600 ${Math.round(10 * vpr)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  const lineH = 13 * vpr;
  const padX = 6 * hpr;
  const padY = 4 * vpr;

  const maxTextW = Math.max(...lines.map((l) => ctx.measureText(l).width));
  const boxW = maxTextW + padX * 2;
  const boxH = lines.length * lineH + padY * 2;

  let bx = Math.round(x * hpr + 8 * hpr);
  let by = Math.round(y * vpr - boxH / 2);

  // If badge would overflow right of viewport, place on left of marker
  if (bx + boxW > scope.bitmapSize.width - 4 * hpr) {
    bx = Math.round(x * hpr - boxW - 8 * hpr);
  }
  by = Math.min(Math.max(4 * vpr, by), scope.bitmapSize.height - boxH - 4 * vpr);

  ctx.fillStyle = "rgba(18, 22, 34, 0.92)";
  ctx.beginPath();
  ctx.roundRect(bx, by, boxW, boxH, 3 * hpr);
  ctx.fill();

  ctx.strokeStyle = hexToRgba(accentColor, 0.85);
  ctx.lineWidth = 1 * vpr;
  ctx.stroke();

  ctx.textBaseline = "top";
  lines.forEach((l, i) => {
    ctx.fillStyle = i === 0 ? accentColor : "#e0e3ea";
    ctx.fillText(l, bx + padX, by + padY + i * lineH);
  });
  ctx.restore();
}

export function renderLivePositionTracker(
  scope: BitmapCoordinatesRenderingScope,
  e: ResolvedEntry,
  info: DrawCtxInfo,
  xa: number,
  xb: number,
  y1: number,
): void {
  if (
    !e.hasTriggered ||
    e.currentPrice == null ||
    e.yCurrent == null ||
    e.xCurrent == null ||
    !Number.isFinite(e.currentPrice)
  ) {
    return;
  }

  const isLong = e.d.side !== "short";
  const inProfit = isLong ? e.currentPrice >= e.d.price : e.currentPrice <= e.d.price;
  const trackColor = inProfit ? POS_GREEN : POS_RED;

  // Entry anchor coordinate (clamped within position tool time span [xa, xb])
  const rawXEntry = e.xHitEntry ?? xa;
  const xEntry = Math.min(xb, Math.max(xa, rawXEntry));
  const yEntry = e.yHitEntry ?? y1;

  // Exit / current price coordinate (clamped within position tool time span [xa, xb])
  const xTrack = Math.min(xb, Math.max(xEntry, e.xCurrent));
  const yCurr = e.yCurrent;

  const ctx = scope.context;
  const hpr = scope.horizontalPixelRatio;

  const pEntry = toBitmap(scope, xEntry, yEntry);
  const pTrack = toBitmap(scope, xTrack, yCurr);
  const pEntryHoriz = toBitmap(scope, xTrack, yEntry);

  // 1. Subtle shaded triangle between entry horizontal baseline and diagonal trajectory
  if (Math.abs(xTrack - xEntry) > 1) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pEntry.x, pEntry.y);
    ctx.lineTo(pEntryHoriz.x, pEntryHoriz.y);
    ctx.lineTo(pTrack.x, pTrack.y);
    ctx.closePath();
    ctx.fillStyle = hexToRgba(trackColor, 0.15);
    ctx.fill();
    ctx.restore();
  }

  // 2. Dotted diagonal tracking line from when price hit entry to exit / current price
  strokeLine(scope, pEntry, pTrack, trackColor, 2, [4, 4]);

  // 3. Entry hit marker dot
  ctx.save();
  ctx.beginPath();
  ctx.arc(pEntry.x, pEntry.y, 4 * hpr, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.lineWidth = 1.5 * hpr;
  ctx.strokeStyle = trackColor;
  ctx.stroke();
  ctx.restore();

  // 4. Exit / current price marker dot
  ctx.save();
  ctx.beginPath();
  ctx.arc(pTrack.x, pTrack.y, 6.5 * hpr, 0, Math.PI * 2);
  ctx.fillStyle = hexToRgba(trackColor, 0.35);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(pTrack.x, pTrack.y, 3.5 * hpr, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.lineWidth = 1.5 * hpr;
  ctx.strokeStyle = trackColor;
  ctx.stroke();
  ctx.restore();

  // 5. Tracking P&L readout badge (Live or Closed): minimal format "closed: price [z%]"
  const pct = e.d.price !== 0 ? ((e.currentPrice - e.d.price) / e.d.price) * (isLong ? 100 : -100) : 0;
  const sign = pct >= 0 ? "+" : "";
  const statusLabel = e.trackingStatus === "CLOSED" ? "Closed" : "Live";

  const trackerLines = [
    `${statusLabel}: ${info.priceFormat(e.currentPrice)} [${sign}${pct.toFixed(2)}%]`,
  ];

  drawLiveTrackerBadge(scope, xTrack, yCurr, trackerLines, trackColor);
}

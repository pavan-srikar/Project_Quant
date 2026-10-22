import type { BitmapCoordinatesRenderingScope } from "fancy-canvas";
import type { DrawCtxInfo, ResolvedEntry } from "../types";
import {
  hexToRgba,
  strokeLine,
  toBitmap,
} from "./canvas-utils";

export const POS_GREEN = "#3179f5";
export const POS_RED = "#ec407a";


export function renderLivePositionTracker(
  scope: BitmapCoordinatesRenderingScope,
  e: ResolvedEntry,
  _info: DrawCtxInfo,
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
  const targetColor = e.d.targetColor ?? POS_GREEN;
  const stopColor = e.d.stopColor ?? POS_RED;
  const trackColor = inProfit ? targetColor : stopColor;

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
}

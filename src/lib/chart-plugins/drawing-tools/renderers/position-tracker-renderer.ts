import type { BitmapCoordinatesRenderingScope } from "fancy-canvas";
import type { DrawCtxInfo, ResolvedEntry } from "../types";
import {
  hexToRgba,
  strokeLine,
  toBitmap,
} from "./canvas-utils";

export const POS_GREEN = "#3179f5";
export const POS_RED = "#ec407a";
const POS_ARROW_COLOR = "#9884e8";

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
  const arrowColor = hexToRgba(POS_ARROW_COLOR, 0.85);

  // 1. Clean rectangular progress fill bounded to [xEntry, xTrack] x [yEntry, yCurr]
  const leftX = Math.min(xEntry, xTrack);
  const rightX = Math.max(xEntry, xTrack);
  const topY = Math.min(yEntry, yCurr);
  const botY = Math.max(yEntry, yCurr);
  if (rightX - leftX >= 1 && botY - topY >= 1) {
    const a = toBitmap(scope, leftX, topY);
    const b = toBitmap(scope, rightX, botY);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(a.x, b.y);
    ctx.closePath();
    ctx.fillStyle = hexToRgba(trackColor, 0.2);
    ctx.fill();
    ctx.restore();
  }

  // 2. TradingView-style dashed trajectory line ([4, 4]) from entry hit to exit / current price
  strokeLine(scope, pEntry, pTrack, arrowColor, 1, [4, 4]);

  // 3. Crisp TradingView-style open-chevron arrowhead at trajectory tip
  const dx = pTrack.x - pEntry.x;
  const dy = pTrack.y - pEntry.y;
  if (Math.hypot(dx, dy) >= 4 * hpr) {
    const ang = Math.atan2(dy, dx);
    const headLen = 6 * hpr;
    const spread = Math.PI / 6;
    ctx.save();
    ctx.strokeStyle = arrowColor;
    ctx.lineWidth = 1 * hpr;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(pTrack.x - headLen * Math.cos(ang - spread), pTrack.y - headLen * Math.sin(ang - spread));
    ctx.lineTo(pTrack.x, pTrack.y);
    ctx.lineTo(pTrack.x - headLen * Math.cos(ang + spread), pTrack.y - headLen * Math.sin(ang + spread));
    ctx.stroke();
    ctx.restore();
  }
}

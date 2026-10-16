import type { BitmapCoordinatesRenderingScope } from "fancy-canvas";
import type { ResolvedEntry } from "../types";
import { drawHandle, hexToRgba, showHandles, toBitmap } from "./canvas-utils";

export function renderVolumeProfile(scope: BitmapCoordinatesRenderingScope, e: ResolvedEntry): void {
  const vp = e.volumeProfile;
  if (!vp || !vp.buckets || vp.buckets.length === 0) return;
  if (vp.xStart === null) return;

  const ctx = scope.context;
  const hpr = scope.horizontalPixelRatio;
  const vpr = scope.verticalPixelRatio;

  const xStartB = Math.round(vp.xStart * hpr);
  const xEndB = vp.xEnd !== null ? Math.round(vp.xEnd * hpr) : xStartB + Math.round(160 * hpr);
  const rangeWidth = Math.max(Math.abs(xEndB - xStartB), Math.round(40 * hpr));
  // The volume bars extend across the profile range towards the right
  const maxBarWidth = Math.max(Math.round(20 * hpr), Math.round(rangeWidth * 0.82));

  // Determine top and bottom Y coordinates for boundary lines
  const validY = vp.buckets
    .flatMap((b) => [b.yTop, b.yBottom])
    .filter((y): y is number => y !== null);
  const minY = validY.length > 0 ? Math.min(...validY) : (e.y1 ?? 0);
  const maxY = validY.length > 0 ? Math.max(...validY) : (e.y2 ?? scope.bitmapSize.height);

  const bMinY = Math.round(minY * vpr);
  const bMaxY = Math.round(maxY * vpr);

  ctx.save();

  // 1. Draw left boundary line (solid vertical line at start of profile)
  ctx.strokeStyle = hexToRgba("#8892b0", 0.7);
  ctx.lineWidth = 1 * hpr;
  ctx.beginPath();
  ctx.moveTo(xStartB, bMinY);
  ctx.lineTo(xStartB, bMaxY);
  ctx.stroke();

  // 2. Draw right boundary line (subtle dashed vertical line at end of range)
  ctx.strokeStyle = hexToRgba("#8892b0", 0.45);
  ctx.setLineDash([4 * hpr, 4 * hpr]);
  ctx.beginPath();
  ctx.moveTo(xEndB, bMinY);
  ctx.lineTo(xEndB, bMaxY);
  ctx.stroke();
  ctx.setLineDash([]);

  // 3. Render Volume Profile Histogram Bars
  // Up volume in blue/slate (#5b84c4), Down volume in purple/violet (#7e60a8)
  const upColor = vp.upColor || "#5b84c4";
  const downColor = vp.downColor || "#7e60a8";

  for (const b of vp.buckets) {
    if (b.yTop === null || b.yBottom === null) continue;
    const yTopB = Math.min(b.yTop, b.yBottom) * vpr;
    const yBottomB = Math.max(b.yTop, b.yBottom) * vpr;
    const rowH = Math.max(0.75 * vpr, yBottomB - yTopB + 0.4 * vpr);

    const upW = Math.round((b.upVol / vp.maxVol) * maxBarWidth);
    const downW = Math.round((b.downVol / vp.maxVol) * maxBarWidth);

    // Keep vibrant consistent colors across all price levels (no greyed-out parts)
    const alpha = 0.85;

    // Up volume bar (starts at left boundary)
    if (upW > 0) {
      ctx.fillStyle = hexToRgba(upColor, alpha);
      ctx.fillRect(xStartB, yTopB, upW, rowH);
    }

    // Down volume bar (stacked directly next to up volume bar)
    if (downW > 0) {
      ctx.fillStyle = hexToRgba(downColor, alpha);
      ctx.fillRect(xStartB + upW, yTopB, downW, rowH);
    }
  }

  // 4. Value Area High (VAH) & Value Area Low (VAL) lines
  if (vp.vahY !== null) {
    const vahYB = Math.round(vp.vahY * vpr);
    ctx.strokeStyle = hexToRgba("#787b86", 0.65);
    ctx.lineWidth = 1 * vpr;
    ctx.setLineDash([3 * hpr, 3 * hpr]);
    ctx.beginPath();
    ctx.moveTo(xStartB, vahYB);
    ctx.lineTo(xEndB, vahYB);
    ctx.stroke();
  }
  if (vp.valY !== null) {
    const valYB = Math.round(vp.valY * vpr);
    ctx.strokeStyle = hexToRgba("#787b86", 0.65);
    ctx.lineWidth = 1 * vpr;
    ctx.setLineDash([3 * hpr, 3 * hpr]);
    ctx.beginPath();
    ctx.moveTo(xStartB, valYB);
    ctx.lineTo(xEndB, valYB);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // 5. Point of Control (POC) Line
  // Red solid horizontal line at peak volume row extending across the selected range
  if (vp.pocY !== null) {
    const pocYB = Math.round(vp.pocY * vpr);
    const pocColor = vp.pocColor || "#ea3943";

    ctx.strokeStyle = pocColor;
    ctx.lineWidth = 1.8 * vpr;
    ctx.beginPath();
    ctx.moveTo(xStartB, pocYB);
    ctx.lineTo(xEndB, pocYB);
    ctx.stroke();
  }

  ctx.restore();

  // 6. Anchor handles when hovered or selected
  if (showHandles(e)) {
    if (e.x1 !== null && e.y1 !== null) {
      drawHandle(scope, toBitmap(scope, e.x1, e.y1), e.d.color || "#2962FF");
    }
    if (e.x2 !== null && e.y2 !== null) {
      drawHandle(scope, toBitmap(scope, e.x2, e.y2), e.d.color || "#2962FF");
    }
  }
}

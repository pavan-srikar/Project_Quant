import type { BitmapCoordinatesRenderingScope } from "fancy-canvas";
import type { ResolvedEntry } from "../types";
import { showHandles, toBitmap } from "./canvas-utils";

export function textFont(d: ResolvedEntry["d"], sizePx: number): string {
  const style = d.italic ? "italic " : "";
  const weight = d.bold ? "bold " : "";
  return `${style}${weight}${Math.round(sizePx)}px sans-serif`;
}

export function renderText(scope: BitmapCoordinatesRenderingScope, e: ResolvedEntry): void {
  if (e.x1 === null || e.y1 === null) return;
  const ctx = scope.context;
  const hpr = scope.horizontalPixelRatio;
  const size = (e.d.fontSize ?? 14) * scope.verticalPixelRatio;
  const lines = (e.d.text ?? "Text").split("\n");
  const at = toBitmap(scope, e.x1, e.y1);
  const lineH = size * 1.3;
  const pad = 4 * hpr;

  ctx.save();
  ctx.font = textFont(e.d, size);
  ctx.textBaseline = "top";

  const textW = Math.max(...lines.map((l) => ctx.measureText(l).width));
  const boxW = textW + pad * 2;
  const boxH = lines.length * lineH + pad * 2;
  const bx = at.x - pad;
  const by = at.y - pad;

  if (e.d.textBg) {
    ctx.fillStyle = e.d.textBgColor ?? "#1e222d";
    ctx.fillRect(bx, by, boxW, boxH);
  }
  if (e.d.textBorder) {
    ctx.strokeStyle = e.d.textBorderColor ?? e.d.color;
    ctx.lineWidth = hpr;
    ctx.strokeRect(bx, by, boxW, boxH);
  }

  ctx.fillStyle = e.d.color;
  lines.forEach((l, i) => ctx.fillText(l, at.x, at.y + i * lineH));

  if (showHandles(e)) {
    ctx.strokeStyle = e.d.color;
    ctx.lineWidth = hpr;
    ctx.setLineDash([3 * hpr, 3 * hpr]);
    ctx.strokeRect(bx, by, boxW, boxH);
  }
  ctx.restore();
}

import type { CanvasRenderingTarget2D } from "fancy-canvas";
import type {
  AutoscaleInfo,
  Coordinate,
  ISeriesPrimitive,
  ISeriesPrimitivePaneRenderer,
  ISeriesPrimitivePaneView,
  Logical,
  SeriesAttachedParameter,
  SeriesPrimitivePaneViewZOrder,
  Time,
} from "lightweight-charts";
import { PluginBase } from "../plugin-base";
import type { PineBox, PineFill, PineLabel, PineLine, PinePolyline } from "../../pinescript/types";
import { resolvePineX } from "./pine-coord-resolver";

interface CanvasPoint { x: number; y: number; }
interface RenderablePolyline { points: CanvasPoint[]; lineColor?: string; fillColor?: string; lineWidth?: number; }
interface RenderableFillBand { topPoints: CanvasPoint[]; bottomPoints: CanvasPoint[]; color: string; }
interface RenderableBox { x1: number; y1: number; x2: number; y2: number; bgColor?: string; borderColor?: string; borderWidth?: number; }
interface RenderableLine { x1: number; y1: number; x2: number; y2: number; color?: string; width?: number; style?: "solid" | "dashed" | "dotted"; }
interface RenderableLabel { x: number; y: number; text: string; color?: string; bgColor?: string; style?: "up" | "down" | "center"; size?: string; }

class PineBgRenderer implements ISeriesPrimitivePaneRenderer {
  constructor(private _boxes: RenderableBox[], private _bands: RenderableFillBand[], private _polylines: RenderablePolyline[]) {}

  draw(target: CanvasRenderingTarget2D) {
    target.useMediaCoordinateSpace(({ context: ctx }) => {
      for (const b of this._boxes) {
        const x = Math.min(b.x1, b.x2), y = Math.min(b.y1, b.y2);
        const w = Math.max(1, Math.abs(b.x2 - b.x1)), h = Math.max(1, Math.abs(b.y2 - b.y1));
        if (b.bgColor) { ctx.fillStyle = b.bgColor; ctx.fillRect(x, y, w, h); }
        if (b.borderColor && b.borderWidth) { ctx.strokeStyle = b.borderColor; ctx.lineWidth = b.borderWidth; ctx.strokeRect(x, y, w, h); }
      }
      for (const band of this._bands) {
        if (band.topPoints.length < 2) continue;
        ctx.beginPath();
        ctx.moveTo(band.topPoints[0]!.x, band.topPoints[0]!.y);
        for (let i = 1; i < band.topPoints.length; i++) ctx.lineTo(band.topPoints[i]!.x, band.topPoints[i]!.y);
        for (let i = band.bottomPoints.length - 1; i >= 0; i--) ctx.lineTo(band.bottomPoints[i]!.x, band.bottomPoints[i]!.y);
        ctx.closePath();
        ctx.fillStyle = band.color;
        ctx.fill();
      }
      for (const poly of this._polylines) {
        if (!poly.fillColor || poly.points.length < 2) continue;
        ctx.beginPath();
        ctx.moveTo(poly.points[0]!.x, poly.points[0]!.y);
        for (let i = 1; i < poly.points.length; i++) ctx.lineTo(poly.points[i]!.x, poly.points[i]!.y);
        ctx.closePath();
        ctx.fillStyle = poly.fillColor;
        ctx.fill();
      }
    });
  }
}

class PineFgRenderer implements ISeriesPrimitivePaneRenderer {
  constructor(private _lines: RenderableLine[], private _polylines: RenderablePolyline[], private _labels: RenderableLabel[]) {}

  draw(target: CanvasRenderingTarget2D) {
    target.useMediaCoordinateSpace(({ context: ctx }) => {
      for (const poly of this._polylines) {
        if (!poly.lineColor || poly.points.length < 2) continue;
        ctx.beginPath();
        ctx.moveTo(poly.points[0]!.x, poly.points[0]!.y);
        for (let i = 1; i < poly.points.length; i++) ctx.lineTo(poly.points[i]!.x, poly.points[i]!.y);
        ctx.strokeStyle = poly.lineColor;
        ctx.lineWidth = poly.lineWidth ?? 1.5;
        ctx.stroke();
      }
      for (const l of this._lines) {
        if (!l.color) continue;
        ctx.beginPath(); ctx.moveTo(l.x1, l.y1); ctx.lineTo(l.x2, l.y2);
        ctx.strokeStyle = l.color; ctx.lineWidth = l.width ?? 1;
        ctx.setLineDash(l.style === "dashed" ? [4, 4] : l.style === "dotted" ? [2, 3] : []);
        ctx.stroke(); ctx.setLineDash([]);
      }
      if (this._labels.length > 0) {
        ctx.textAlign = "center";
        let curFont = "";
        for (const lbl of this._labels) {
          const sz = lbl.size === "tiny" ? 9 : lbl.size === "small" ? 10 : lbl.size === "large" ? 13 : lbl.size === "huge" ? 16 : 11;
          const targetFont = `600 ${sz}px -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, sans-serif`;
          if (curFont !== targetFont) { ctx.font = targetFont; curFont = targetFont; }
          const textLines = String(lbl.text || "").split("\n");
          const lh = sz + 3;
          let maxChars = 0;
          for (const tl of textLines) { if (tl.length > maxChars) maxChars = tl.length; }
          const pw = Math.max(16, Math.round(maxChars * sz * 0.62) + 8), ph = textLines.length * lh + 4;
          const yOff = lbl.style === "down" ? -6 : lbl.style === "up" ? 6 : 0;
          const y = lbl.y + yOff;
          const px = lbl.x - pw / 2, py = lbl.style === "down" ? y - ph + 2 : lbl.style === "up" ? y - 2 : y - ph / 2;

          if (lbl.bgColor) {
            ctx.fillStyle = lbl.bgColor;
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(px, py, pw, ph, 3); else ctx.fillRect(px, py, pw, ph);
            ctx.fill();
            if (lbl.style === "down") {
              ctx.beginPath(); ctx.moveTo(lbl.x - 4, py + ph); ctx.lineTo(lbl.x + 4, py + ph); ctx.lineTo(lbl.x, py + ph + 4); ctx.fill();
            } else if (lbl.style === "up") {
              ctx.beginPath(); ctx.moveTo(lbl.x - 4, py); ctx.lineTo(lbl.x + 4, py); ctx.lineTo(lbl.x, py - 4); ctx.fill();
            }
            ctx.textBaseline = "middle";
            ctx.fillStyle = lbl.color || "#ffffff";
            for (let li = 0; li < textLines.length; li++) {
              ctx.fillText(textLines[li]!, lbl.x, py + 2 + li * lh + lh / 2);
            }
          } else {
            ctx.textBaseline = "middle";
            ctx.fillStyle = lbl.color || "#b2b5be";
            for (let li = 0; li < textLines.length; li++) {
              ctx.fillText(textLines[li]!, lbl.x, py + 2 + li * lh + lh / 2);
            }
          }
        }
      }
    });
  }
}

class PineRendererBgPaneView implements ISeriesPrimitivePaneView {
  private _boxes: RenderableBox[] = [];
  private _bands: RenderableFillBand[] = [];
  private _polylines: RenderablePolyline[] = [];

  constructor(private _source: PineRendererPrimitive) {}

  update() {
    this._boxes = []; this._bands = []; this._polylines = [];
    try {
      const chart = this._source.chart, series = this._source.series;
      if (!chart || !series) return;
      const ts = chart.timeScale();
      const lr = ts.getVisibleLogicalRange();
      const minBar = lr ? Math.floor(lr.from) - 5 : -Infinity;
      const maxBar = lr ? Math.ceil(lr.to) + 5 : Infinity;

      const c0 = ts.logicalToCoordinate(0 as Logical), c1 = ts.logicalToCoordinate(1 as Logical);
      const halfBar = Math.max(2, (c0 !== null && c1 !== null ? Math.abs(c1 - c0) : 6) * 0.45);

      for (const b of this._source.boxes) {
        if (b.left < 100_000 && b.right < 100_000) {
          const bMin = Math.min(b.left, b.right), bMax = Math.max(b.left, b.right);
          if (bMax < minBar || bMin > maxBar) continue;
        }
        let lx1 = resolvePineX(ts, series, b.left);
        let lx2 = resolvePineX(ts, series, b.right);
        if (lx1 === null && lx2 !== null) lx1 = (lx2 - (b.right - b.left) * (halfBar * 2)) as Coordinate;
        if (lx2 === null && lx1 !== null) lx2 = (lx1 + (b.right - b.left) * (halfBar * 2)) as Coordinate;
        const y1 = series.priceToCoordinate(b.top), y2 = series.priceToCoordinate(b.bottom);
        if (lx1 !== null && lx2 !== null && y1 !== null && y2 !== null) {
          if (Math.max(lx1, lx2) < -100 || Math.min(lx1, lx2) > 2500) continue;
          const pad = b.id.startsWith("cdl_") ? halfBar * 0.7 : halfBar;
          this._boxes.push({ x1: Math.min(lx1, lx2) - pad, y1, x2: Math.max(lx1, lx2) + pad, y2, bgColor: b.bgColor, borderColor: b.borderColor, borderWidth: b.borderWidth });
        }
      }
      for (const fill of this._source.fills) {
        if (!fill.points?.length) continue;
        let band: RenderableFillBand | null = null;
        for (const pt of fill.points) {
          const ptIdx = (pt as any).index;
          if (ptIdx !== undefined && (ptIdx < minBar - 5 || ptIdx > maxBar + 5)) continue;
          const x = ts.timeToCoordinate(pt.time as Time);
          if (x === null) continue;
          const yTop = series.priceToCoordinate(pt.top), yBottom = series.priceToCoordinate(pt.bottom);
          if (yTop === null || yBottom === null) continue;
          const col = pt.color || fill.topColor || "rgba(8, 153, 129, 0.25)";
          if (!band || band.color !== col) {
            if (band && band.topPoints.length >= 2) this._bands.push(band);
            band = { topPoints: [], bottomPoints: [], color: col };
          }
          band.topPoints.push({ x, y: yTop }); band.bottomPoints.push({ x, y: yBottom });
        }
        if (band && band.topPoints.length >= 2) this._bands.push(band);
      }
      for (const poly of this._source.polylines) {
        if (!poly.fillColor || poly.points.length < 3) continue;
        let minIdx = Infinity, maxIdx = -Infinity;
        for (const pt of poly.points) {
          if (pt.index < minIdx) minIdx = pt.index;
          if (pt.index > maxIdx) maxIdx = pt.index;
        }
        if (maxIdx < minBar - 50 || minIdx > maxBar + 50) continue;
        const pts: CanvasPoint[] = [];
        for (const pt of poly.points) {
          const x = ts.logicalToCoordinate(pt.index as Logical), y = series.priceToCoordinate(pt.price);
          if (x !== null && y !== null && !isNaN(x) && !isNaN(y)) pts.push({ x, y });
        }
        if (pts.length >= 3) this._polylines.push({ points: pts, fillColor: poly.fillColor });
      }
    } catch {}
  }

  renderer() { return new PineBgRenderer(this._boxes, this._bands, this._polylines); }
  zOrder(): SeriesPrimitivePaneViewZOrder { return "bottom"; }
}

class PineRendererFgPaneView implements ISeriesPrimitivePaneView {
  private _lines: RenderableLine[] = [];
  private _polylines: RenderablePolyline[] = [];
  private _labels: RenderableLabel[] = [];

  constructor(private _source: PineRendererPrimitive) {}

  update() {
    this._lines = []; this._polylines = []; this._labels = [];
    try {
      const chart = this._source.chart, series = this._source.series;
      if (!chart || !series) return;
      const ts = chart.timeScale();
      const lr = ts.getVisibleLogicalRange();
      const minBar = lr ? Math.floor(lr.from) - 10 : -Infinity;
      const maxBar = lr ? Math.ceil(lr.to) + 10 : Infinity;

      for (const l of this._source.lines) {
        if (l.x1 < 100_000 && l.x2 < 100_000) {
          const lMin = Math.min(l.x1, l.x2), lMax = Math.max(l.x1, l.x2);
          if (lMax < minBar || lMin > maxBar) continue;
        }
        let x1 = resolvePineX(ts, series, l.x1), x2 = resolvePineX(ts, series, l.x2);
        if (x1 === null && x2 !== null) x1 = (x2 - (l.x2 - l.x1) * 8) as Coordinate;
        if (x2 === null && x1 !== null) x2 = (x1 + (l.x2 - l.x1) * 8) as Coordinate;
        const y1 = series.priceToCoordinate(l.y1), y2 = series.priceToCoordinate(l.y2);
        if (x1 !== null && x2 !== null && y1 !== null && y2 !== null) {
          if (Math.max(x1, x2) >= -100 && Math.min(x1, x2) <= 2500) {
            this._lines.push({ x1, y1, x2, y2, color: l.color, width: l.width, style: l.style });
          }
        }
      }
      for (const poly of this._source.polylines) {
        if (!poly.lineColor || poly.points.length < 2) continue;
        const pts: CanvasPoint[] = [];
        for (const pt of poly.points) {
          const x = resolvePineX(ts, series, pt.index), y = series.priceToCoordinate(pt.price);
          if (x !== null && y !== null && !isNaN(x) && !isNaN(y)) pts.push({ x, y });
        }
        if (pts.length >= 2) this._polylines.push({ points: pts, lineColor: poly.lineColor, lineWidth: poly.lineWidth });
      }
      const maxW = (ts.width?.() || 2000) + 100;
      for (let i = this._source.labels.length - 1; i >= 0; i--) {
        const lbl = this._source.labels[i]!;
        if (lbl.x < 100_000 && (lbl.x < minBar || lbl.x > maxBar)) continue;
        const x = resolvePineX(ts, series, lbl.x), y = series.priceToCoordinate(lbl.y);
        if (x !== null && y !== null && !isNaN(x) && !isNaN(y)) {
          if (x >= -100 && x <= maxW) {
            this._labels.push({ x, y, text: lbl.text, color: lbl.color, bgColor: lbl.bgColor, style: lbl.style, size: lbl.size });
            if (this._labels.length >= 100) break;
          }
        }
      }
    } catch {}
  }

  renderer() { return new PineFgRenderer(this._lines, this._polylines, this._labels); }
  zOrder(): SeriesPrimitivePaneViewZOrder { return "normal"; }
}

export class PineRendererPrimitive extends PluginBase implements ISeriesPrimitive<Time> {
  private _paneViews: [PineRendererBgPaneView, PineRendererFgPaneView];
  public polylines: PinePolyline[] = [];
  public fills: PineFill[] = [];
  public boxes: PineBox[] = [];
  public lines: PineLine[] = [];
  public labels: PineLabel[] = [];

  constructor() {
    super();
    this._paneViews = [new PineRendererBgPaneView(this), new PineRendererFgPaneView(this)];
  }

  public updateData(polylines: PinePolyline[] = [], fills: PineFill[] = [], boxes: PineBox[] = [], lines: PineLine[] = [], labels: PineLabel[] = []) {
    if (this.polylines === polylines && this.fills === fills && this.boxes === boxes && this.lines === lines && this.labels === labels) return;
    this.polylines = polylines; this.fills = fills; this.boxes = boxes; this.lines = lines; this.labels = labels;
    this.updateAllViews();
    this.requestUpdate();
  }

  public updateAllViews() { this._paneViews.forEach((pw) => pw.update()); }
  public paneViews() { return this._paneViews; }

  public autoscaleInfo(_startTimePoint: Logical, _endTimePoint: Logical): AutoscaleInfo | null {
    return null;
  }

  public attached(p: SeriesAttachedParameter<Time>): void {
    super.attached(p);
    this.updateAllViews();
  }

  protected dataUpdated(): void {
    this.updateAllViews();
  }
}

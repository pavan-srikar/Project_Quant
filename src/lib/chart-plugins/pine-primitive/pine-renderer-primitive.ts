import type { CanvasRenderingTarget2D } from "fancy-canvas";
import type {
  AutoscaleInfo,
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
        for (const lbl of this._labels) {
          const sz = lbl.size === "tiny" ? 9 : lbl.size === "small" ? 10 : lbl.size === "large" ? 13 : lbl.size === "huge" ? 16 : 11;
          ctx.font = `600 ${sz}px -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, sans-serif`;
          const yOff = lbl.style === "down" ? -6 : lbl.style === "up" ? 6 : 0;
          const y = lbl.y + yOff;
          if (lbl.bgColor) {
            const tm = ctx.measureText(lbl.text);
            const pw = Math.max(16, tm.width + 8), ph = sz + 6;
            const px = lbl.x - pw / 2, py = lbl.style === "down" ? y - ph + 2 : lbl.style === "up" ? y - 2 : y - ph / 2;
            ctx.fillStyle = lbl.bgColor;
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(px, py, pw, ph, 3); else ctx.fillRect(px, py, pw, ph);
            ctx.fill();
            ctx.textBaseline = "middle";
            ctx.fillStyle = lbl.color || "#ffffff";
            ctx.fillText(lbl.text, lbl.x, py + ph / 2);
          } else {
            ctx.textBaseline = lbl.style === "down" ? "bottom" : lbl.style === "up" ? "top" : "middle";
            ctx.fillStyle = lbl.color || "#b2b5be";
            ctx.fillText(lbl.text, lbl.x, y);
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
      const c0 = ts.logicalToCoordinate(0 as Logical), c1 = ts.logicalToCoordinate(1 as Logical);
      const halfBar = Math.max(2, (c0 !== null && c1 !== null ? Math.abs(c1 - c0) : 6) * 0.45);

      for (const b of this._source.boxes) {
        const lx1 = ts.logicalToCoordinate(b.left as Logical), lx2 = ts.logicalToCoordinate(b.right as Logical);
        const y1 = series.priceToCoordinate(b.top), y2 = series.priceToCoordinate(b.bottom);
        if (lx1 !== null && lx2 !== null && y1 !== null && y2 !== null) {
          this._boxes.push({ x1: Math.min(lx1, lx2) - halfBar, y1, x2: Math.max(lx1, lx2) + halfBar, y2, bgColor: b.bgColor, borderColor: b.borderColor, borderWidth: b.borderWidth });
        }
      }
      for (const fill of this._source.fills) {
        if (!fill.points?.length) continue;
        let band: RenderableFillBand | null = null;
        for (const pt of fill.points) {
          const x = ts.timeToCoordinate(pt.time as Time), yTop = series.priceToCoordinate(pt.top), yBottom = series.priceToCoordinate(pt.bottom);
          if (x === null || yTop === null || yBottom === null) continue;
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
        if (!poly.fillColor) continue;
        const pts: CanvasPoint[] = [];
        for (const pt of poly.points) {
          const x = ts.logicalToCoordinate(pt.index as Logical), y = series.priceToCoordinate(pt.price);
          if (x !== null && y !== null && !isNaN(x) && !isNaN(y)) pts.push({ x, y });
        }
        if (pts.length >= 2) this._polylines.push({ points: pts, fillColor: poly.fillColor });
      }
    } catch {}
  }

  renderer() { this.update(); return new PineBgRenderer(this._boxes, this._bands, this._polylines); }
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

      for (const l of this._source.lines) {
        const x1 = ts.logicalToCoordinate(l.x1 as Logical), x2 = ts.logicalToCoordinate(l.x2 as Logical);
        const y1 = series.priceToCoordinate(l.y1), y2 = series.priceToCoordinate(l.y2);
        if (x1 !== null && x2 !== null && y1 !== null && y2 !== null) {
          this._lines.push({ x1, y1, x2, y2, color: l.color, width: l.width, style: l.style });
        }
      }
      for (const poly of this._source.polylines) {
        if (!poly.lineColor) continue;
        const pts: CanvasPoint[] = [];
        for (const pt of poly.points) {
          const x = ts.logicalToCoordinate(pt.index as Logical), y = series.priceToCoordinate(pt.price);
          if (x !== null && y !== null && !isNaN(x) && !isNaN(y)) pts.push({ x, y });
        }
        if (pts.length >= 2) this._polylines.push({ points: pts, lineColor: poly.lineColor, lineWidth: poly.lineWidth });
      }
      for (const lbl of this._source.labels) {
        const x = ts.logicalToCoordinate(lbl.x as Logical), y = series.priceToCoordinate(lbl.y);
        if (x !== null && y !== null && !isNaN(x) && !isNaN(y)) {
          this._labels.push({ x, y, text: lbl.text, color: lbl.color, bgColor: lbl.bgColor, style: lbl.style, size: lbl.size });
        }
      }
    } catch {}
  }

  renderer() { this.update(); return new PineFgRenderer(this._lines, this._polylines, this._labels); }
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
    this.polylines = polylines; this.fills = fills; this.boxes = boxes; this.lines = lines; this.labels = labels;
    this.updateAllViews();
    this.requestUpdate();
  }

  public updateAllViews() { this._paneViews.forEach((pw) => pw.update()); }
  public paneViews() { return this._paneViews; }

  public autoscaleInfo(startTimePoint: Logical, endTimePoint: Logical): AutoscaleInfo | null {
    if (!this.polylines?.length) return null;
    let minPrice = Infinity, maxPrice = -Infinity;
    for (const poly of this.polylines) {
      for (const pt of poly.points) {
        if (pt.index >= startTimePoint && pt.index <= endTimePoint) {
          if (pt.price < minPrice) minPrice = pt.price;
          if (pt.price > maxPrice) maxPrice = pt.price;
        }
      }
    }
    if (minPrice === Infinity || maxPrice === -Infinity) return null;
    return { priceRange: { minValue: minPrice, maxValue: maxPrice } };
  }

  public attached(p: SeriesAttachedParameter<Time>): void {
    super.attached(p);
    this.updateAllViews();
  }

  protected dataUpdated(): void {
    this.updateAllViews();
    this.requestUpdate();
  }
}

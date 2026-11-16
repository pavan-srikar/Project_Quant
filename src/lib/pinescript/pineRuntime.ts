import type { CandleData } from "../indicators/types";
import type { PineBox, PineLine, PineLabel, PinePolyline } from "./types";
import {
  seriesPivotHigh,
  seriesPivotLow,
} from "./mathFunctions";

export function formatVolume(vol: number): string {
  if (!vol || isNaN(vol)) return "";
  if (vol >= 1_000_000_000) return (vol / 1_000_000_000).toFixed(3).replace(/\.?0+$/, "") + "B";
  if (vol >= 1_000_000) return (vol / 1_000_000).toFixed(3).replace(/\.?0+$/, "") + "M";
  if (vol >= 1_000) return (vol / 1_000).toFixed(3).replace(/\.?0+$/, "") + "K";
  return vol.toFixed(0);
}

export class PineDrawingHeap {
  public boxes = new Map<string, PineBox>();
  public lines = new Map<string, PineLine>();
  public labels = new Map<string, PineLabel>();
  public polylines = new Map<string, PinePolyline>();
  private _nextId = 1;

  public newBox(left: number, top: number, right: number, bottom: number, opts: Partial<PineBox> = {}): string {
    const id = `bx_${this._nextId++}`;
    this.boxes.set(id, { id, left, top, right, bottom, ...opts });
    return id;
  }

  public setBox(id: string, updates: Partial<PineBox>) {
    const b = this.boxes.get(id);
    if (b) Object.assign(b, updates);
  }

  public deleteBox(id: string) {
    this.boxes.delete(id);
  }

  public newLine(x1: number, y1: number, x2: number, y2: number, opts: Partial<PineLine> = {}): string {
    const id = `ln_${this._nextId++}`;
    this.lines.set(id, { id, x1, y1, x2, y2, ...opts });
    return id;
  }

  public setLine(id: string, updates: Partial<PineLine>) {
    const l = this.lines.get(id);
    if (l) Object.assign(l, updates);
  }

  public deleteLine(id: string) {
    this.lines.delete(id);
  }

  public newLabel(x: number, y: number, text: string, opts: Partial<PineLabel> = {}): string {
    const id = `lbl_${this._nextId++}`;
    this.labels.set(id, { id, x, y, text, ...opts });
    return id;
  }

  public setLabel(id: string, updates: Partial<PineLabel>) {
    const lbl = this.labels.get(id);
    if (lbl) Object.assign(lbl, updates);
  }

  public deleteLabel(id: string) {
    this.labels.delete(id);
  }
}

export function buildSeriesCache(candles: CandleData[]) {
  const close = candles.map((c) => c.close);
  const high = candles.map((c) => c.high);
  const low = candles.map((c) => c.low);
  const open = candles.map((c) => c.open);
  const volume = candles.map((c) => c.volume ?? 0);

  const pivotHighCache = new Map<string, (number | null)[]>();
  const pivotLowCache = new Map<string, (number | null)[]>();

  return {
    getPivotHigh(left: number, right: number): (number | null)[] {
      const key = `${left}_${right}`;
      let cached = pivotHighCache.get(key);
      if (!cached) {
        cached = seriesPivotHigh(high, left, right);
        pivotHighCache.set(key, cached);
      }
      return cached;
    },
    getPivotLow(left: number, right: number): (number | null)[] {
      const key = `${left}_${right}`;
      let cached = pivotLowCache.get(key);
      if (!cached) {
        cached = seriesPivotLow(low, left, right);
        pivotLowCache.set(key, cached);
      }
      return cached;
    },
    close,
    high,
    low,
    open,
    volume,
  };
}

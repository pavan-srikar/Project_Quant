import type { DrawingLine, DrawingTool } from "../../../pages/trading/constants";

/** A point in chart data space (unix-seconds time + price). */
export interface DataPoint {
  time: number;
  price: number;
}

export type EntryState = "normal" | "hovered" | "selected" | "preview";

/** A fibonacci retracement level resolved to pixel space. */
export interface ResolvedFibLevel {
  level: number;
  price: number;
  y: number | null;
  color: string;
  label: string;
}

/** A single price row / bucket in a Fixed Range Volume Profile. */
export interface VolumeProfileBucket {
  priceLow: number;
  priceHigh: number;
  priceCenter: number;
  yTop: number | null;
  yBottom: number | null;
  upVol: number;
  downVol: number;
  totalVol: number;
  isPoc: boolean;
  isValueArea: boolean;
}

/** Complete resolved state of a Fixed Range Volume Profile. */
export interface ResolvedVolumeProfile {
  buckets: VolumeProfileBucket[];
  maxVol: number;
  pocPrice: number;
  pocY: number | null;
  vahPrice: number;
  vahY: number | null;
  valPrice: number;
  valY: number | null;
  totalVol: number;
  xStart: number | null;
  xEnd: number | null;
  upColor: string;
  downColor: string;
  pocColor: string;
}

/** A drawing with its anchor points resolved to pane pixel coordinates. */
export interface ResolvedEntry {
  d: DrawingLine;
  x1: number | null;
  y1: number | null;
  x2: number | null;
  y2: number | null;
  /**
   * The segment actually drawn/hit for trendlines — differs from the anchors
   * when extendLeft/extendRight stretch the line to the pane edges.
   */
  seg?: { x1: number; y1: number; x2: number; y2: number };
  fibLevels?: ResolvedFibLevel[];
  /** Trendline Δprice/%/bars readout, present while selected or previewing. */
  stats?: string[];
  /** Position tool: stop / target price rows resolved to pixel y. */
  yStop?: number | null;
  yTarget?: number | null;
  /** Live position tracking: entry point, latest series candle coordinates & price. */
  hasTriggered?: boolean;
  entryHitTime?: number | null;
  xHitEntry?: number | null;
  yHitEntry?: number | null;
  xCurrent?: number | null;
  yCurrent?: number | null;
  currentPrice?: number | null;
  trackingStatus?: "ACTIVE" | "CLOSED";
  /** Third anchor (parallel channel offset line). */
  x3?: number | null;
  y3?: number | null;
  /** Fixed Range Volume Profile calculated buckets and levels. */
  volumeProfile?: ResolvedVolumeProfile;
  state: EntryState;
  isHovered?: boolean;
}

/** Account context the position tool needs for $-risk / size readouts. */
export interface DrawCtxInfo {
  accountEquity: number;
  priceFormat: (price: number) => string;
}

export type TimeKey = "time" | "time2" | "time3";
export type PriceKey = "price" | "price2" | "price3" | "stopPrice" | "targetPrice";

/**
 * Where a hit landed on a drawing: a draggable anchor point (which may move
 * only one axis, e.g. a horizontal line's price) or the drawing body.
 */
export type HitRegion =
  | { kind: "point"; timeKey: TimeKey | null; priceKey: PriceKey | null }
  | { kind: "body" };

export interface Hit {
  id: string;
  region: HitRegion;
}

export interface DrawingCallbacks {
  onAdd: (d: DrawingLine) => void;
  onUpdate: (d: DrawingLine) => void;
  onRemove: (id: string) => void;
  /** Fired when a tool finishes (drawing committed or cancelled via Escape). */
  onToolFinished: () => void;
  /** Selection changed (click select, multi-select, deselect, delete). */
  onSelectionChange?: (ids: string[]) => void;
  /** Double-click on a drawing — open its settings dialog. */
  onRequestSettings?: (id: string) => void;
  /** Right-click on a drawing — open a context menu at the given client coords. */
  onContextMenu?: (id: string, clientX: number, clientY: number) => void;
  /** Alt+T/H/F/R shortcut pressed — arm the given tool. */
  onSelectTool?: (tool: DrawingTool) => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

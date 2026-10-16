import type { IChartApi, ISeriesApi, SeriesType } from "lightweight-charts";
import type {
  DrawingLine,
  DrawingTool,
  MagnetMode,
} from "../../../pages/trading/constants";
import { DrawingsPrimitive } from "./drawings-primitive";
import type { Pt } from "./geometry";
import { makeResolveCtx, type ResolveCtx, resolveEntry, xToTime } from "./resolve";
import type { DataPoint, DrawingCallbacks, ResolvedEntry } from "./types";
import { LongPressTracker } from "./touch";
import { makeNew } from "./factories";
import { getPlacementAnchorPx, resolveDataPoint } from "./snapping";
import { PlacementController } from "./placement-controller";
import { DragSession } from "./drag-session";
import { SelectionManager } from "./selection-manager";
import { KeyboardManager } from "./keyboard-manager";
import { PointerManager } from "./pointer-manager";

export * from "./touch";
export * from "./factories";
export * from "./magnet";
export * from "./shortcuts";
export * from "./drag-controller";
export * from "./cursor";
export * from "./snapping";
export * from "./clipboard-nudge";
export * from "./placement-controller";
export * from "./drag-session";
export * from "./selection-manager";
export * from "./keyboard-manager";
export * from "./pointer-manager";

export interface DrawingToolsManagerOptions {
  chart: IChartApi;
  series: ISeriesApi<SeriesType>;
  container: HTMLElement;
  /** Chart timeframe interval in seconds — used for whitespace extrapolation. */
  intervalSec: number;
  /** Current timeframe label, stamped on new drawings as createdTf. */
  timeframe: string;
  /** Account equity — drives the position tool's $-risk / size readout. */
  accountEquity?: number;
  /** Function providing authoritative candle bars with volume for tools like volume profile. */
  getCandles?: () => readonly any[];
  callbacks: DrawingCallbacks;
}

/**
 * TradingView-style interaction layer for chart drawings.
 *
 * Coordinates drawing placement, selection, drag-and-drop editing, keyboard shortcuts,
 * and touch gestures across Lightweight Charts primitives.
 */
export class DrawingToolsManager {
  private readonly chart: IChartApi;
  private readonly series: ISeriesApi<SeriesType>;
  private readonly container: HTMLElement;
  private readonly cb: DrawingCallbacks;
  private readonly primitive: DrawingsPrimitive;
  private readonly longPress = new LongPressTracker();
  private readonly placement: PlacementController;
  private readonly selection: SelectionManager;
  private readonly dragSession: DragSession;
  private readonly keyboard: KeyboardManager;
  private readonly pointer: PointerManager;

  private intervalSec: number;
  private timeframe: string;
  private tool: DrawingTool = "none";
  private drawings: DrawingLine[] = [];
  private magnetMode: MagnetMode = "none";
  private stayInMode = false;
  private styleDefaults: Record<string, Partial<DrawingLine>> = {};
  private getCandlesFn?: () => readonly any[];

  constructor(opts: DrawingToolsManagerOptions) {
    this.chart = opts.chart;
    this.series = opts.series;
    this.container = opts.container;
    this.cb = opts.callbacks;
    this.intervalSec = opts.intervalSec;
    this.timeframe = opts.timeframe;
    this.getCandlesFn = opts.getCandles;
    this.primitive = new DrawingsPrimitive();
    if (opts.getCandles) {
      this.primitive.setGetCandles(opts.getCandles);
    }
    this.primitive.setIntervalSec(opts.intervalSec);
    this.primitive.setAccountEquity(opts.accountEquity ?? 0);
    this.series.attachPrimitive(this.primitive);

    this.placement = new PlacementController(
      this.primitive,
      this.makeNewDrawing,
      this.pointFor,
      this.placementAnchorPx,
      this.onPlacementCommitted,
      this.onMeasureFinished,
    );

    this.selection = new SelectionManager({
      container: this.container,
      primitive: this.primitive,
      cb: this.cb,
      getTool: () => this.tool,
      resolveAll: () => this.resolveAll(),
      onBeginDrag: (hit, pos, entries, isTouch) => {
        this.dragSession.begin(hit, pos, entries, this.selection.selected, isTouch);
      },
    });

    this.dragSession = new DragSession({
      series: this.series,
      toPoint: this.toPoint,
      primitive: this.primitive,
      cb: this.cb,
      setCursor: (c) => this.selection.applyCursor(c),
      pointFor: this.pointFor,
      getDrawings: () => this.drawings,
      setDrawings: (d) => {
        this.drawings = d;
      },
    });

    this.keyboard = new KeyboardManager({
      cb: this.cb,
      getDrawings: () => this.drawings,
      setDrawings: (d) => {
        this.drawings = d;
      },
      getSelectedIds: () => this.selection.selected,
      select: (ids) => this.selection.select(ids),
      removeSelected: () => this.removeSelected(),
      onEscape: () => this.handleEscape(),
      isDragging: () => this.dragSession.isDragging,
      getIntervalSec: () => this.intervalSec,
      primitive: this.primitive,
      series: this.series,
      toPoint: this.toPoint,
      resolveAll: () => this.resolveAll(),
    });

    this.pointer = new PointerManager({
      container: this.container,
      chart: this.chart,
      placement: this.placement,
      selection: this.selection,
      dragSession: this.dragSession,
      longPress: this.longPress,
      getTool: () => this.tool,
      resolveAll: () => this.resolveAll(),
      cb: this.cb,
    });

    window.addEventListener("keydown", this.keyboard.handleKeyDown);
  }

  destroy(): void {
    this.longPress.clear();
    this.pointer.destroy();
    window.removeEventListener("keydown", this.keyboard.handleKeyDown);
    try {
      this.series.detachPrimitive(this.primitive);
    } catch {
      /* chart already removed */
    }
    this.container.style.cursor = "";
  }

  setTool(tool: DrawingTool): void {
    if (this.tool === tool) return;
    this.tool = tool;
    this.placement.cancel();
    this.selection.applyCursor(null);
  }

  setMagnetMode(mode: MagnetMode): void {
    this.magnetMode = mode;
  }

  setStyleDefaults(defaults: Record<string, Partial<DrawingLine>>): void {
    this.styleDefaults = defaults;
  }

  setStayInDrawingMode(enabled: boolean): void {
    this.stayInMode = enabled;
  }

  setAccountEquity(equity: number): void {
    this.primitive.setAccountEquity(equity);
  }

  updateTimeframe(timeframe: string, intervalSec: number): void {
    this.timeframe = timeframe;
    this.intervalSec = intervalSec;
    this.primitive.setIntervalSec(intervalSec);
  }

  setSelection(ids: string[]): void {
    this.selection.select(ids.filter((id) => this.drawings.some((d) => d.id === id)));
  }

  setDrawings(drawings: DrawingLine[]): void {
    if (this.dragSession.isDragging) return;
    this.drawings = drawings.map((d) => ({ ...d }));
    this.selection.prune(this.drawings);
    this.primitive.setDrawings(this.drawings);
  }

  setGetCandles(fn?: () => readonly any[]): void {
    this.getCandlesFn = fn;
    this.primitive.setGetCandles(fn);
  }

  private ctx(): ResolveCtx {
    return makeResolveCtx(this.chart, this.series, this.intervalSec, this.getCandlesFn);
  }

  private toPoint = (p: Pt): DataPoint | null => {
    const time = xToTime(this.ctx(), p.x);
    const price = this.series.coordinateToPrice(p.y);
    if (time === null || price === null) return null;
    return { time, price };
  };

  private resolveAll = (): ResolvedEntry[] => {
    return this.drawings.map((d) => resolveEntry(d, this.ctx(), "normal"));
  };

  private makeNewDrawing = (tool: DrawingTool, p1: DataPoint, p2: DataPoint): DrawingLine => {
    return makeNew(tool, p1, p2, this.timeframe, this.intervalSec, this.styleDefaults);
  };

  private pointFor = (pos: Pt, shiftKey: boolean, angleAnchor: Pt | null): DataPoint | null => {
    return resolveDataPoint(
      this.series,
      this.toPoint,
      this.resolveAll(),
      [...this.selection.selected],
      this.magnetMode,
      pos,
      shiftKey,
      angleAnchor,
    );
  };

  private placementAnchorPx = (): Pt | null => {
    return getPlacementAnchorPx(this.ctx(), this.series, this.tool, this.placement.placingP1);
  };

  private onPlacementCommitted = (d: DrawingLine): void => {
    this.drawings = [...this.drawings, d];
    this.primitive.setDrawings(this.drawings);
    this.cb.onAdd({ ...d });
    if (this.stayInMode && this.tool !== "none") return;
    this.selection.select([d.id]);
    this.tool = "none";
    this.selection.applyCursor(null);
    this.cb.onToolFinished();
  };

  private onMeasureFinished = (): void => {
    this.tool = "none";
    this.selection.applyCursor(null);
    this.cb.onToolFinished();
  };

  private handleEscape(): void {
    this.placement.clearMeasure();
    if (this.tool !== "none") {
      this.tool = "none";
      this.placement.cancel();
      this.selection.applyCursor(null);
      this.cb.onToolFinished();
      return;
    }
    this.selection.clear();
  }

  private removeSelected(): void {
    const ids = [...this.selection.selected];
    this.selection.clear();
    this.drawings = this.drawings.filter((d) => !ids.includes(d.id));
    this.primitive.setDrawings(this.drawings);
    for (const id of ids) this.cb.onRemove(id);
  }
}

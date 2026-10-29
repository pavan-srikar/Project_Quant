import type { useQueryClient } from "@tanstack/react-query";
import type {
  CandlestickData,
  IChartApi,
  IPriceLine,
  ISeriesApi,
  ISeriesPrimitive,
  Time,
} from "lightweight-charts";
import type { Dispatch, RefObject, SetStateAction } from "react";
import type { useChartPreferences } from "../../../hooks/useChartPreferences.ts";
import type { DrawingToolsManager } from "../../../lib/chart-plugins/drawing-tools/manager.ts";
import type { IndicatorType } from "../../../lib/indicators.ts";
import type { Candle, Order, Position, Symbol } from "../../../services/schemas.ts";
import type {
  CHART_COLORS,
  DrawingLine,
  DrawingTool,
  MagnetMode,
  Timeframe,
} from "../constants.ts";

export type ChartColors = (typeof CHART_COLORS)["dark"];
export type Ref<T> = { current: T };

export interface LiveCandleData {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
  takerBuyVolume?: number;
  delta?: number;
}

export interface TickData {
  bid: number;
  ask: number;
  timestamp: number;
}

export interface OhlcvLegend {
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  change: number;
  delta?: number;
}

export interface RtCtx {
  series: ISeriesApi<"Candlestick">;
  volume: ISeriesApi<"Histogram"> | null;
  lastCandle: Ref<CandlestickData<Time> | null>;
  lastLoadKey: Ref<string>;
  liveCandleTs: Ref<number>;
  legendVol: Ref<number>;
  gapAt: Ref<number>;
  bidLine: Ref<IPriceLine | null>;
  askLine: Ref<IPriceLine | null>;
  midLine: Ref<IPriceLine | null>;
  colors: ChartColors;
  timeframe: Timeframe;
  symbol: string;
  qc: ReturnType<typeof useQueryClient>;
  setLegend: Dispatch<SetStateAction<OhlcvLegend | null>>;
  hoveredTime?: Ref<Time | null>;
}

export interface LoadMoreState {
  loading: boolean;
  noMoreData: boolean;
  lastFetchedBeforeMs: number;
  fetchFromMs: number;
  emptyFetchCount?: number;
  loadingForward?: boolean;
}

export interface PluginBuildCtx {
  isDark: boolean;
  timeframe: Timeframe;
  symbolCategory?: string;
}

export type SlTpField = "takeProfit" | "stopLoss" | "entry";

export interface SlTpEntry {
  line: IPriceLine;
  price: number;
  positionId: string;
  field: SlTpField;
  side: string;
  entryPrice: number;
  quantity: number;
}

export type SlTpMap = Map<string, SlTpEntry>;

export interface OverlayOpts {
  symbol: string;
  colors: ChartColors;
  contractSize: number;
}

export type ReplayTradeEvent = NonNullable<
  ChartPanelProps["replayTradeEvents"]
>[number];

export interface ChartPanelProps {
  hideTimeScale?: boolean;
  candles: Candle[];
  selectedSymbol: string;
  timeframe: Timeframe;
  isDark: boolean;
  activeIndicators: IndicatorType[];
  onToggleIndicator?: (type: IndicatorType) => void;
  drawingTool: DrawingTool;
  drawings: DrawingLine[];
  onAddDrawing: (d: DrawingLine) => void;
  onUpdateDrawing?: (d: DrawingLine) => void;
  onRemoveDrawing?: (id: string) => void;
  /** Called when a drawing completes/cancels so the parent can disarm the tool. */
  onDrawingComplete?: () => void;
  /** Alt+T/H/F/R keyboard shortcut pressed — arm the given tool. */
  onDrawingToolSelect?: (t: DrawingTool) => void;
  onUndoDrawing?: () => void;
  onRedoDrawing?: () => void;
  /** Snap drawing anchors to candle O/H/L/C — off / weak (near) / strong (always). */
  magnetMode?: MagnetMode;
  /** Keep the drawing tool armed after each placement. */
  stayInDrawingMode?: boolean;
  positions: Position[];
  orders: Order[];
  tick?: TickData;
  liveCandle?: LiveCandleData;
  pipDigits: number;
  symbolInfo?: Symbol;
  onModifyPosition?: (
    positionId: string,
    mods: { takeProfit?: number | null; stopLoss?: number | null },
  ) => void;
  replayTradeEvents?: Array<{
    id: string;
    type: "entry" | "exit" | "violation";
    timestamp: string;
    symbolName: string | null;
    side: string | null;
    price: number | null;
    pnl: number | null;
    ruleCode?: string;
  }>;
  activePlugins?: string[];
  /** Toggle a chart plugin (session breaks etc.) — used by the settings dialog. */
  onTogglePlugin?: (id: string) => void;
  /** Account equity — feeds the position tool's $-risk / size readout. */
  accountEquity?: number;
  /** Active account — enables the challenge-aware level overlay. */
  accountId?: string | null;
  /** Context-menu quick order at the clicked price (opens the confirm dialog). */
  onQuickOrder?: (
    side: "BUY" | "SELL",
    type: "LIMIT" | "STOP",
    price: number,
  ) => void;
  /** Context-menu "Remove N drawings". */
  onClearDrawings?: () => void;
  /** Context-menu "Remove N indicators". */
  onClearIndicators?: () => void;
  /**
   * Session replay is active — candles are a historical slice, so the
   * staleness watchdog must not treat the old last-bar as a data gap.
   */
  isReplaying?: boolean;
  /** Callback when the main lightweight-chart instance is created or destroyed */
  onChartReady?: (chart: IChartApi | null) => void;
  /** Callback when the merged candles (historicalExtra + live) changes */
  onAllCandlesChange?: (candles: Candle[]) => void;
}

export interface ChartLifecycleParams {
  containerRef: RefObject<HTMLDivElement | null>;
  chartRef: RefObject<IChartApi | null>;
  candleSeriesRef: RefObject<ISeriesApi<"Candlestick"> | null>;
  volumeSeriesRef: RefObject<ISeriesApi<"Histogram"> | null>;
  drawingManagerRef: RefObject<DrawingToolsManager | null>;
  loadMoreRef: RefObject<LoadMoreState>;
  hasUserPannedOrZoomedRef: RefObject<boolean>;
  isScrolledBackRef?: RefObject<boolean>;
  isChangingTfRef?: RefObject<boolean>;
  pendingHistoricalTargetRef?: RefObject<{ centerTime: number; barCount: number; targetSymbol: string } | null>;
  lastVisibleTimeRangeRef?: RefObject<{ from: number; to: number; centerTime?: number; barCount?: number } | null>;
  timeframeRef: RefObject<Timeframe>;
  allCandlesRef: RefObject<Candle[]>;
  lastCandleRef: RefObject<CandlestickData<Time> | null>;
  lastLoadKeyRef: RefObject<string>;
  lastLoadedSeriesRef: RefObject<ISeriesApi<"Candlestick"> | null>;
  liveCandleTsRef: RefObject<number>;
  legendVolRef: RefObject<number>;
  legendRestoredRef: RefObject<boolean>;
  hoveredTimeRef?: RefObject<Time | null>;
  lastGapRefetchAtRef: RefObject<number>;
  bidLineRef: RefObject<IPriceLine | null>;
  askLineRef: RefObject<IPriceLine | null>;
  midLineRef: RefObject<IPriceLine | null>;
  chartPluginsRef: RefObject<ISeriesPrimitive<Time>[]>;
  drawingMenuOpenedRef: RefObject<boolean>;

  onChartReady?: (chart: IChartApi | null) => void;
  setLegend: Dispatch<SetStateAction<OhlcvLegend | null>>;
  setHistoricalExtra: Dispatch<SetStateAction<Candle[]>>;
  setSelectedDrawingIds: Dispatch<SetStateAction<string[]>>;
  setShowDrawingSettings: Dispatch<SetStateAction<boolean>>;
  setContextMenu: Dispatch<SetStateAction<{ id: string; x: number; y: number } | null>>;

  drawingToolRef: RefObject<DrawingTool>;
  drawingsRef: RefObject<DrawingLine[]>;
  magnetRef: RefObject<MagnetMode>;
  stayInModeRef: RefObject<boolean>;
  accountEquityRef: RefObject<number>;
  styleDefaultsRef: RefObject<any>;
  onAddDrawingRef: RefObject<(d: DrawingLine) => void>;
  onUpdateDrawingRef: RefObject<((d: DrawingLine) => void) | undefined>;
  onRemoveDrawingRef: RefObject<((id: string) => void) | undefined>;
  onDrawingCompleteRef: RefObject<(() => void) | undefined>;
  onDrawingToolSelectRef: RefObject<((t: DrawingTool) => void) | undefined>;
  onUndoDrawingRef: RefObject<(() => void) | undefined>;
  onRedoDrawingRef: RefObject<(() => void) | undefined>;

  isDark: boolean;
  pipDigits: number;
  colors: ChartColors;
  chartPrefs: ReturnType<typeof useChartPreferences>;
  selectedSymbol: string;
  timeframe: Timeframe;
  hideTimeScale?: boolean;
}

import type { ChartType } from "../../../hooks/useChartPreferences.ts";
import type { IndicatorType } from "../../../lib/indicators.ts";
import type {
  DrawingLine,
  DrawingTool,
  MagnetMode,
  Timeframe,
} from "../constants.ts";

export interface ToolbarSymbolItem {
  id?: string;
  name: string;
  displayName?: string | null;
  assetClass?: string;
  baseCurrency?: string;
  quoteCurrency?: string;
  category?: string;
  isActive?: boolean;
}

export interface ToolbarSymbolInfo {
  tickSize?: number;
  pipSize?: number;
  lotSize?: number;
  minLot?: number;
  maxLot?: number;
  lotStep?: number;
  contractSize?: number;
  marginPercent?: number;
  commission?: number;
}

export interface ToolbarTick {
  bid: number;
  ask: number;
  timestamp: number;
}

export interface ChartToolbarProps {
  selectedSymbol: string;
  symbols: ToolbarSymbolItem[];
  onSymbolChange: (s: string) => void;
  onOpenSymbolSearch?: () => void;
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  activeIndicators: IndicatorType[];
  onToggleIndicator: (type: IndicatorType) => void;
  showIndicatorMenu: boolean;
  onToggleIndicatorMenu: () => void;
  drawingTool: DrawingTool;
  onDrawingTool: (t: DrawingTool) => void;
  drawings: DrawingLine[];
  onClearDrawings: () => void;
  rightPanel: string;
  onRightPanel: (p: "watchlist" | "order" | "dom" | "ai-trader") => void;
  aiTraderEnabled?: boolean;
  showRightPanel: boolean;
  onToggleRightPanel: () => void;
  tick?: ToolbarTick;
  symbolInfo?: ToolbarSymbolInfo;
  isReplaying?: boolean;
  /** Account whose sessions can be replayed — mounts the replay HUD when set. */
  replayAccountId?: string | null;
  activePlugins?: string[];
  onTogglePlugin?: (id: string) => void;
  /** Replace the full indicator list (template load). Enables the templates menu. */
  onSetIndicators?: (indicators: IndicatorType[]) => void;
  /** Replace the full plugin list (template load). Enables the templates menu. */
  onSetPlugins?: (ids: string[]) => void;
  magnetMode?: MagnetMode;
  onCycleMagnet?: () => void;
  stayInDrawingMode?: boolean;
  onToggleStayInDrawingMode?: () => void;
  chartType?: ChartType;
  onChartTypeChange?: (type: ChartType) => void;
}

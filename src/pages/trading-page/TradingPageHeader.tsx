import type { ChartType } from "../../hooks/useChartPreferences.ts";
import type { Symbol } from "../../services/schemas.ts";
import { ChartToolbar } from "../trading/ChartToolbar.tsx";
import type {
  DrawingLine,
  DrawingTool,
  MagnetMode,
  Timeframe,
} from "../trading/constants.ts";
import { MarketClosedBanner } from "../trading/MarketClosedBanner.tsx";

export interface TradingPageHeaderProps {
  selectedSymbol: string;
  symbols: Symbol[];
  onSymbolChange: (symbol: string) => void;
  onOpenSymbolSearch: () => void;
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  activeIndicators: any[];
  onToggleIndicator: (type: any) => void;
  showIndicatorMenu: boolean;
  onToggleIndicatorMenu: () => void;
  drawingTool: DrawingTool;
  onDrawingTool: (tool: DrawingTool) => void;
  drawings: DrawingLine[];
  onClearDrawings: () => void;
  rightPanel: "watchlist" | "order" | "dom" | "ai-trader";
  onRightPanel: (panel: "watchlist" | "order" | "dom" | "ai-trader") => void;
  showRightPanel: boolean;
  onToggleRightPanel: () => void;
  tick?: { bid: number; ask: number; timestamp: number };
  symbolInfo?: Symbol;
  aiTraderEnabled: boolean;
  isReplaying: boolean;
  replayAccountId: string | null;
  activePlugins: string[];
  onTogglePlugin: (id: string) => void;
  onSetIndicators: (indicators: any[]) => void;
  onSetPlugins: (plugins: string[]) => void;
  magnetMode: MagnetMode;
  onCycleMagnet: () => void;
  stayInDrawingMode: boolean;
  onToggleStayInDrawingMode: () => void;
  chartType?: ChartType;
  onChartTypeChange?: (type: ChartType) => void;
}

export function TradingPageHeader({
  selectedSymbol,
  symbols,
  onSymbolChange,
  onOpenSymbolSearch,
  timeframe,
  onTimeframeChange,
  activeIndicators,
  onToggleIndicator,
  showIndicatorMenu,
  onToggleIndicatorMenu,
  drawingTool,
  onDrawingTool,
  drawings,
  onClearDrawings,
  rightPanel,
  onRightPanel,
  showRightPanel,
  onToggleRightPanel,
  tick,
  symbolInfo,
  aiTraderEnabled,
  isReplaying,
  replayAccountId,
  activePlugins,
  onTogglePlugin,
  onSetIndicators,
  onSetPlugins,
  magnetMode,
  onCycleMagnet,
  stayInDrawingMode,
  onToggleStayInDrawingMode,
  chartType,
  onChartTypeChange,
}: TradingPageHeaderProps) {
  return (
    <>
      <ChartToolbar
        selectedSymbol={selectedSymbol}
        symbols={symbols}
        onSymbolChange={onSymbolChange}
        onOpenSymbolSearch={onOpenSymbolSearch}
        timeframe={timeframe}
        onTimeframeChange={onTimeframeChange}
        activeIndicators={activeIndicators}
        onToggleIndicator={onToggleIndicator}
        showIndicatorMenu={showIndicatorMenu}
        onToggleIndicatorMenu={onToggleIndicatorMenu}
        drawingTool={drawingTool}
        onDrawingTool={onDrawingTool}
        drawings={drawings}
        onClearDrawings={onClearDrawings}
        rightPanel={rightPanel}
        onRightPanel={onRightPanel}
        showRightPanel={showRightPanel}
        onToggleRightPanel={onToggleRightPanel}
        tick={tick}
        symbolInfo={symbolInfo}
        aiTraderEnabled={aiTraderEnabled}
        isReplaying={isReplaying}
        replayAccountId={replayAccountId}
        activePlugins={activePlugins}
        onTogglePlugin={onTogglePlugin}
        onSetIndicators={onSetIndicators}
        onSetPlugins={onSetPlugins}
        magnetMode={magnetMode}
        onCycleMagnet={onCycleMagnet}
        stayInDrawingMode={stayInDrawingMode}
        onToggleStayInDrawingMode={onToggleStayInDrawingMode}
        chartType={chartType}
        onChartTypeChange={onChartTypeChange}
      />
      <MarketClosedBanner symbolInfo={symbolInfo} />
    </>
  );
}

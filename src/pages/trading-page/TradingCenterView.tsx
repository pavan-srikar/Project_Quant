import type { IChartApi } from "lightweight-charts";
import { cn } from "../../lib/utils.ts";
import type { Candle, Symbol } from "../../services/schemas.ts";
import { TradingMainArea } from "./TradingMainArea.tsx";
import { TradingRightPanel } from "./TradingRightPanel.tsx";
import type { useTradingActions } from "./useTradingActions.ts";
import type { useTradingChartControls } from "./useTradingChartControls.ts";
import type { useTradingJournal } from "./useTradingJournal.ts";
import type { useTradingLayoutResize } from "./useTradingLayoutResize.ts";
import type { useTradingPageData } from "./useTradingPageData.ts";
import type { MagnetMode, Timeframe } from "../trading/constants.ts";

export interface TradingCenterViewProps {
  layout: ReturnType<typeof useTradingLayoutResize>;
  chartControls: ReturnType<typeof useTradingChartControls>;
  tradingActions: ReturnType<typeof useTradingActions>;
  pageData: ReturnType<typeof useTradingPageData>;
  journal: ReturnType<typeof useTradingJournal>;
  selectedSymbol: string;
  setSelectedSymbol: (symbol: string) => void;
  timeframe: Timeframe;
  candles: Candle[];
  isDark: boolean;
  mainChart: IChartApi | null;
  setMainChart: (chart: IChartApi | null) => void;
  allCandles: Candle[];
  setAllCandles: (candles: Candle[]) => void;
  symbols: Symbol[];
  openSymbolSearch: (mode?: "switch" | "add_to_watchlist", initialQuery?: string) => void;
  aiTraderEnabled: boolean;
  isFeedConnected: boolean;
  activeAccountId: string | null;
  isReplaying: boolean;
  rightPanel: "watchlist" | "order" | "dom" | "ai-trader";
  showRightPanel: boolean;
  ticks: Record<string, { bid: number; ask: number; timestamp: number }>;
  magnetMode: MagnetMode;
  stayInDrawingMode: boolean;
}

export function TradingCenterView({
  layout,
  chartControls,
  tradingActions,
  pageData,
  journal,
  selectedSymbol,
  setSelectedSymbol,
  timeframe,
  candles,
  isDark,
  mainChart,
  setMainChart,
  allCandles,
  setAllCandles,
  symbols,
  openSymbolSearch,
  aiTraderEnabled,
  isFeedConnected,
  activeAccountId,
  isReplaying,
  rightPanel,
  showRightPanel,
  ticks,
  magnetMode,
  stayInDrawingMode,
}: TradingCenterViewProps) {
  return (
    <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
      {/* Chart + Bottom Panel */}
      <TradingMainArea
        candles={candles}
        replayCandles={pageData.replayCandles}
        selectedSymbol={selectedSymbol}
        timeframe={timeframe}
        isDark={isDark}
        activeIndicators={chartControls.activeIndicators}
        onToggleIndicator={chartControls.handleToggleIndicator}
        drawingTool={chartControls.drawingTool}
        drawings={chartControls.drawings}
        onAddDrawing={chartControls.addDrawing}
        onUpdateDrawing={chartControls.updateDrawing}
        onRemoveDrawing={chartControls.removeDrawing}
        onDrawingToolSelect={chartControls.setDrawingTool}
        onUndoDrawing={chartControls.undoDrawing}
        onRedoDrawing={chartControls.redoDrawing}
        magnetMode={magnetMode}
        stayInDrawingMode={stayInDrawingMode}
        chartPositions={pageData.chartPositions}
        chartOrders={pageData.chartOrders}
        tick={pageData.tick}
        liveCandle={pageData.liveCandle}
        pipDigits={pageData.pipDigits}
        symbolInfo={pageData.symbolInfo}
        onModifyPosition={tradingActions.handleChartModifyPosition}
        replayTradeEvents={pageData.replayTradeEvents}
        isReplaying={isReplaying}
        activePlugins={chartControls.activePlugins}
        onTogglePlugin={chartControls.handleTogglePlugin}
        accountEquity={pageData.account?.equity ?? pageData.account?.balance ?? 0}
        accountId={activeAccountId}
        onQuickOrder={tradingActions.handleQuickOrder}
        onClearDrawings={chartControls.clearDrawings}
        onClearIndicators={chartControls.handleClearIndicators}
        onChartReady={setMainChart}
        onAllCandlesChange={setAllCandles}
        isBottomCollapsed={layout.isBottomCollapsed}
        onResizeStart={layout.handleResizeStart}
        bottomTab={layout.bottomTab}
        onBottomTabChange={layout.handleBottomTabChange}
        onToggleBottomCollapse={layout.handleToggleBottomCollapse}
        positions={pageData.positions}
        orders={pageData.orders}
        onModifyPositionDialog={tradingActions.setModifyingPosition}
        onModifyOrderDialog={tradingActions.setModifyingOrder}
        onSelectPositionSymbol={setSelectedSymbol}
        onSelectOrderSymbol={setSelectedSymbol}
        aiTraderEnabled={aiTraderEnabled}
        bottomPanelHeight={layout.bottomPanelHeight}
        isFeedConnected={isFeedConnected}
        allCandles={allCandles}
        mainChart={mainChart}
        journalEntries={journal.journalEntries}
        journalLoading={journal.journalLoading}
        onCreateJournal={journal.handleCreateJournal}
        onUpdateJournal={journal.handleUpdateJournal}
        onDeleteJournal={journal.handleDeleteJournal}
      />

      {/* ── Vertical Resize Handle (Chart/Bottom vs Right Panel) ── */}
      {showRightPanel && (
        <div
          onMouseDown={layout.handleRightResizeStart}
          onTouchStart={layout.handleRightResizeStart}
          data-testid="right-panel-resize-handle"
          className={cn(
            "hidden md:flex w-1.5 cursor-col-resize items-center justify-center transition-colors group border-l border-[#2a2e39] bg-[#1e222d] touch-none select-none shrink-0",
            layout.isResizingRight
              ? "bg-[#2962ff]/20 border-[#2962ff]"
              : "hover:bg-[#2962ff]/20 hover:border-[#2962ff]/60 active:bg-[#2962ff]/30",
          )}
          title="Drag to resize right panel"
        >
          <div
            className={cn(
              "w-0.5 h-8 rounded-full transition-colors",
              layout.isResizingRight
                ? "bg-[#2962ff]"
                : "bg-[#2a2e39] group-hover:bg-[#2962ff]/60",
            )}
          />
        </div>
      )}

      {/* Right Panel */}
      <TradingRightPanel
        showRightPanel={showRightPanel}
        rightPanel={rightPanel}
        rightPanelWidth={layout.rightPanelWidth}
        symbols={symbols}
        ticks={ticks}
        selectedSymbol={selectedSymbol}
        onSelectSymbol={setSelectedSymbol}
        onOpenSymbolSearch={() => openSymbolSearch("add_to_watchlist", "")}
        oneClick={tradingActions.oneClick}
        activeAccountId={activeAccountId}
        isFeedConnected={isFeedConnected}
        symbolInfo={pageData.symbolInfo}
        tick={pageData.tick}
        onToggleOneClick={tradingActions.toggleOneClick}
        setConfirmOrder={tradingActions.setConfirmOrder}
        accountBalance={pageData.account?.balance}
        soundMuted={tradingActions.soundMuted}
        onToggleMute={tradingActions.toggleSoundMute}
        onOrderSuccess={() => {
          tradingActions.playTradeSound();
          tradingActions.handleFirstTrade();
        }}
      />
    </div>
  );
}

import type { IChartApi } from "lightweight-charts";
import { useMemo, type MouseEvent as ReactMouseEvent, type TouchEvent as ReactTouchEvent } from "react";
import { INDICATOR_REGISTRY } from "../../lib/indicators.ts";
import type {
  CreateJournalEntryInput,
  UpdateJournalEntryInput,
} from "../../services/api/journal.ts";
import type { Candle, Order, Position, Symbol } from "../../services/schemas.ts";
import { BottomPanel, type BottomPanelTab } from "../trading/BottomPanel.tsx";
import { ChartPanel } from "../trading/ChartPanel.tsx";
import {
  type DrawingLine,
  type DrawingTool,
  type MagnetMode,
  REPLAY_ENABLED,
  type Timeframe,
} from "../trading/constants.ts";
import { ReplayScrubber } from "../trading/ReplayScrubber.tsx";

export interface TradingMainAreaProps {
  candles: Candle[];
  replayCandles: Candle[] | null;
  selectedSymbol: string;
  timeframe: Timeframe;
  isDark: boolean;
  activeIndicators: any[];
  onToggleIndicator: (type: any) => void;
  drawingTool: DrawingTool;
  drawings: DrawingLine[];
  onAddDrawing: (d: DrawingLine) => void;
  onUpdateDrawing: (d: DrawingLine) => void;
  onRemoveDrawing: (id: string) => void;
  onDrawingToolSelect: (tool: DrawingTool) => void;
  onUndoDrawing: () => void;
  onRedoDrawing: () => void;
  magnetMode: MagnetMode;
  stayInDrawingMode: boolean;
  chartPositions: Position[];
  chartOrders: Order[];
  tick?: { bid: number; ask: number; timestamp: number };
  liveCandle?: any;
  pipDigits: number;
  symbolInfo?: Symbol;
  onModifyPosition: (id: string, mods: { takeProfit?: number | null; stopLoss?: number | null }) => void;
  replayTradeEvents?: any[];
  isReplaying: boolean;
  activePlugins: string[];
  onTogglePlugin: (id: string) => void;
  accountEquity: number;
  accountId: string | null;
  onQuickOrder: (side: "BUY" | "SELL", type: "LIMIT" | "STOP", price: number) => void;
  onClearDrawings: () => void;
  onClearIndicators: () => void;
  onChartReady?: (chart: IChartApi | null) => void;
  onAllCandlesChange: (candles: Candle[]) => void;
  // Bottom Panel
  isBottomCollapsed: boolean;
  onResizeStart: (e: ReactMouseEvent | ReactTouchEvent) => void;
  bottomTab: BottomPanelTab;
  onBottomTabChange: (tab: BottomPanelTab) => void;
  onToggleBottomCollapse: () => void;
  positions: Position[];
  orders: Order[];
  onModifyPositionDialog: (p: Position) => void;
  onModifyOrderDialog: (o: Order) => void;
  onSelectPositionSymbol: (sym: string) => void;
  onSelectOrderSymbol: (sym: string) => void;
  aiTraderEnabled: boolean;
  bottomPanelHeight: number;
  isFeedConnected: boolean;
  allCandles: Candle[];
  mainChart: IChartApi | null;
  journalEntries: any[];
  journalLoading: boolean;
  onCreateJournal: (data: CreateJournalEntryInput) => void;
  onUpdateJournal: (id: string, data: UpdateJournalEntryInput) => void;
  onDeleteJournal: (id: string) => void;
}

export function TradingMainArea({
  candles,
  replayCandles,
  selectedSymbol,
  timeframe,
  isDark,
  activeIndicators,
  onToggleIndicator,
  drawingTool,
  drawings,
  onAddDrawing,
  onUpdateDrawing,
  onRemoveDrawing,
  onDrawingToolSelect,
  onUndoDrawing,
  onRedoDrawing,
  magnetMode,
  stayInDrawingMode,
  chartPositions,
  chartOrders,
  tick,
  liveCandle,
  pipDigits,
  symbolInfo,
  onModifyPosition,
  replayTradeEvents,
  isReplaying,
  activePlugins,
  onTogglePlugin,
  accountEquity,
  accountId,
  onQuickOrder,
  onClearDrawings,
  onClearIndicators,
  onChartReady,
  onAllCandlesChange,
  isBottomCollapsed,
  onResizeStart,
  bottomTab,
  onBottomTabChange,
  onToggleBottomCollapse,
  positions,
  orders,
  onModifyPositionDialog,
  onModifyOrderDialog,
  onSelectPositionSymbol,
  onSelectOrderSymbol,
  aiTraderEnabled,
  bottomPanelHeight,
  isFeedConnected,
  allCandles,
  mainChart,
  journalEntries,
  journalLoading,
  onCreateJournal,
  onUpdateJournal,
  onDeleteJournal,
}: TradingMainAreaProps) {
  const hasActiveBelowIndicators = useMemo(() => {
    return activeIndicators.some((t) => {
      const config = INDICATOR_REGISTRY.find((r) => r.type === t);
      return config && config.pane === "below";
    });
  }, [activeIndicators]);

  const isBottomIndicatorActive =
    !isBottomCollapsed && bottomTab === "indicators" && hasActiveBelowIndicators;

  return (
    <div className="flex flex-col flex-1 min-w-0">
      {/* Chart Area */}
      <div className="flex-1 min-h-[200px] relative">
        <ChartPanel
          candles={replayCandles ?? candles}
          selectedSymbol={selectedSymbol}
          timeframe={replayCandles ? "1m" : timeframe}
          isDark={isDark}
          activeIndicators={activeIndicators}
          onToggleIndicator={onToggleIndicator}
          drawingTool={drawingTool}
          drawings={drawings}
          onAddDrawing={onAddDrawing}
          onUpdateDrawing={onUpdateDrawing}
          onRemoveDrawing={onRemoveDrawing}
          onDrawingComplete={() => onDrawingToolSelect("none")}
          onDrawingToolSelect={onDrawingToolSelect}
          onUndoDrawing={onUndoDrawing}
          onRedoDrawing={onRedoDrawing}
          magnetMode={magnetMode}
          stayInDrawingMode={stayInDrawingMode}
          positions={chartPositions}
          orders={chartOrders}
          tick={replayCandles ? undefined : tick}
          liveCandle={replayCandles ? undefined : liveCandle}
          pipDigits={pipDigits}
          symbolInfo={symbolInfo}
          onModifyPosition={onModifyPosition}
          replayTradeEvents={replayTradeEvents ?? []}
          isReplaying={isReplaying}
          activePlugins={activePlugins}
          onTogglePlugin={onTogglePlugin}
          accountEquity={accountEquity}
          accountId={accountId}
          onQuickOrder={onQuickOrder}
          onClearDrawings={onClearDrawings}
          onClearIndicators={onClearIndicators}
          onChartReady={onChartReady}
          onAllCandlesChange={onAllCandlesChange}
          hideTimeScale={isBottomIndicatorActive}
        />
      </div>

      {/* Replay timeline scrubber */}
      {REPLAY_ENABLED && isReplaying && accountId != null && (
        <ReplayScrubber accountId={accountId} />
      )}

      {/* ── Resize Handle ── */}
      {!isBottomCollapsed && (
        <div
          onMouseDown={onResizeStart}
          onTouchStart={onResizeStart}
          className="hidden md:flex h-1.5 cursor-row-resize items-center justify-center hover:bg-[#2962ff]/20 active:bg-[#2962ff]/30 transition-colors group border-t border-[#2a2e39] bg-[#1e222d] touch-none"
        >
          <div className="w-8 h-0.5 rounded-full bg-[#2a2e39] group-hover:bg-[#2962ff]/60 transition-colors" />
        </div>
      )}

      {/* Bottom Panel */}
      <BottomPanel
        tab={bottomTab}
        onTabChange={onBottomTabChange}
        isCollapsed={isBottomCollapsed}
        onToggleCollapse={onToggleBottomCollapse}
        positions={positions}
        orders={orders}
        accountId={accountId}
        onModifyPosition={onModifyPositionDialog}
        onModifyOrder={onModifyOrderDialog}
        onSelectPositionSymbol={onSelectPositionSymbol}
        onSelectOrderSymbol={onSelectOrderSymbol}
        aiTraderEnabled={aiTraderEnabled}
        height={bottomPanelHeight}
        isFeedConnected={isFeedConnected}
        candles={allCandles.length > 0 ? (allCandles as any) : (replayCandles ?? candles)}
        mainChart={mainChart}
        activeIndicators={activeIndicators}
        onToggleIndicator={onToggleIndicator}
        isDark={isDark}
        timeframe={timeframe}
        journalEntries={journalEntries}
        journalLoading={journalLoading}
        onCreateJournal={onCreateJournal}
        onUpdateJournal={onUpdateJournal}
        onDeleteJournal={onDeleteJournal}
      />
    </div>
  );
}

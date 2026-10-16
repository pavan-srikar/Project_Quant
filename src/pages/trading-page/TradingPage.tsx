import type { IChartApi } from "lightweight-charts";
import { useEffect, useState } from "react";
import { useIsFeedConnected } from "../../components/ConnectionIndicator.tsx";
import {
  updateChartPreferences,
  useChartPreferences,
} from "../../hooks/useChartPreferences.ts";
import { useAiTraderEnabled, useSymbols } from "../../services/queries.ts";
import { useTradingStore } from "../../services/store.tsx";
import { MobileTradingSection } from "./MobileTradingSection.tsx";
import { TradingCenterView } from "./TradingCenterView.tsx";
import { TradingDialogContainer } from "./TradingDialogContainer.tsx";
import { TradingPageHeader } from "./TradingPageHeader.tsx";
import { useCandleDepthLoader } from "./useCandleDepthLoader.ts";
import { useTradingActions } from "./useTradingActions.ts";
import { useTradingChartControls } from "./useTradingChartControls.ts";
import { useTradingJournal } from "./useTradingJournal.ts";
import { useTradingLayoutResize } from "./useTradingLayoutResize.ts";
import { useTradingPageData } from "./useTradingPageData.ts";
import { useTradingShortcuts } from "./useTradingShortcuts.ts";

export function TradingPage() {
  const {
    selectedSymbol,
    setSelectedSymbol,
    ticks,
    updateTick,
    activeAccountId,
    replayVersion,
    isReplaying,
  } = useTradingStore();

  const isFeedConnected = useIsFeedConnected();
  const { data: symbols = [] } = useSymbols();

  // Layout resize state
  const layout = useTradingLayoutResize();

  // Candle depth loader & timeframe
  const { timeframe, handleTimeframeChange, candles } = useCandleDepthLoader(
    selectedSymbol,
    replayVersion,
  );

  // Trading shortcuts & symbol search
  const {
    isSymbolSearchOpen,
    symbolSearchInitialQuery,
    symbolSearchMode,
    openSymbolSearch,
    closeSymbolSearch,
  } = useTradingShortcuts();

  // Chart preferences & controls
  const chartPrefs = useChartPreferences();
  const chartControls = useTradingChartControls({
    selectedSymbol,
    timeframe,
    chartPrefs,
    onBottomTabToIndicators: () => {
      layout.setBottomTab("indicators");
      layout.setIsBottomCollapsed(false);
      localStorage.setItem("bottomPanelCollapsed", "false");
    },
  });

  // Trading actions & order confirmation
  const tradingActions = useTradingActions({
    selectedSymbol,
    activeAccountId,
    isFeedConnected,
    updateTick,
  });

  // Main chart reference & allCandles
  const [mainChart, setMainChart] = useState<IChartApi | null>(null);
  useEffect(() => {
    (window as any).__mainChart = mainChart;
  }, [mainChart]);
  const [allCandles, setAllCandles] = useState<any[]>([]);
  useEffect(() => {
    setAllCandles([]);
  }, [selectedSymbol]);

  // Right panel selector state
  const { data: aiTraderEnabled } = useAiTraderEnabled();
  const [rightPanel, setRightPanel] = useState<
    "watchlist" | "order" | "dom" | "ai-trader"
  >("watchlist");
  const [showRightPanel, setShowRightPanel] = useState(true);

  // Data pipeline
  const pageData = useTradingPageData({
    activeAccountId,
    selectedSymbol,
    timeframe,
    symbols,
    chartPrefs,
  });

  // Trade journal
  const journal = useTradingJournal(activeAccountId);

  const isDark = !document.documentElement.classList.contains("light");

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#131722] text-neutral-200">
      {/* ── Mobile Account Bar (small screens only) ────── */}
      <MobileTradingSection
        account={pageData.account}
        positionPnl={pageData.positionPnl}
        selectedSymbol={selectedSymbol}
        tick={pageData.tick}
        positions={pageData.positions}
        oneClick={tradingActions.oneClick}
        activeAccountId={activeAccountId}
        setConfirmOrder={tradingActions.setConfirmOrder}
      />

      {/* ── Top Toolbar ──────────────────────────────────── */}
      <TradingPageHeader
        selectedSymbol={selectedSymbol}
        symbols={symbols}
        onSymbolChange={setSelectedSymbol}
        onOpenSymbolSearch={() => openSymbolSearch("switch", "")}
        timeframe={timeframe}
        onTimeframeChange={handleTimeframeChange}
        activeIndicators={chartControls.activeIndicators}
        onToggleIndicator={chartControls.handleToggleIndicator}
        showIndicatorMenu={chartControls.showIndicatorMenu}
        onToggleIndicatorMenu={() => chartControls.setShowIndicatorMenu((v) => !v)}
        drawingTool={chartControls.drawingTool}
        onDrawingTool={chartControls.setDrawingTool}
        drawings={chartControls.drawings}
        onClearDrawings={chartControls.clearDrawings}
        rightPanel={rightPanel}
        onRightPanel={(p) => {
          if (showRightPanel && rightPanel === p) {
            setShowRightPanel(false);
          } else {
            setRightPanel(p);
            setShowRightPanel(true);
          }
        }}
        showRightPanel={showRightPanel}
        onToggleRightPanel={() => setShowRightPanel((v) => !v)}
        tick={pageData.tick}
        symbolInfo={pageData.symbolInfo}
        aiTraderEnabled={Boolean(aiTraderEnabled)}
        isReplaying={isReplaying}
        replayAccountId={activeAccountId}
        activePlugins={chartControls.activePlugins}
        onTogglePlugin={chartControls.handleTogglePlugin}
        onSetIndicators={chartControls.setActiveIndicators}
        onSetPlugins={chartControls.handleSetPlugins}
        magnetMode={chartPrefs.magnetMode}
        onCycleMagnet={chartControls.cycleMagnetMode}
        stayInDrawingMode={chartPrefs.stayInDrawingMode}
        onToggleStayInDrawingMode={() =>
          updateChartPreferences({ stayInDrawingMode: !chartPrefs.stayInDrawingMode })
        }
      />

      {/* ── Main Layout ──────────────────────────────────── */}
      <TradingCenterView
        layout={layout}
        chartControls={chartControls}
        tradingActions={tradingActions}
        pageData={pageData}
        journal={journal}
        selectedSymbol={selectedSymbol}
        setSelectedSymbol={setSelectedSymbol}
        timeframe={timeframe}
        candles={candles}
        isDark={isDark}
        mainChart={mainChart}
        setMainChart={setMainChart}
        allCandles={allCandles}
        setAllCandles={setAllCandles}
        symbols={symbols}
        openSymbolSearch={openSymbolSearch}
        aiTraderEnabled={Boolean(aiTraderEnabled)}
        isFeedConnected={isFeedConnected}
        activeAccountId={activeAccountId}
        isReplaying={isReplaying}
        rightPanel={rightPanel}
        showRightPanel={showRightPanel}
        ticks={ticks}
        magnetMode={chartPrefs.magnetMode}
        stayInDrawingMode={chartPrefs.stayInDrawingMode}
      />

      {/* Dialogs */}
      <TradingDialogContainer
        isSymbolSearchOpen={isSymbolSearchOpen}
        onCloseSymbolSearch={closeSymbolSearch}
        selectedSymbol={selectedSymbol}
        onSelectSymbol={setSelectedSymbol}
        symbolSearchInitialQuery={symbolSearchInitialQuery}
        symbolSearchMode={symbolSearchMode}
        modifyingPosition={tradingActions.modifyingPosition}
        onCloseModifyingPosition={() => tradingActions.setModifyingPosition(null)}
        modifyingOrder={tradingActions.modifyingOrder}
        onCloseModifyingOrder={() => tradingActions.setModifyingOrder(null)}
        confirmOrder={tradingActions.confirmOrder}
        onConfirmOrder={tradingActions.handleConfirmOrderSubmit}
        onCancelConfirmOrder={() => tradingActions.setConfirmOrder(null)}
        confirmLoading={tradingActions.confirmLoading}
        tick={pageData.tick}
        symbolInfo={pageData.symbolInfo}
        isFeedConnected={isFeedConnected}
      />
    </div>
  );
}

import { useQueryClient } from "@tanstack/react-query";
import type { ISeriesApi } from "lightweight-charts";
import { useCallback, useMemo, useState } from "react";
import { useChartPreferences } from "../../../hooks/useChartPreferences.ts";
import { CHART_COLORS, mergeChartColors } from "../constants.ts";
import { DrawingToolRail } from "../DrawingToolRail.tsx";
import { ChartLegendHeader } from "./ChartLegendHeader.tsx";
import { ChartPanelDialogs } from "./ChartPanelDialogs.tsx";
import { DragPriceTooltip } from "./DragPriceTooltip.tsx";
import type { ChartPanelProps, OhlcvLegend, RtCtx } from "./types.ts";
import { useCandlesMerge } from "./useCandlesMerge.ts";
import { useChartContextMenuActions } from "./useChartContextMenuActions.ts";
import { useChartIndicatorSettingsState } from "./useChartIndicatorSettingsState.ts";
import { useChartLifecycle } from "./useChartLifecycle.ts";
import { useChartOverlaysIntegration } from "./useChartOverlaysIntegration.ts";
import { useChartPluginAttachment } from "./useChartPluginAttachment.ts";
import { useChartStateRefs } from "./useChartStateRefs.ts";
import { useDrawingManagerRefs } from "./useDrawingManagerRefs.ts";
import { useDrawingSelectionState } from "./useDrawingSelectionState.ts";
import { useRealtimeEffects } from "./useRealtimeEffects.ts";

export function ChartPanel({
  candles,
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
  onDrawingComplete,
  onDrawingToolSelect,
  onUndoDrawing,
  onRedoDrawing,
  magnetMode = "none",
  stayInDrawingMode = false,
  positions,
  orders,
  tick,
  liveCandle,
  pipDigits,
  symbolInfo,
  onModifyPosition,
  replayTradeEvents,
  activePlugins = [],
  onTogglePlugin,
  accountEquity = 0,
  accountId,
  onQuickOrder,
  onClearDrawings,
  onClearIndicators,
  isReplaying = false,
  onChartReady,
  onAllCandlesChange,
  hideTimeScale = false,
}: ChartPanelProps) {
  const queryClient = useQueryClient();
  const refs = useChartStateRefs(selectedSymbol, timeframe);

  const [legend, setLegend] = useState<OhlcvLegend | null>(null);
  const [countdown, setCountdown] = useState("");

  const indicatorState = useChartIndicatorSettingsState(activeIndicators);

  const chartPrefs = useChartPreferences();
  const colors = useMemo(() => {
    const base = mergeChartColors(isDark ? CHART_COLORS.dark : CHART_COLORS.light, chartPrefs);
    const vol = indicatorState.indicatorSettings?.VOL;
    return {
      ...base,
      volumeUp: vol?.histUpColor || vol?.color || base.volumeUp,
      volumeDown: vol?.histDownColor || base.volumeDown,
    };
  }, [isDark, chartPrefs, indicatorState.indicatorSettings]);

  const selectionState = useDrawingSelectionState(drawings, timeframe);

  const drawingRefs = useDrawingManagerRefs({
    drawingTool,
    visibleDrawings: selectionState.visibleDrawings,
    magnetMode,
    accountEquity,
    stayInDrawingMode,
    drawingManagerRef: refs.drawingManagerRef,
    onAddDrawing,
    onUpdateDrawing,
    onRemoveDrawing,
    onDrawingComplete,
    onDrawingToolSelect,
    onUndoDrawing,
    onRedoDrawing,
  });

  const menuActions = useChartContextMenuActions({
    chartRef: refs.chartRef,
    candleSeriesRef: refs.candleSeriesRef,
    drawingMenuOpenedRef: selectionState.drawingMenuOpenedRef,
    setChartMenu: selectionState.setChartMenu,
    pipDigits,
    timeframe,
    selectedSymbol,
    onAddDrawing,
    drawings,
    onUpdateDrawing,
    selectedDrawing: selectionState.selectedDrawing,
    drawingManagerRef: refs.drawingManagerRef,
    chartPrefs,
  });

  const { allCandlesRef, chartData, volumeData } = useCandlesMerge({
    candles,
    historicalExtra: refs.historicalExtra,
    drawingManagerRef: refs.drawingManagerRef,
    onAllCandlesChange,
    colors,
    timeframe,
  });

  const { chartEpoch } = useChartLifecycle({
    ...refs,
    allCandlesRef,
    drawingMenuOpenedRef: selectionState.drawingMenuOpenedRef,
    onChartReady,
    setLegend,
    setSelectedDrawingIds: selectionState.setSelectedDrawingIds,
    setShowDrawingSettings: selectionState.setShowDrawingSettings,
    setContextMenu: selectionState.setContextMenu,
    isDark,
    pipDigits,
    colors,
    chartPrefs,
    selectedSymbol,
    timeframe,
    hideTimeScale,
    ...drawingRefs,
  });

  const { dragPrice } = useChartOverlaysIntegration({
    containerRef: refs.containerRef,
    chartRef: refs.chartRef,
    candleSeriesRef: refs.candleSeriesRef,
    slTpLinesRef: refs.slTpLinesRef,
    drawingTool,
    onModifyPosition,
    pipDigits,
    symbolInfo,
    chartEpoch,
    chartPrefs,
    accountId,
    selectedSymbol,
    positions,
    tick,
    accountEquity,
    chartData,
    activeIndicators,
    isDark,
  });

  const makeRtCtx = useCallback(
    (series: ISeriesApi<"Candlestick">): RtCtx => ({
      series,
      volume: refs.volumeSeriesRef.current,
      lastCandle: refs.lastCandleRef,
      lastLoadKey: refs.lastLoadKeyRef,
      liveCandleTs: refs.liveCandleTsRef,
      legendVol: refs.legendVolRef,
      gapAt: refs.lastGapRefetchAtRef,
      bidLine: refs.bidLineRef,
      askLine: refs.askLineRef,
      midLine: refs.midLineRef,
      colors,
      timeframe,
      symbol: selectedSymbol,
      qc: queryClient,
      setLegend,
    }),
    [colors, timeframe, selectedSymbol, queryClient, refs],
  );

  useRealtimeEffects({
    ...refs,
    chartData,
    volumeData,
    selectedSymbol,
    timeframe,
    makeRtCtx,
    setLegend,
    liveCandle,
    tick,
    drawingsRef: drawingRefs.drawingsRef,
    pipDigits,
    isReplaying,
    queryClient,
    chartPrefs,
    positions,
    orders,
    colors,
    symbolInfo,
    replayTradeEvents,
    setCountdown,
  });

  useChartPluginAttachment({
    candleSeriesRef: refs.candleSeriesRef,
    chartPluginsRef: refs.chartPluginsRef,
    activePlugins,
    isDark,
    selectedSymbol,
    timeframe,
    symbolCategory: symbolInfo?.category,
  });

  return (
    <div className="relative w-full h-full">
      <ChartLegendHeader
        selectedSymbol={selectedSymbol}
        timeframe={timeframe}
        legend={legend}
        countdown={countdown}
        tick={tick}
        pipDigits={pipDigits}
        showOhlcLegend={chartPrefs.showOhlcLegend}
        showCountdown={chartPrefs.showCountdown}
        overlayIndicators={indicatorState.overlayIndicators}
        indicatorSettings={indicatorState.indicatorSettings}
        onOpenIndicatorSettings={(type) => indicatorState.setIndicatorSettingsModalType(type)}
        onToggleIndicatorVisibility={indicatorState.handleToggleIndicatorVisibility}
        onRemoveIndicator={onToggleIndicator}
      />

      <DragPriceTooltip dragPrice={dragPrice} pipDigits={pipDigits} />

      <ChartPanelDialogs
        selection={selectionState}
        indicators={indicatorState}
        menuActions={menuActions}
        timeframe={timeframe}
        pipDigits={pipDigits}
        selectedSymbol={selectedSymbol}
        tick={tick}
        activeIndicators={activeIndicators}
        chartPrefs={chartPrefs}
        isDark={isDark}
        activePlugins={activePlugins}
        accountId={accountId}
        onUpdateDrawing={onUpdateDrawing}
        onRemoveDrawing={onRemoveDrawing}
        onQuickOrder={onQuickOrder}
        onClearDrawings={onClearDrawings}
        onClearIndicators={onClearIndicators}
        onTogglePlugin={onTogglePlugin}
        drawings={drawings}
      />

      <div ref={refs.containerRef} className="w-full h-full" onContextMenu={menuActions.handleChartContextMenu} />
      <DrawingToolRail drawingTool={drawingTool} onDrawingTool={(t) => onDrawingToolSelect?.(t)} />
    </div>
  );
}

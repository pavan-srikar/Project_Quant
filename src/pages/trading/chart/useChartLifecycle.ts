import {
  createChart,
  type LogicalRange,
} from "lightweight-charts";
import { useEffect, useRef, useState } from "react";
import { buildChartOptions } from "./chartConfig.ts";
import { makeHistoryLoader } from "./chartHistoryLoader.ts";
import { initChartSeries } from "./chartSeriesInit.ts";
import { createChartWheelHandler } from "./chartWheelHandler.ts";
import { initDrawingToolsManager } from "./drawingManagerInit.ts";
import type { ChartLifecycleParams } from "./types.ts";
import { useChartOptionSync } from "./useChartOptionSync.ts";

export type { ChartLifecycleParams };

export function useChartLifecycle(params: ChartLifecycleParams) {
  const {
    containerRef,
    chartRef,
    candleSeriesRef,
    volumeSeriesRef,
    drawingManagerRef,
    loadMoreRef,
    hasUserPannedOrZoomedRef,
    timeframeRef,
    allCandlesRef,
    lastCandleRef,
    lastLoadKeyRef,
    lastLoadedSeriesRef,
    liveCandleTsRef,
    legendVolRef,
    legendRestoredRef,
    lastGapRefetchAtRef,
    bidLineRef,
    askLineRef,
    midLineRef,
    chartPluginsRef,
    drawingMenuOpenedRef,
    onChartReady,
    setLegend,
    setHistoricalExtra,
    setSelectedDrawingIds,
    setShowDrawingSettings,
    setContextMenu,
    drawingToolRef,
    drawingsRef,
    magnetRef,
    stayInModeRef,
    accountEquityRef,
    styleDefaultsRef,
    onAddDrawingRef,
    onUpdateDrawingRef,
    onRemoveDrawingRef,
    onDrawingCompleteRef,
    onDrawingToolSelectRef,
    onUndoDrawingRef,
    onRedoDrawingRef,
    isDark,
    pipDigits,
    colors,
    chartPrefs,
    selectedSymbol,
    timeframe,
    hideTimeScale,
  } = params;

  const [chartEpoch, setChartEpoch] = useState(0);
  const onChartReadyRef = useRef(onChartReady);
  onChartReadyRef.current = onChartReady;

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(
      containerRef.current,
      buildChartOptions(colors, chartPrefs, timeframeRef.current, selectedSymbol),
    );

    chartRef.current = chart;
    onChartReadyRef.current?.(chart);

    const { candleSeries, volumeSeries } = initChartSeries(
      chart,
      colors,
      pipDigits,
      legendRestoredRef,
      lastCandleRef,
      legendVolRef,
      setLegend,
    );
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        chart.applyOptions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    ro.observe(containerRef.current);

    const drawingManager = initDrawingToolsManager({
      chart,
      candleSeries,
      container: containerRef.current,
      timeframeRef,
      accountEquityRef,
      allCandlesRef,
      drawingToolRef,
      drawingsRef,
      magnetRef,
      stayInModeRef,
      styleDefaultsRef,
      onAddDrawingRef,
      onUpdateDrawingRef,
      onRemoveDrawingRef,
      onDrawingCompleteRef,
      onDrawingToolSelectRef,
      onUndoDrawingRef,
      onRedoDrawingRef,
      setSelectedDrawingIds,
      setShowDrawingSettings,
      setContextMenu,
      drawingMenuOpenedRef,
    });
    drawingManagerRef.current = drawingManager;

    let historyLoadCancelled = false;
    const handleRangeChange = makeHistoryLoader(
      selectedSymbol,
      timeframeRef,
      candleSeriesRef,
      loadMoreRef,
      (bars) => {
        if (!historyLoadCancelled) setHistoricalExtra((prev) => [...bars, ...prev]);
      },
    );
    const onRangeChange = (range: LogicalRange | null) => {
      if (!range) return;
      const state = loadMoreRef.current;
      if (range.from < 0 && (state.noMoreData || range.from < -5)) {
        const series = candleSeriesRef.current;
        const totalBars = series ? series.data().length : 0;
        if (totalBars > 0 && range.to > totalBars + 12) {
          try {
            chart.timeScale().setVisibleLogicalRange({
              from: 0,
              to: totalBars + 8,
            });
          } catch {}
        }
      }
      handleRangeChange(range);
    };
    chart.timeScale().subscribeVisibleLogicalRangeChange(onRangeChange);

    const container = containerRef.current;
    const onWheel = createChartWheelHandler(
      container,
      chart,
      candleSeriesRef,
      pipDigits,
      loadMoreRef,
      handleRangeChange,
    );
    container.addEventListener("wheel", onWheel, { capture: true, passive: false });
    const onUserInteraction = () => {
      hasUserPannedOrZoomedRef.current = true;
    };
    container.addEventListener("pointerdown", onUserInteraction, { passive: true });
    container.addEventListener("wheel", onUserInteraction, { passive: true });

    setChartEpoch((e) => e + 1);

    return () => {
      container.removeEventListener("wheel", onWheel, { capture: true } as EventListenerOptions);
      container.removeEventListener("pointerdown", onUserInteraction);
      container.removeEventListener("wheel", onUserInteraction);
      historyLoadCancelled = true;
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(onRangeChange);
      ro.disconnect();
      drawingManager.destroy();
      drawingManagerRef.current = null;
      setSelectedDrawingIds([]);
      setShowDrawingSettings(false);
      chart.remove();
      chartRef.current = null;
      onChartReadyRef.current?.(null);
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      bidLineRef.current = null;
      askLineRef.current = null;
      midLineRef.current = null;
      chartPluginsRef.current = [];
      lastLoadKeyRef.current = "";
      lastLoadedSeriesRef.current = null;
      lastCandleRef.current = null;
      legendVolRef.current = 0;
      liveCandleTsRef.current = 0;
      loadMoreRef.current = {
        loading: false,
        noMoreData: false,
        lastFetchedBeforeMs: 0,
        fetchFromMs: 0,
      };
      lastGapRefetchAtRef.current = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isDark,
    pipDigits,
    colors.background,
    colors.text,
    colors.grid,
    colors.crosshair,
    colors.watermark,
    colors.up,
    colors.down,
    selectedSymbol,
  ]);

  useEffect(() => {
    if (chartRef.current) {
      onChartReady?.(chartRef.current);
    }
  }, [onChartReady, chartRef]);

  useChartOptionSync({
    chartRef,
    candleSeriesRef,
    volumeSeriesRef,
    drawingManagerRef,
    timeframeRef,
    chartPrefs,
    colors,
    selectedSymbol,
    timeframe,
    chartEpoch,
    hideTimeScale,
  });

  return { chartEpoch };
}

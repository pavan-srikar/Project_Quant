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
    containerRef, chartRef, candleSeriesRef, volumeSeriesRef, drawingManagerRef,
    loadMoreRef, hasUserPannedOrZoomedRef, isScrolledBackRef, isChangingTfRef,
    pendingHistoricalTargetRef, lastVisibleTimeRangeRef, timeframeRef, allCandlesRef,
    lastCandleRef, lastLoadKeyRef, lastLoadedSeriesRef, liveCandleTsRef, legendVolRef,
    legendRestoredRef, lastGapRefetchAtRef, bidLineRef, askLineRef, midLineRef,
    chartPluginsRef, drawingMenuOpenedRef, onChartReady, setLegend, setHistoricalExtra,
    setSelectedDrawingIds, setShowDrawingSettings, setContextMenu, drawingToolRef,
    drawingsRef, magnetRef, stayInModeRef, accountEquityRef, styleDefaultsRef,
    onAddDrawingRef, onUpdateDrawingRef, onRemoveDrawingRef, onDrawingCompleteRef,
    onDrawingToolSelectRef, onUndoDrawingRef, onRedoDrawingRef, isDark, pipDigits,
    colors, chartPrefs, selectedSymbol, timeframe, hideTimeScale,
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

    const isUserInteractingRef = { current: false };
    const isApplyingHistoryRef = { current: false };

    let historyLoadCancelled = false;
    const handleRangeChange = makeHistoryLoader(
      selectedSymbol,
      timeframeRef,
      candleSeriesRef,
      loadMoreRef,
      (bars, isForward = false) => {
        if (historyLoadCancelled || bars.length === 0 || isChangingTfRef?.current) return;
        setHistoricalExtra((prev) => {
          const map = new Map<number, any>();
          for (const b of bars) map.set(b.time, b);
          for (const p of prev) {
            if (!map.has(p.time)) map.set(p.time, p);
          }
          return Array.from(map.values()).sort((a, b) => a.time - b.time);
        });
        if (!isForward) {
          const currentRange = chart.timeScale().getVisibleLogicalRange();
          if (currentRange) {
            isApplyingHistoryRef.current = true;
            requestAnimationFrame(() => {
              try {
                chart.timeScale().setVisibleLogicalRange({
                  from: currentRange.from + bars.length,
                  to: currentRange.to + bars.length,
                });
              } catch {}
              requestAnimationFrame(() => {
                isApplyingHistoryRef.current = false;
              });
            });
          }
        }
      },
      () => allCandlesRef.current,
      hasUserPannedOrZoomedRef,
      isChangingTfRef,
      isUserInteractingRef,
      isApplyingHistoryRef,
    );
    const onRangeChange = (range: LogicalRange | null) => {
      if (!range || isChangingTfRef?.current || isApplyingHistoryRef.current) return;
      const totalBars = allCandlesRef.current.length;
      if (totalBars > 0) {
        const isBack = range.to < totalBars - 2;
        if (isScrolledBackRef) isScrolledBackRef.current = isBack;
        if (isBack && lastVisibleTimeRangeRef) {
          try {
            const vr = chart.timeScale().getVisibleRange();
            if (vr && typeof vr.from === "number" && typeof vr.to === "number" && vr.from < vr.to) {
              const centerTime = Math.round(((vr.from as number) + (vr.to as number)) / 2);
              const barCount = Math.max(30, Math.min(200, Math.round(range.to - range.from)));
              lastVisibleTimeRangeRef.current = {
                from: vr.from as number,
                to: vr.to as number,
                centerTime,
                barCount,
              };
            }
          } catch {}
        } else if (hasUserPannedOrZoomedRef.current && range.to >= totalBars - 2) {
          // Explicit user scroll to the live edge
          const lastBar = allCandlesRef.current[totalBars - 1];
          const lastBarTime = lastBar ? Number(lastBar.time ?? (lastBar as any).timestamp) : 0;
          const isLive = lastBarTime > 0 && Date.now() / 1000 - lastBarTime < 86400;
          if (isLive) {
            if (pendingHistoricalTargetRef) pendingHistoricalTargetRef.current = null;
            if (lastVisibleTimeRangeRef) lastVisibleTimeRangeRef.current = null;
          }
        } else if (hasUserPannedOrZoomedRef.current && !pendingHistoricalTargetRef?.current && lastVisibleTimeRangeRef) {
          lastVisibleTimeRangeRef.current = null;
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
    let wheelTimer: any = null;
    const onPointerDown = () => {
      isUserInteractingRef.current = true;
      hasUserPannedOrZoomedRef.current = true;
    };
    const onPointerUp = () => {
      isUserInteractingRef.current = false;
    };
    const onWheelInteraction = () => {
      isUserInteractingRef.current = true;
      hasUserPannedOrZoomedRef.current = true;
      if (wheelTimer) clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => {
        isUserInteractingRef.current = false;
      }, 1500);
    };
    container.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    window.addEventListener("pointercancel", onPointerUp, { passive: true });
    container.addEventListener("wheel", onWheelInteraction, { passive: true });

    setChartEpoch((e) => e + 1);

    return () => {
      container.removeEventListener("wheel", onWheel, { capture: true } as EventListenerOptions);
      container.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      container.removeEventListener("wheel", onWheelInteraction);
      if (wheelTimer) clearTimeout(wheelTimer);
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
      loadMoreRef.current = { loading: false, noMoreData: false, lastFetchedBeforeMs: 0, fetchFromMs: 0 };
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

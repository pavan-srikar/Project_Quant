import type { IChartApi, ISeriesApi } from "lightweight-charts";
import { useEffect, type RefObject } from "react";
import type { useChartPreferences } from "../../../hooks/useChartPreferences.ts";
import type { DrawingToolsManager } from "../../../lib/chart-plugins/drawing-tools/manager.ts";
import { TF_INTERVAL_MS, type Timeframe } from "../constants.ts";
import type { ChartColors } from "./types.ts";

export interface ChartOptionSyncParams {
  chartRef: RefObject<IChartApi | null>;
  candleSeriesRef: RefObject<ISeriesApi<"Candlestick"> | null>;
  volumeSeriesRef: RefObject<ISeriesApi<"Histogram"> | null>;
  drawingManagerRef: RefObject<DrawingToolsManager | null>;
  timeframeRef: RefObject<Timeframe>;
  chartPrefs: ReturnType<typeof useChartPreferences>;
  colors: ChartColors;
  selectedSymbol: string;
  timeframe: Timeframe;
  chartEpoch: number;
  hideTimeScale?: boolean;
}

export function useChartOptionSync({
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
  hideTimeScale = false,
}: ChartOptionSyncParams) {
  // 1. Watermark sync
  useEffect(() => {
    chartRef.current?.applyOptions({
      watermark: {
        visible: chartPrefs.showWatermark,
        text: selectedSymbol,
        fontSize: 56,
        color: colors.watermark,
        horzAlign: "center",
        vertAlign: "center",
      },
    });
  }, [selectedSymbol, colors.watermark, chartPrefs.showWatermark, chartEpoch, chartRef]);

  // 2. Live candle styles
  useEffect(() => {
    const up = colors.up;
    const down = colors.down;
    candleSeriesRef.current?.applyOptions({
      upColor: up,
      downColor: down,
      borderUpColor: up,
      borderDownColor: down,
      wickUpColor: up,
      wickDownColor: down,
      wickVisible: chartPrefs.showWicks,
      borderVisible: chartPrefs.showCandleBorders,
    });
  }, [
    chartPrefs.candleUpColor,
    chartPrefs.candleDownColor,
    chartPrefs.showWicks,
    chartPrefs.showCandleBorders,
    colors.up,
    colors.down,
    chartEpoch,
    candleSeriesRef,
  ]);

  // 3. Volume visibility
  useEffect(() => {
    volumeSeriesRef.current?.applyOptions({ visible: chartPrefs.showVolume });
  }, [chartPrefs.showVolume, chartEpoch, volumeSeriesRef]);

  // 4. Grid visibility
  useEffect(() => {
    chartRef.current?.applyOptions({
      grid: {
        vertLines: { visible: chartPrefs.showGrid },
        horzLines: { visible: chartPrefs.showGrid },
      },
    });
  }, [chartPrefs.showGrid, chartEpoch, chartRef]);

  // 5. Timeframe switch in-place
  useEffect(() => {
    timeframeRef.current = timeframe;
    chartRef.current?.applyOptions({
      timeScale: {
        secondsVisible: timeframe === "1m",
        minBarSpacing: 0.5,
      },
    });
    drawingManagerRef.current?.updateTimeframe(
      timeframe,
      (TF_INTERVAL_MS[timeframe] ?? 60_000) / 1000,
    );
  }, [timeframe, chartRef, drawingManagerRef, timeframeRef]);

  // 6. TimeScale visibility sync (hidden when bottom indicators panel is active)
  useEffect(() => {
    chartRef.current?.applyOptions({
      timeScale: {
        visible: !hideTimeScale,
      },
    });
  }, [chartEpoch, chartRef, hideTimeScale]);

  // 7. AutoScale sync
  useEffect(() => {
    chartRef.current?.priceScale("right").applyOptions({
      autoScale: chartPrefs.autoScale ?? false,
    });
  }, [chartPrefs.autoScale, chartEpoch, chartRef]);
}

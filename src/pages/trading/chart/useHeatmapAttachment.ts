import { useEffect, useRef, type RefObject } from "react";
import type { IChartApi, ISeriesApi } from "lightweight-charts";
import type { ChartPreferences, ChartType } from "../../../hooks/useChartPreferences.ts";
import { HeatmapPrimitive } from "../../../lib/chart-plugins/heatmap/heatmap-primitive.ts";
import type { HeatmapColorMap } from "../../../lib/chart-plugins/heatmap/heatmap-types.ts";
import type { Candle } from "../../../services/schemas.ts";
import type { ChartColors } from "./types.ts";

export interface UseHeatmapAttachmentParams {
  chartRef: RefObject<IChartApi | null>;
  candleSeriesRef: RefObject<ISeriesApi<"Candlestick"> | null>;
  allCandlesRef: RefObject<Candle[]>;
  chartType: ChartType;
  colors: ChartColors;
  chartEpoch: number;
  timeframe: string;
  chartPrefs?: ChartPreferences;
}

export function useHeatmapAttachment({
  candleSeriesRef,
  allCandlesRef,
  chartType,
  colors,
  chartEpoch,
  timeframe,
  chartPrefs,
}: UseHeatmapAttachmentParams): void {
  const heatmapRef = useRef<HeatmapPrimitive | null>(null);

  // 1. Attach primitive whenever candleSeries is recreated / ready
  useEffect(() => {
    const series = candleSeriesRef.current;
    if (!series) return;

    if (!heatmapRef.current) {
      const primitive = new HeatmapPrimitive();
      primitive.setGetCandles(() => allCandlesRef.current);
      try {
        series.attachPrimitive(primitive);
        heatmapRef.current = primitive;
      } catch (err) {
        console.warn("Failed to attach HeatmapPrimitive:", err);
      }
    }

    return () => {
      if (heatmapRef.current && series) {
        try {
          series.detachPrimitive(heatmapRef.current);
        } catch {
          /* ignore */
        }
        heatmapRef.current = null;
      }
    };
  }, [candleSeriesRef, chartEpoch]);

  // 2. Synchronize enabled state, user settings, and candle styling
  useEffect(() => {
    const primitive = heatmapRef.current;
    const series = candleSeriesRef.current;
    if (!series) return;

    const isHeatmap = chartType === "heatmap";

    if (primitive) {
      primitive.setGetCandles(() => allCandlesRef.current);
      primitive.setEnabled(isHeatmap);
      if (chartPrefs) {
        primitive.setSettings({
          brightness: chartPrefs.heatmapBrightness,
          bandHeight: chartPrefs.heatmapBandHeight,
          minOpacity: chartPrefs.heatmapMinOpacity,
          colorMap: (chartPrefs.heatmapColorMap as HeatmapColorMap) || "viridis",
          sensitivity: chartPrefs.heatmapSensitivity || "medium",
          thresholdRatio: chartPrefs.heatmapThresholdRatio,
          ceilingRatio: chartPrefs.heatmapCeilingRatio,
        });
      }
    }

    if (isHeatmap) {
      // In heatmap mode, candles are crisp with solid borders on top of the heatmap
      series.applyOptions({
        upColor: colors.up,
        downColor: colors.down,
        borderUpColor: colors.up,
        borderDownColor: colors.down,
        wickUpColor: colors.up,
        wickDownColor: colors.down,
      });
    }
  }, [
    chartType,
    timeframe,
    colors,
    chartEpoch,
    candleSeriesRef,
    allCandlesRef,
    chartPrefs?.heatmapBrightness,
    chartPrefs?.heatmapBandHeight,
    chartPrefs?.heatmapMinOpacity,
    chartPrefs?.heatmapColorMap,
    chartPrefs?.heatmapSensitivity,
    chartPrefs?.heatmapThresholdRatio,
    chartPrefs?.heatmapCeilingRatio,
  ]);
}

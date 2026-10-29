import { useEffect, useRef, type RefObject } from "react";
import type { IChartApi, ISeriesApi } from "lightweight-charts";
import { FootprintPrimitive } from "../../../lib/chart-plugins/footprint/footprint-primitive.ts";
import type { Candle } from "../../../services/schemas.ts";
import type { ChartColors } from "./types.ts";

export interface UseFootprintAttachmentParams {
  chartRef: RefObject<IChartApi | null>;
  candleSeriesRef: RefObject<ISeriesApi<"Candlestick"> | null>;
  allCandlesRef: RefObject<Candle[]>;
  chartType: "candles" | "footprint";
  colors: ChartColors;
  chartEpoch: number;
  timeframe: string;
}

export function useFootprintAttachment({
  chartRef,
  candleSeriesRef,
  allCandlesRef,
  chartType,
  colors,
  chartEpoch,
  timeframe,
}: UseFootprintAttachmentParams): void {
  const footprintRef = useRef<FootprintPrimitive | null>(null);

  // 1. Attach primitive whenever candleSeries is recreated / ready
  useEffect(() => {
    const series = candleSeriesRef.current;
    if (!series) return;

    if (!footprintRef.current) {
      const primitive = new FootprintPrimitive();
      primitive.setGetCandles(() => allCandlesRef.current);
      try {
        series.attachPrimitive(primitive);
        footprintRef.current = primitive;
      } catch (err) {
        console.warn("Failed to attach FootprintPrimitive:", err);
      }
    }

    return () => {
      if (footprintRef.current && series) {
        try {
          series.detachPrimitive(footprintRef.current);
        } catch {
          /* ignore */
        }
        footprintRef.current = null;
      }
    };
  }, [candleSeriesRef, chartEpoch]);

  // 2. Synchronize enabled state, bar spacing, and candle transparency
  useEffect(() => {
    const primitive = footprintRef.current;
    const series = candleSeriesRef.current;
    if (!series) return;

    const isFootprint = chartType === "footprint";

    if (primitive) {
      primitive.setGetCandles(() => allCandlesRef.current);
      primitive.setEnabled(isFootprint);
    }

    const chart = chartRef.current;
    if (isFootprint) {
      if (chart) {
        try {
          const curSpacing = chart.timeScale().options().barSpacing ?? 14;
          if (curSpacing < 60) {
            chart.timeScale().applyOptions({ barSpacing: 72 });
          }
        } catch {
          /* ignore */
        }
      }
      series.applyOptions({
        upColor: "transparent",
        downColor: "transparent",
        borderUpColor: "transparent",
        borderDownColor: "transparent",
        wickUpColor: colors.up,
        wickDownColor: colors.down,
      });
    } else {
      if (chart) {
        try {
          const curSpacing = chart.timeScale().options().barSpacing ?? 14;
          if (curSpacing >= 65) {
            chart.timeScale().applyOptions({ barSpacing: 14 });
          }
        } catch {
          /* ignore */
        }
      }
      series.applyOptions({
        upColor: colors.up,
        downColor: colors.down,
        borderUpColor: colors.up,
        borderDownColor: colors.down,
        wickUpColor: colors.up,
        wickDownColor: colors.down,
      });
    }

    primitive?.requestRedraw();
  }, [chartType, timeframe, colors, chartEpoch, chartRef, candleSeriesRef, allCandlesRef]);
}

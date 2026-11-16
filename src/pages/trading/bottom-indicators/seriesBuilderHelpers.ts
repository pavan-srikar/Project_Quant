import { LineStyle, type IChartApi, type ISeriesApi } from "lightweight-charts";
import { alignHistogramData, alignLineData } from "./indicatorDataAlignment.ts";
import type { IndicatorSettings } from "../../../hooks/useIndicatorSettings.ts";

export function getMacdHistColor(
  val: number,
  prevVal: number,
  histUp = "#26a69a",
  histDown = "#ef5350",
  histUpLight = "rgba(38, 166, 154, 0.45)",
  histDownLight = "rgba(239, 83, 80, 0.45)",
): string {
  if (val >= 0) {
    return val >= prevVal ? histUp : histUpLight;
  }
  return val <= prevVal ? histDown : histDownLight;
}

export function formatMacdHistogramData(
  candleTimes: number[],
  rawHistogram: { time: number; value: number }[],
  histUp = "#26a69a",
  histDown = "#ef5350",
) {
  const aligned = alignHistogramData(candleTimes, rawHistogram);
  return aligned.map((item, idx) => {
    if ("value" in item && item.value !== undefined) {
      const prev = idx > 0 && "value" in aligned[idx - 1]! ? (aligned[idx - 1] as any).value ?? 0 : 0;
      return { ...item, color: getMacdHistColor(item.value, prev, histUp, histDown) };
    }
    return item;
  });
}

export function buildCustomPlots(
  chart: IChartApi,
  candleTimes: number[],
  plots: {
    id: string;
    title: string;
    color: string;
    lineWidth: number;
    style?: "columns" | "histogram" | "line" | "area" | "circles" | "cross";
    values: { time: number; value: number }[];
  }[],
  hlines: { price: number; title: string; color: string }[] | undefined,
  currentSettings: IndicatorSettings,
): { mainSeries: ISeriesApi<any>; allSeries: ISeriesApi<any>[] } {
  const allSeries: ISeriesApi<any>[] = [];
  let mainSeries: ISeriesApi<any> | undefined;

  plots.forEach((plt, idx) => {
    const isHist = plt.style === "histogram" || plt.style === "columns";
    const s = isHist
      ? chart.addHistogramSeries({
          priceLineVisible: false,
          lastValueVisible: false,
          priceFormat: { type: "custom", minMove: 0.01, formatter: (p: number) => p.toFixed(2) },
        })
      : chart.addLineSeries({
          color: plt.color || currentSettings.color || "#2962ff",
          lineWidth: (plt.lineWidth as any) || 1.5,
          priceLineVisible: false,
          lastValueVisible: true,
          priceFormat: { type: "custom", minMove: 0.01, formatter: (p: number) => p.toFixed(2) },
        });

    s.setData(isHist ? alignHistogramData(candleTimes, plt.values) : alignLineData(candleTimes, plt.values));
    allSeries.push(s);
    if (idx === 0) mainSeries = s;
  });

  if (!mainSeries && allSeries.length > 0) {
    mainSeries = allSeries[0];
  }

  if (mainSeries && hlines) {
    hlines.forEach((h) => {
      mainSeries!.createPriceLine({
        price: h.price,
        color: h.color || "rgba(120, 123, 134, 0.35)",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: h.title || "",
      });
    });
  }

  return { mainSeries: mainSeries!, allSeries };
}

import type { IndicatorSettings } from "../../../hooks/useIndicatorSettings.ts";
import { alignHistogramData, alignLineData } from "./indicatorDataAlignment.ts";
import { formatMacdHistogramData } from "./seriesBuilderHelpers.ts";
import type { IndicatorCalculatedData, SeriesState } from "./types.ts";

export function updateSeriesData(
  state: SeriesState,
  indicatorData: NonNullable<IndicatorCalculatedData>,
  candleTimes: number[],
  currentSettings: IndicatorSettings,
): void {
  if (
    indicatorData.type === "RSI" ||
    indicatorData.type === "ATR" ||
    indicatorData.type === "CCI" ||
    indicatorData.type === "WR"
  ) {
    state.mainSeries.setData(alignLineData(candleTimes, indicatorData.data));
  } else if (indicatorData.type === "CUSTOM") {
    if (indicatorData.plots && indicatorData.plots.length > 0) {
      indicatorData.plots.forEach((plt, idx) => {
        const s = state.allSeries[idx];
        if (s) {
          const isHist = plt.style === "histogram" || plt.style === "columns";
          s.setData(isHist ? alignHistogramData(candleTimes, plt.values) : alignLineData(candleTimes, plt.values));
        }
      });
    } else {
      state.mainSeries.setData(alignLineData(candleTimes, indicatorData.data));
    }
  } else if (indicatorData.type === "MACD") {
    const histUp = currentSettings.histUpColor || "#26a69a";
    const histDown = currentSettings.histDownColor || "#ef5350";
    if (state.extraSeries?.hist) {
      state.extraSeries.hist.setData(
        formatMacdHistogramData(candleTimes, indicatorData.data.histogram, histUp, histDown),
      );
    }
    state.mainSeries.setData(alignLineData(candleTimes, indicatorData.data.macd));
    if (state.extraSeries?.signal) {
      state.extraSeries.signal.setData(
        alignLineData(candleTimes, indicatorData.data.signal),
      );
    }
  } else if (indicatorData.type === "STOCH") {
    state.mainSeries.setData(alignLineData(candleTimes, indicatorData.data.k));
    if (state.extraSeries?.d) {
      state.extraSeries.d.setData(
        alignLineData(candleTimes, indicatorData.data.d),
      );
    }
  }
}

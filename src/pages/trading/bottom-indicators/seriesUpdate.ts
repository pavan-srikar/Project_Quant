import type { IndicatorSettings } from "../../../hooks/useIndicatorSettings.ts";
import { alignHistogramData, alignLineData } from "./indicatorDataAlignment.ts";
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
    indicatorData.type === "WR" ||
    indicatorData.type === "CUSTOM"
  ) {
    state.mainSeries.setData(alignLineData(candleTimes, indicatorData.data));
  } else if (indicatorData.type === "MACD") {
    const histUp = currentSettings.histUpColor || "#26a69a";
    const histDown = currentSettings.histDownColor || "#ef5350";
    if (state.extraSeries?.hist) {
      state.extraSeries.hist.setData(
        alignHistogramData(
          candleTimes,
          indicatorData.data.histogram.map((h) => ({
            time: h.time,
            value: h.value,
          })),
        ).map((item) => {
          if ("value" in item && item.value !== undefined) {
            return { ...item, color: item.value >= 0 ? histUp : histDown };
          }
          return item;
        }),
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

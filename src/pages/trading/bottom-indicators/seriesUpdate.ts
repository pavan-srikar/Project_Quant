import type { Time } from "lightweight-charts";
import type { IndicatorSettings } from "../../../hooks/useIndicatorSettings.ts";
import { alignHistogramData, alignLineData } from "./indicatorDataAlignment.ts";
import { formatMacdHistogramData } from "./seriesBuilderHelpers.ts";
import type { IndicatorCalculatedData, SeriesState } from "./types.ts";

function tickUpdateSeries(
  state: SeriesState,
  indicatorData: NonNullable<IndicatorCalculatedData>,
  currentSettings: IndicatorSettings,
): void {
  if (
    indicatorData.type === "RSI" ||
    indicatorData.type === "ATR" ||
    indicatorData.type === "CCI" ||
    indicatorData.type === "WR"
  ) {
    const last = indicatorData.data[indicatorData.data.length - 1];
    if (last) state.mainSeries.update({ time: last.time as Time, value: last.value });
  } else if (indicatorData.type === "CUSTOM") {
    if (indicatorData.plots && indicatorData.plots.length > 0) {
      indicatorData.plots.forEach((plt, idx) => {
        const s = state.allSeries[idx];
        const last = plt.values[plt.values.length - 1];
        if (s && last) {
          const isHist = plt.style === "histogram" || plt.style === "columns";
          if (isHist) {
            s.update({
              time: last.time as Time,
              value: last.value,
              color: (last as any).color || (last.value >= 0 ? "#0ecb81" : "#f6465d"),
            });
          } else {
            s.update({ time: last.time as Time, value: last.value });
          }
        }
      });
    } else {
      const last = indicatorData.data[indicatorData.data.length - 1];
      if (last) state.mainSeries.update({ time: last.time as Time, value: last.value });
    }
  } else if (indicatorData.type === "MACD") {
    const histUp = currentSettings.histUpColor || "#26a69a";
    const histDown = currentSettings.histDownColor || "#ef5350";
    const lastMacd = indicatorData.data.macd[indicatorData.data.macd.length - 1];
    const lastSig = indicatorData.data.signal[indicatorData.data.signal.length - 1];
    const lastHist = indicatorData.data.histogram[indicatorData.data.histogram.length - 1];

    if (lastMacd) state.mainSeries.update({ time: lastMacd.time as Time, value: lastMacd.value });
    if (lastSig && state.extraSeries?.signal) {
      state.extraSeries.signal.update({ time: lastSig.time as Time, value: lastSig.value });
    }
    if (lastHist && state.extraSeries?.hist) {
      const color = lastHist.value >= 0 ? histUp : histDown;
      state.extraSeries.hist.update({
        time: lastHist.time as Time,
        value: lastHist.value,
        color,
      });
    }
  } else if (indicatorData.type === "STOCH") {
    const lastK = indicatorData.data.k[indicatorData.data.k.length - 1];
    const lastD = indicatorData.data.d[indicatorData.data.d.length - 1];
    if (lastK) state.mainSeries.update({ time: lastK.time as Time, value: lastK.value });
    if (lastD && state.extraSeries?.d) {
      state.extraSeries.d.update({ time: lastD.time as Time, value: lastD.value });
    }
  }
}

function fullSetSeriesData(
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

export function updateSeriesData(
  state: SeriesState,
  indicatorData: NonNullable<IndicatorCalculatedData>,
  candleTimes: number[],
  currentSettings: IndicatorSettings,
): void {
  const currentCount = candleTimes.length;
  const currentLastTime = candleTimes[currentCount - 1] ?? 0;
  const currentFirstTime = candleTimes[0] ?? 0;

  const isSameInstrument =
    state.lastFirstTime != null && state.lastFirstTime === currentFirstTime;

  const isIncrementalTick =
    isSameInstrument &&
    state.lastBarCount != null &&
    state.lastBarTime != null &&
    (
      (currentCount === state.lastBarCount && currentLastTime === state.lastBarTime) ||
      (currentCount === state.lastBarCount + 1 && currentLastTime > state.lastBarTime)
    );

  state.lastBarCount = currentCount;
  state.lastBarTime = currentLastTime;
  state.lastFirstTime = currentFirstTime;

  if (isIncrementalTick) {
    try {
      tickUpdateSeries(state, indicatorData, currentSettings);
      return;
    } catch {
      // Fallback to full set data if incremental update encounters unexpected series gap
    }
  }

  fullSetSeriesData(state, indicatorData, candleTimes, currentSettings);
}

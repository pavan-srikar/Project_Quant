import type { CandlestickData, Time } from "lightweight-charts";
import { useMemo } from "react";
import type { IndicatorSettings } from "../../../hooks/useIndicatorSettings.ts";
import {
  atr,
  cci,
  macd,
  rsi,
  stochastic,
  williamsR,
  type IndicatorType,
} from "../../../lib/indicators.ts";
import { toIndicatorCandles } from "../utils.ts";
import type { IndicatorCalculatedData } from "./types.ts";

export function useIndicatorCalculation(
  candles: (CandlestickData<Time> | any)[],
  selectedType: IndicatorType,
  currentSettings: IndicatorSettings,
) {
  const indCandles = useMemo(() => toIndicatorCandles(candles), [candles]);
  const candleTimes = useMemo(
    () => indCandles.map((c) => c.time),
    [indCandles],
  );

  const indicatorData = useMemo<IndicatorCalculatedData>(() => {
    if (indCandles.length === 0) return null;

    switch (selectedType) {
      case "RSI": {
        const period = currentSettings.period ?? 14;
        const pts = rsi(indCandles, period);
        return { type: "RSI", period, data: pts };
      }
      case "MACD": {
        const fast = currentSettings.fast ?? 12;
        const slow = currentSettings.slow ?? 26;
        const signal = currentSettings.signal ?? 9;
        const res = macd(indCandles, fast, slow, signal);
        return { type: "MACD", fast, slow, signal, data: res };
      }
      case "ATR": {
        const period = currentSettings.period ?? 14;
        const pts = atr(indCandles, period);
        return { type: "ATR", period, data: pts };
      }
      case "STOCH": {
        const kPeriod = currentSettings.kPeriod ?? 14;
        const dPeriod = currentSettings.dPeriod ?? 3;
        const res = stochastic(indCandles, kPeriod, dPeriod);
        return { type: "STOCH", kPeriod, dPeriod, data: res };
      }
      case "CCI": {
        const period = currentSettings.period ?? 20;
        const pts = cci(indCandles, period);
        return { type: "CCI", period, data: pts };
      }
      case "WR": {
        const period = currentSettings.period ?? 14;
        const pts = williamsR(indCandles, period);
        return { type: "WR", period, data: pts };
      }
      default:
        return null;
    }
  }, [
    indCandles,
    selectedType,
    currentSettings.period,
    currentSettings.fast,
    currentSettings.slow,
    currentSettings.signal,
    currentSettings.kPeriod,
    currentSettings.dPeriod,
  ]);

  const timePriceMap = useMemo(() => {
    const map = new Map<number, number>();
    if (!indicatorData) return map;

    if (
      indicatorData.type === "RSI" ||
      indicatorData.type === "ATR" ||
      indicatorData.type === "CCI" ||
      indicatorData.type === "WR"
    ) {
      for (const p of indicatorData.data) {
        map.set(p.time, p.value);
      }
    } else if (indicatorData.type === "MACD") {
      for (const m of indicatorData.data.macd) {
        map.set(m.time, m.value);
      }
    } else if (indicatorData.type === "STOCH") {
      for (const k of indicatorData.data.k) {
        map.set(k.time, k.value);
      }
    }
    return map;
  }, [indicatorData]);

  return {
    indCandles,
    candleTimes,
    indicatorData,
    timePriceMap,
  };
}

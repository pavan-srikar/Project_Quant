import type { CandlestickData, Time } from "lightweight-charts";
import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  getCustomPineIndicators,
  parsePineScript,
  evaluatePineScriptAsync,
} from "../../../lib/pinescript";
import { toIndicatorCandles } from "../utils.ts";
import type { IndicatorCalculatedData } from "./types.ts";

export function useIndicatorCalculation(
  candles: (CandlestickData<Time> | any)[],
  selectedType: IndicatorType,
  currentSettings: IndicatorSettings,
) {
  const indCandles = useMemo(() => toIndicatorCandles(candles), [candles]);
  const candleTimes = useMemo(() => indCandles.map((c) => c.time), [indCandles]);
  const [asyncPineData, setAsyncPineData] = useState<IndicatorCalculatedData>(null);
  const lastComputedKeyRef = useRef<string>("");

  useEffect(() => {
    if (!selectedType.startsWith("pine_") || indCandles.length === 0) {
      setAsyncPineData(null);
      lastComputedKeyRef.current = "";
      return;
    }
    const custom = getCustomPineIndicators().find((c) => c.id === selectedType);
    if (!custom) {
      setAsyncPineData(null);
      lastComputedKeyRef.current = "";
      return;
    }

    const mergedInputs = {
      ...(custom.inputs || {}),
      ...(currentSettings.pineInputs || {}),
    };
    const compKey = `${selectedType}_${custom.code.length}_${JSON.stringify(mergedInputs)}_${indCandles.length}_${indCandles[indCandles.length - 1]?.time ?? 0}`;
    if (lastComputedKeyRef.current === compKey && asyncPineData) {
      return;
    }

    let cancelled = false;
    const compute = async () => {
      try {
        const parsed = parsePineScript(custom.code);
        const evalRes = await evaluatePineScriptAsync(indCandles, parsed, mergedInputs, custom.code);
        if (cancelled) return;
        lastComputedKeyRef.current = compKey;

        const visiblePlots = evalRes.plots.filter(
          (p) =>
            !p.displayNone &&
            !p.forceOverlay &&
            (currentSettings.plotVisibility?.[p.id] ??
              currentSettings.plotVisibility?.[p.title] ??
              true),
        );
        const firstPlot = visiblePlots[0] ?? evalRes.plots[0];
        const pts = firstPlot ? firstPlot.values : [];
        const plots = visiblePlots.map((p) => ({
          id: p.id,
          title: p.title,
          color:
            currentSettings.plotColors?.[p.id] ??
            currentSettings.plotColors?.[p.title] ??
            p.color,
          lineWidth:
            currentSettings.plotLineWidths?.[p.id] ??
            currentSettings.plotLineWidths?.[p.title] ??
            p.lineWidth,
          style: (currentSettings.plotStyles?.[p.id] as any) || p.style,
          values: p.values,
        }));
        const hlines = evalRes.hlines.map((h) => ({
          price: h.price,
          title: h.title,
          color: h.color,
        }));

        setAsyncPineData({
          type: "CUSTOM",
          name: custom.name,
          data: pts,
          plots: plots.length > 0 ? plots : undefined,
          hlines: hlines.length > 0 ? hlines : undefined,
          labels: evalRes.labels,
          boxes: evalRes.boxes,
          lines: evalRes.lines,
          tables: evalRes.tables,
        });
      } catch (err) {
        console.warn("[useIndicatorCalculation] Pine async evaluation error:", err);
      }
    };

    compute();
    return () => {
      cancelled = true;
    };
  }, [
    selectedType,
    indCandles.length,
    indCandles[indCandles.length - 1]?.time,
    currentSettings.pineInputs,
    currentSettings.plotVisibility,
    currentSettings.plotColors,
    currentSettings.plotLineWidths,
    currentSettings.plotStyles,
  ]);

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
      default: {
        if (selectedType.startsWith("pine_")) {
          return asyncPineData;
        }
        return null;
      }
    }
  }, [
    indCandles,
    selectedType,
    asyncPineData,
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
      indicatorData.type === "WR" ||
      indicatorData.type === "CUSTOM"
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

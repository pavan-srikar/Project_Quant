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
  const indCandles = toIndicatorCandles(candles);
  const firstBarTime = indCandles[0]?.time ?? 0;
  const firstBarClose = indCandles[0]?.close ?? 0;
  const lastBarTime = indCandles[indCandles.length - 1]?.time ?? 0;
  const candleTimes = useMemo(
    () => indCandles.map((c) => c.time),
    [indCandles.length, firstBarTime, lastBarTime],
  );
  const [asyncPineData, setAsyncPineData] = useState<IndicatorCalculatedData>(null);
  const lastComputedKeyRef = useRef<string>("");
  const activeCompKeyRef = useRef<string>("");
  const timePriceMapRef = useRef<Map<number, number>>(new Map());
  const prevDataLenRef = useRef<number>(0);

  useEffect(() => {
    if (!selectedType.startsWith("pine_") || indCandles.length === 0) {
      setAsyncPineData(null);
      lastComputedKeyRef.current = "";
      activeCompKeyRef.current = "";
      return;
    }
    const custom = getCustomPineIndicators().find((c) => c.id === selectedType);
    if (!custom) {
      setAsyncPineData(null);
      lastComputedKeyRef.current = "";
      activeCompKeyRef.current = "";
      return;
    }

    const mergedInputs = {
      ...(custom.inputs || {}),
      ...(currentSettings.pineInputs || {}),
    };
    const compKey = `${selectedType}_${custom.code.length}_${JSON.stringify(mergedInputs)}_${firstBarTime}_${firstBarClose}_${indCandles.length}_${lastBarTime}`;
    if (lastComputedKeyRef.current === compKey && asyncPineData) {
      return;
    }

    activeCompKeyRef.current = compKey;
    const compute = async () => {
      try {
        const parsed = parsePineScript(custom.code);
        const evalRes = await evaluatePineScriptAsync(indCandles, parsed, mergedInputs, custom.code);
        if (activeCompKeyRef.current !== compKey) return;
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

        if (activeCompKeyRef.current !== compKey) return;
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
  }, [
    selectedType,
    indCandles.length,
    firstBarTime,
    firstBarClose,
    lastBarTime,
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
    if (!indicatorData) {
      timePriceMapRef.current.clear();
      prevDataLenRef.current = 0;
      return timePriceMapRef.current;
    }

    const map = timePriceMapRef.current;
    let pts: { time: number; value: number }[] | undefined;
    if (
      indicatorData.type === "RSI" ||
      indicatorData.type === "ATR" ||
      indicatorData.type === "CCI" ||
      indicatorData.type === "WR" ||
      indicatorData.type === "CUSTOM"
    ) {
      pts = indicatorData.data;
    } else if (indicatorData.type === "MACD") {
      pts = indicatorData.data.macd;
    } else if (indicatorData.type === "STOCH") {
      pts = indicatorData.data.k;
    }

    if (!pts || pts.length === 0) {
      map.clear();
      prevDataLenRef.current = 0;
      return map;
    }

    // Fast path: live tick on current bar (same length) -> update last point O(1)
    if (map.size > 0 && pts.length === prevDataLenRef.current) {
      const lastPt = pts[pts.length - 1]!;
      map.set(lastPt.time, lastPt.value);
      return map;
    }

    // Fast path: single new bar appended
    if (map.size > 0 && pts.length === prevDataLenRef.current + 1) {
      const lastPt = pts[pts.length - 1]!;
      map.set(lastPt.time, lastPt.value);
      prevDataLenRef.current = pts.length;
      return map;
    }

    // Cold path: full rebuild on symbol switch / initial data load
    map.clear();
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i]!;
      map.set(p.time, p.value);
    }
    prevDataLenRef.current = pts.length;
    return map;
  }, [indicatorData]);

  return {
    indCandles,
    candleTimes,
    indicatorData,
    timePriceMap,
  };
}

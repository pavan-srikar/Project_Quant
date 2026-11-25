import { useEffect, useRef, useState } from "react";
import type { IChartApi, ISeriesApi, CandlestickData, Time } from "lightweight-charts";
import { INDICATOR_REGISTRY, type IndicatorType } from "../../lib/indicators.ts";
import {
  getCustomPineIndicators, parsePineScript,
  evaluatePineScriptAsync, CUSTOM_PINE_UPDATED_EVENT,
} from "../../lib/pinescript";
import type { PineTable } from "../../lib/pinescript/types.ts";
import type { PineRendererPrimitive } from "../../lib/chart-plugins/pine-primitive";
import { toIndicatorCandles } from "./utils.ts";
import { useIndicatorSettings } from "../../hooks/useIndicatorSettings.ts";
import { renderBuiltinOverlays } from "./useIndicatorsBuiltins.ts";
import { applyPineEvaluationResult } from "./useIndicatorsPineApply.ts";

export function useIndicators(
  chartRef: React.RefObject<IChartApi | null>,
  candleSeriesRef: React.RefObject<ISeriesApi<"Candlestick"> | null>,
  chartData: CandlestickData<Time>[],
  activeIndicators: IndicatorType[],
  isDark: boolean,
  selectedSymbol?: string,
  chartEpoch?: number,
): { pineTables: PineTable[] } {
  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<"Line">>>(new Map());
  const lastSeriesDataKeyRef = useRef<Map<string, string>>(new Map());
  const pinePrimitivesRef = useRef<Map<string, PineRendererPrimitive>>(new Map());
  const pineCacheRef = useRef<Map<string, { key: string; result: any }>>(new Map());
  const lastChartRef = useRef<IChartApi | null>(null);
  const lastCandleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const lastSymbolRef = useRef<string>("");
  const lastChartEpochRef = useRef<number | undefined>(chartEpoch);
  const hadForecastRef = useRef(false);
  const lastBarCountRef = useRef(0);
  const lastBarTimeRef = useRef<number>(0);
  const lastFirstCloseRef = useRef<number>(0);
  const lastFirstTimeRef = useRef<number>(0);
  const { settings } = useIndicatorSettings();
  const [pineRevision, setPineRevision] = useState(0);
  const [pineTables, setPineTables] = useState<PineTable[]>([]);
  const activeEvalTokenRef = useRef<string>("");
  const isEvaluatingRef = useRef(false);
  const hasPendingRunRef = useRef(false);
  const latestSchedulePineRunRef = useRef<() => void>(() => {});

  useEffect(() => {
    const onPineUpdated = () => setPineRevision((v) => v + 1);
    window.addEventListener(CUSTOM_PINE_UPDATED_EVENT, onPineUpdated);
    return () => window.removeEventListener(CUSTOM_PINE_UPDATED_EVENT, onPineUpdated);
  }, []);

  // Cleanup all series and primitives on unmount
  useEffect(() => {
    return () => {
      for (const [, s] of indicatorSeriesRef.current) { try { chartRef.current?.removeSeries(s); } catch {} }
      indicatorSeriesRef.current.clear();
      for (const [, p] of pinePrimitivesRef.current) { try { candleSeriesRef.current?.detachPrimitive(p); } catch {} }
      pinePrimitivesRef.current.clear();
      pineCacheRef.current.clear();
      setPineTables([]);
      activeEvalTokenRef.current = "";
    };
  }, [chartRef, candleSeriesRef]);

  useEffect(() => {
    const chart = chartRef.current, candleSeries = candleSeriesRef.current;
    if (!chart || !candleSeries || chartData.length === 0) return;

    const isDifferentSymbol = Boolean(selectedSymbol && lastSymbolRef.current && selectedSymbol !== lastSymbolRef.current);
    const isNewChart =
      lastChartRef.current !== chart ||
      lastCandleSeriesRef.current !== candleSeries ||
      (chartEpoch !== undefined && lastChartEpochRef.current !== chartEpoch) ||
      isDifferentSymbol;
    lastChartRef.current = chart;
    lastCandleSeriesRef.current = candleSeries;
    if (selectedSymbol) lastSymbolRef.current = selectedSymbol;
    if (chartEpoch !== undefined) lastChartEpochRef.current = chartEpoch;

    if (isNewChart) {
      for (const [, s] of indicatorSeriesRef.current) {
        try {
          s.setData([]);
          chart.removeSeries(s);
        } catch {}
      }
      indicatorSeriesRef.current.clear();
      lastSeriesDataKeyRef.current.clear();

      for (const [, p] of pinePrimitivesRef.current) {
        try {
          p.updateData([], [], [], [], []);
          candleSeries.detachPrimitive(p);
        } catch {}
      }
      pinePrimitivesRef.current.clear();
      pineCacheRef.current.clear();
      activeEvalTokenRef.current = "";
      hadForecastRef.current = false;
      try { chart.timeScale().applyOptions({}); } catch {}
    }

    const firstBar = chartData[0];
    const firstClose = Number(firstBar?.close) || 0;
    const firstTime = (firstBar as any)?.time ? Number((firstBar as any).time) : 0;
    const lastBar = chartData[chartData.length - 1];
    const lastTime = (lastBar as any)?.time ? Number((lastBar as any).time) : 0;
    const isSameInstrument =
      !isNewChart &&
      lastFirstTimeRef.current === firstTime &&
      lastFirstCloseRef.current === firstClose;
    const isLiveTick =
      isSameInstrument &&
      lastBarCountRef.current === chartData.length &&
      lastBarTimeRef.current === lastTime &&
      lastBarCountRef.current > 0;
    lastBarCountRef.current = chartData.length;
    lastBarTimeRef.current = lastTime;
    lastFirstCloseRef.current = firstClose;
    lastFirstTimeRef.current = firstTime;
    const candleKey = `${firstTime}_${firstClose}_${chartData.length}_${lastTime}`;

    const indCandles = toIndicatorCandles(chartData);
    const customScripts = getCustomPineIndicators();
    const activeKeys = new Set<string>();

    const setOrAdd = (
      key: string,
      values: { time: number; value: number }[],
      opts: any,
      dataKey?: string,
    ) => {
      const curChart = chartRef.current;
      if (!curChart) return;
      let s = indicatorSeriesRef.current.get(key);
      const prevKey = lastSeriesDataKeyRef.current.get(key);
      const lastPoint = values[values.length - 1];
      if (s) {
        if (isLiveTick && prevKey === dataKey && lastPoint) {
          try { s.update({ time: lastPoint.time as Time, value: lastPoint.value }); } catch {}
        } else if (!dataKey || prevKey !== dataKey) {
          try {
            s.setData(values.map((p) => ({ time: p.time as Time, value: p.value })));
            if (dataKey) lastSeriesDataKeyRef.current.set(key, dataKey);
          } catch {}
        }
      } else {
        try {
          s = curChart.addLineSeries(opts);
          s.setData(values.map((p) => ({ time: p.time as Time, value: p.value })));
          indicatorSeriesRef.current.set(key, s);
          if (dataKey) lastSeriesDataKeyRef.current.set(key, dataKey);
        } catch {}
      }
      activeKeys.add(key);
    };

    const pineIndicators = activeIndicators.filter((t) => t.startsWith("pine_"));
    const visiblePineIndicators = pineIndicators.filter((id) => (settings[id] as any)?.visible !== false);
    const builtinOverlayIndicators = activeIndicators.filter((t) => {
      const c = INDICATOR_REGISTRY.find((r) => r.type === t);
      return c && c.pane === "overlay" && c.type !== "VOL";
    });

    const hasAnyForecast = pineIndicators.some((t) => {
      const s = customScripts.find((cs) => cs.id === t);
      return s && /polyline\.new|method\s+forecast/i.test(s.code);
    });

    if (!hasAnyForecast && hadForecastRef.current) {
      hadForecastRef.current = false;
      try { chart.timeScale().applyOptions({ rightOffset: 6 }); } catch {}
    }

    const evalToken = `${firstTime}_${firstClose}_${chartData.length}_${pineRevision}_${activeIndicators.join(",")}_${JSON.stringify(settings)}`;

    const runAllPine = async () => {
      if (isEvaluatingRef.current) return;
      isEvaluatingRef.current = true;
      try {
        const curChart = chartRef.current;
        const curSeries = candleSeriesRef.current;
        if (!curChart || !curSeries) return;

        const tablesAcc: PineTable[] = [];

        for (const type of visiblePineIndicators) {
          if (activeEvalTokenRef.current !== evalToken) return;
          await new Promise<void>((resolve) => setTimeout(resolve, 0));
          if (activeEvalTokenRef.current !== evalToken) return;
          const script = customScripts.find((cs) => cs.id === type);
          if (!script) continue;
          const curSettings = settings[type] as any;
          const isOverlay = script.overlay;

          try {
            const parsed = parsePineScript(script.code);
            const mergedInputs = { ...(script.inputs || {}), ...(curSettings?.pineInputs || {}) };
            const cacheKey = `${type}_${script.code.length}_${JSON.stringify(mergedInputs)}_${firstTime}_${firstClose}_${indCandles.length}_${indCandles[indCandles.length - 1]?.time ?? 0}`;
            let evalRes = pineCacheRef.current.get(type)?.key === cacheKey ? pineCacheRef.current.get(type)!.result : null;
            if (!evalRes) {
              evalRes = await evaluatePineScriptAsync(indCandles, parsed, mergedInputs, script.code);
              if (activeEvalTokenRef.current !== evalToken) return;
              pineCacheRef.current.set(type, { key: cacheKey, result: evalRes });
            }
            if (activeEvalTokenRef.current !== evalToken) return;
            if (!visiblePineIndicators.includes(type as any)) continue;

            applyPineEvaluationResult({
              type,
              isOverlay,
              curSettings,
              cacheKey,
              evalRes,
              indCandles,
              chart: curChart,
              candleSeries: curSeries,
              setOrAdd,
              pinePrimitivesRef,
              hadForecastRef,
              tablesAcc,
            });
          } catch (err) {
            console.error("[useIndicators] Error evaluating Pine indicator:", type, err);
          }
        }

        if (activeEvalTokenRef.current !== evalToken) return;
        setPineTables((prev) => (
          prev.length === tablesAcc.length && prev.every((p, i) => p.id === tablesAcc[i]?.id && p.cells.length === tablesAcc[i]?.cells.length) ? prev : tablesAcc
        ));
      } finally {
        isEvaluatingRef.current = false;
        if (hasPendingRunRef.current) {
          hasPendingRunRef.current = false;
          latestSchedulePineRunRef.current();
        }
      }
    };

    const schedulePineRun = () => {
      if (isEvaluatingRef.current) {
        hasPendingRunRef.current = true;
        return;
      }
      runAllPine();
    };
    latestSchedulePineRunRef.current = schedulePineRun;

    if (!isLiveTick || activeEvalTokenRef.current !== evalToken) {
      activeEvalTokenRef.current = evalToken;
      schedulePineRun();
    }

    renderBuiltinOverlays({ builtinOverlayIndicators, settings, indCandles, candleKey, setOrAdd });

    // Prune inactive or hidden built-in and Pine line series
    let didPruneSeries = false;
    for (const [k, s] of indicatorSeriesRef.current) {
      const isInactive = k.startsWith("pine_")
        ? !visiblePineIndicators.some((id) => k === id || k.startsWith(`${id}_`))
        : !activeKeys.has(k);
      if (isInactive) {
        try { chart.removeSeries(s); } catch {}
        indicatorSeriesRef.current.delete(k);
        lastSeriesDataKeyRef.current.delete(k);
        didPruneSeries = true;
      }
    }
    // Prune inactive or hidden Pine primitives
    let didPrunePrim = false;
    for (const [k, p] of pinePrimitivesRef.current) {
      if (!visiblePineIndicators.includes(k as any)) {
        try {
          p.updateData([], [], [], [], []);
          candleSeries.detachPrimitive(p);
        } catch {}
        pinePrimitivesRef.current.delete(k);
        didPrunePrim = true;
      }
    }
    if (didPruneSeries || didPrunePrim) {
      try { chart.timeScale().applyOptions({}); } catch {}
    }

    if (visiblePineIndicators.length === 0) {
      setPineTables((prev) => (prev.length === 0 ? prev : []));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndicators, chartData, isDark, settings, pineRevision, selectedSymbol, chartEpoch]);

  return { pineTables };
}

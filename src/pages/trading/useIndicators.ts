import { useEffect, useRef, useState } from "react";
import type { IChartApi, ISeriesApi, CandlestickData, Time } from "lightweight-charts";
import { LineStyle, LineType } from "lightweight-charts";
import {
  sma, ema, bollingerBands, vwap,
  INDICATOR_REGISTRY, type IndicatorType,
} from "../../lib/indicators.ts";
import {
  getCustomPineIndicators, parsePineScript,
  evaluatePineScriptAsync, CUSTOM_PINE_UPDATED_EVENT,
} from "../../lib/pinescript";
import type { PineTable } from "../../lib/pinescript/types.ts";
import { PineRendererPrimitive } from "../../lib/chart-plugins/pine-primitive";
import { toIndicatorCandles } from "./utils.ts";
import { useIndicatorSettings, type IndicatorSettings } from "../../hooks/useIndicatorSettings.ts";

export function useIndicators(
  chartRef: React.RefObject<IChartApi | null>,
  candleSeriesRef: React.RefObject<ISeriesApi<"Candlestick"> | null>,
  chartData: CandlestickData<Time>[],
  activeIndicators: IndicatorType[],
  isDark: boolean,
): { pineTables: PineTable[] } {
  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<"Line">>>(new Map());
  const lastSeriesDataKeyRef = useRef<Map<string, string>>(new Map());
  const pinePrimitivesRef = useRef<Map<string, PineRendererPrimitive>>(new Map());
  const pineCacheRef = useRef<Map<string, { key: string; result: any }>>(new Map());
  const hadForecastRef = useRef(false);
  const { settings } = useIndicatorSettings();
  const [pineRevision, setPineRevision] = useState(0);
  const [pineTables, setPineTables] = useState<PineTable[]>([]);

  useEffect(() => {
    const onPineUpdated = () => setPineRevision((v) => v + 1);
    window.addEventListener(CUSTOM_PINE_UPDATED_EVENT, onPineUpdated);
    return () => window.removeEventListener(CUSTOM_PINE_UPDATED_EVENT, onPineUpdated);
  }, []);

  // Cleanup all series and primitives on unmount
  useEffect(() => {
    return () => {
      for (const [, s] of indicatorSeriesRef.current) {
        try { chartRef.current?.removeSeries(s); } catch {}
      }
      indicatorSeriesRef.current.clear();
      for (const [, p] of pinePrimitivesRef.current) {
        try { candleSeriesRef.current?.detachPrimitive(p); } catch {}
      }
      pinePrimitivesRef.current.clear();
      pineCacheRef.current.clear();
      setPineTables([]);
    };
  }, [chartRef, candleSeriesRef]);

  useEffect(() => {
    if (!chartRef.current || !candleSeriesRef.current || chartData.length === 0) return;

    let cancelled = false;
    const chart = chartRef.current, candleSeries = candleSeriesRef.current;
    const indCandles = toIndicatorCandles(chartData);
    const customScripts = getCustomPineIndicators();
    const activeKeys = new Set<string>();
    const activePrimKeys = new Set<string>();

    const setOrAdd = (key: string, values: { time: number; value: number }[], opts: any, dataKey?: string) => {
      let s = indicatorSeriesRef.current.get(key);
      const prevKey = lastSeriesDataKeyRef.current.get(key);
      if (s) {
        if (!dataKey || prevKey !== dataKey) {
          s.setData(values.map((p) => ({ time: p.time as Time, value: p.value })));
          if (dataKey) lastSeriesDataKeyRef.current.set(key, dataKey);
        }
      } else {
        s = chart.addLineSeries(opts);
        s.setData(values.map((p) => ({ time: p.time as Time, value: p.value })));
        indicatorSeriesRef.current.set(key, s);
        if (dataKey) lastSeriesDataKeyRef.current.set(key, dataKey);
      }
      activeKeys.add(key);
    };

    const pineIndicators = activeIndicators.filter((t) => t.startsWith("pine_"));
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

    for (const type of pineIndicators) {
      const script = customScripts.find((cs) => cs.id === type);
      if (!script) continue;
      const curSettings = settings[type] as any;
      if (curSettings?.visible === false) continue;
      const isOverlay = script.overlay;

      const applyPine = async () => {
        try {
          const parsed = parsePineScript(script.code);
          const mergedInputs = { ...(script.inputs || {}), ...(curSettings?.pineInputs || {}) };
          const cacheKey = `${type}_${script.code.length}_${JSON.stringify(mergedInputs)}_${indCandles.length}_${indCandles[indCandles.length - 1]?.time ?? 0}`;
          let evalRes = pineCacheRef.current.get(type)?.key === cacheKey ? pineCacheRef.current.get(type)!.result : null;
          if (!evalRes) {
            evalRes = await evaluatePineScriptAsync(indCandles, parsed, mergedInputs, script.code);
            if (cancelled) return;
            pineCacheRef.current.set(type, { key: cacheKey, result: evalRes });
          }
          if (cancelled) return;

          if (isOverlay) {
            evalRes.plots.forEach((plot: any) => {
              if (plot.displayNone || plot.forceOverlay === false) return;
              const isRef = /reference/i.test(plot.title) || /init_value/i.test(plot.id) || /init_value/i.test(plot.title);
              const plotVis = curSettings?.plotVisibility?.[plot.id] ?? curSettings?.plotVisibility?.[plot.title];
              if (plotVis === false) return;

              const pColor = curSettings?.plotColors?.[plot.id] ?? curSettings?.plotColors?.[plot.title] ?? (isRef ? "#787b86" : plot.color);
              const pWidth = curSettings?.plotLineWidths?.[plot.id] ?? curSettings?.plotLineWidths?.[plot.title] ?? (isRef ? 1 : ((plot.lineWidth as any) || 1.5));
              const pStyle = curSettings?.plotStyles?.[plot.id] ?? curSettings?.plotStyles?.[plot.title];
              const lineStyle = pStyle === "dashed" ? LineStyle.Dashed : pStyle === "dotted" ? LineStyle.Dotted : pStyle === "solid" ? LineStyle.Solid : (isRef ? LineStyle.Dashed : LineStyle.Solid);

              setOrAdd(`${type}_${plot.id}`, plot.values, {
                color: pColor, lineWidth: pWidth, lineStyle,
                lineType: isRef ? LineType.WithSteps : LineType.Simple,
                priceScaleId: "right",
                priceLineVisible: Boolean(curSettings?.labelsOnPriceScale),
                lastValueVisible: (curSettings?.labelsOnPriceScale !== false) && !isRef,
              }, `${cacheKey}_${plot.id}`);
            });
          }

          const targetBoxes = isOverlay ? evalRes.boxes : evalRes.boxes?.filter((b: any) => b.forceOverlay);
          const targetLines = isOverlay ? evalRes.lines : evalRes.lines?.filter((l: any) => l.forceOverlay);
          const targetLabels = isOverlay ? evalRes.labels : evalRes.labels?.filter((l: any) => l.forceOverlay);
          const targetPolys = isOverlay ? evalRes.polylines : [];
          const targetFills = isOverlay ? evalRes.fills : [];

          const hasPolys = Boolean(targetPolys?.length), hasFills = Boolean(targetFills?.length);
          const hasBoxes = Boolean(targetBoxes?.length), hasLines = Boolean(targetLines?.length), hasLabels = Boolean(targetLabels?.length);
          const showPolys = curSettings?.showPolylines !== false, showFills = curSettings?.showFills !== false;
          const showBoxes = curSettings?.showBoxes !== false, showLines = curSettings?.showLines !== false, showLabels = curSettings?.showLabels !== false;

          if ((hasPolys && showPolys) || (hasFills && showFills) || (hasBoxes && showBoxes) || (hasLines && showLines) || (hasLabels && showLabels)) {
            let prim = pinePrimitivesRef.current.get(type);
            if (!prim) {
              prim = new PineRendererPrimitive();
              candleSeries.attachPrimitive(prim);
              pinePrimitivesRef.current.set(type, prim);
            }
            prim.updateData(
              showPolys ? targetPolys : [],
              showFills ? targetFills : [],
              showBoxes ? targetBoxes : [],
              showLines ? targetLines : [],
              showLabels ? targetLabels : [],
            );
            activePrimKeys.add(type);

            if (hasPolys && !hadForecastRef.current) {
              hadForecastRef.current = true;
              const ts = chart.timeScale();
              const fcastBars = Math.min(80, Math.max(45, (evalRes.polylines?.[0]?.points?.length ?? 50) - 1));
              ts.applyOptions({ rightOffset: fcastBars });
              const curRange = ts.getVisibleLogicalRange();
              const span = curRange ? (curRange.to - curRange.from) : 80;
              if (!curRange || curRange.to < indCandles.length + 20) {
                const newTo = indCandles.length + fcastBars;
                ts.setVisibleLogicalRange({ from: Math.max(0, newTo - span), to: newTo });
              }
            }
          }

          if (evalRes.tables && evalRes.tables.length > 0) {
            setPineTables((prev) => {
              const other = prev.filter((t) => !t.id.startsWith(type));
              const tagged = evalRes!.tables!.map((tbl: PineTable, i: number) => ({ ...tbl, id: `${type}_${tbl.id || i}` }));
              const next = [...other, ...tagged];
              if (prev.length === next.length && prev.every((p, i) => p.id === next[i]?.id && p.cells.length === next[i]?.cells.length)) {
                return prev;
              }
              return next;
            });
          }
        } catch (err) {
          console.error("[useIndicators] Error evaluating Pine indicator:", err);
        }
      };
      applyPine();
    }

    for (const type of builtinOverlayIndicators) {

      const config = INDICATOR_REGISTRY.find((r) => r.type === type);
      if (!config) continue;
      const curSettings: Partial<IndicatorSettings> = settings[type] ?? {};
      if (curSettings.visible === false) continue;
      const lineColor = curSettings.color || config.color, lineWidth = (curSettings.lineWidth as any) || 1.5;

      switch (type) {
        case "SMA": {
          const data = sma(indCandles, curSettings.period ?? config.defaultParams.period ?? 20);
          setOrAdd("SMA", data, { color: lineColor, lineWidth, priceScaleId: "right", priceLineVisible: false, lastValueVisible: true });
          break;
        }
        case "EMA": {
          const slots = curSettings.emaSlots && curSettings.emaSlots.length > 0 ? curSettings.emaSlots : [{ enabled: true, period: curSettings.period ?? 20, color: lineColor }];
          slots.forEach((slot, idx) => {
            if (!slot.enabled || slot.period <= 0) return;
            const data = ema(indCandles, slot.period);
            setOrAdd(`EMA_${idx + 1}`, data, { color: slot.color || lineColor, lineWidth, priceScaleId: "right", priceLineVisible: false, lastValueVisible: true });
          });
          break;
        }
        case "BOLL": {
          const data = bollingerBands(indCandles, curSettings.period ?? config.defaultParams.period ?? 20, curSettings.stdDev ?? config.defaultParams.stdDev ?? 2);
          setOrAdd("BOLL-upper", data.upper, { color: curSettings.upperColor || lineColor + "80", lineWidth: 1, priceScaleId: "right", priceLineVisible: false, lastValueVisible: false });
          setOrAdd("BOLL-mid", data.middle, { color: lineColor, lineWidth: 1, priceScaleId: "right", priceLineVisible: false, lastValueVisible: true });
          setOrAdd("BOLL-lower", data.lower, { color: curSettings.lowerColor || lineColor + "80", lineWidth: 1, priceScaleId: "right", priceLineVisible: false, lastValueVisible: false });
          break;
        }
        case "VWAP": {
          const data = vwap(indCandles);
          setOrAdd("VWAP", data, { color: lineColor, lineWidth, lineStyle: LineStyle.Dashed, priceScaleId: "right", priceLineVisible: false, lastValueVisible: true });
          break;
        }
      }
    }

    // Prune inactive line series
    for (const [k, s] of indicatorSeriesRef.current) {
      if (!activeKeys.has(k)) {
        try { chart.removeSeries(s); } catch {}
        indicatorSeriesRef.current.delete(k);
      }
    }
    // Prune inactive Pine primitives
    for (const [k, p] of pinePrimitivesRef.current) {
      if (!activePrimKeys.has(k)) {
        try { candleSeries.detachPrimitive(p); } catch {}
        pinePrimitivesRef.current.delete(k);
      }
    }

    setPineTables((prev) => {
      const filtered = prev.filter((t) => pineIndicators.some((id) => t.id.startsWith(id)));
      return filtered.length === prev.length ? prev : filtered;
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndicators, chartData, isDark, settings, pineRevision]);

  return { pineTables };
}

import { useEffect, useRef, useState } from "react";
import type { IChartApi, ISeriesApi, CandlestickData, Time } from "lightweight-charts";
import { LineStyle, LineType } from "lightweight-charts";
import {
  sma,
  ema,
  bollingerBands,
  vwap,
  INDICATOR_REGISTRY,
  type IndicatorType,
} from "../../lib/indicators.ts";
import {
  getCustomPineIndicators,
  parsePineScript,
  evaluatePineScriptAsync,
  CUSTOM_PINE_UPDATED_EVENT,
} from "../../lib/pinescript";
import { PineRendererPrimitive } from "../../lib/chart-plugins/pine-primitive";
import { toIndicatorCandles } from "./utils.ts";
import { useIndicatorSettings, type IndicatorSettings } from "../../hooks/useIndicatorSettings.ts";


export function useIndicators(
  chartRef: React.RefObject<IChartApi | null>,
  candleSeriesRef: React.RefObject<ISeriesApi<"Candlestick"> | null>,
  chartData: CandlestickData<Time>[],
  activeIndicators: IndicatorType[],
  isDark: boolean,
): void {
  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<"Line">>>(new Map());
  const pinePrimitivesRef = useRef<Map<string, PineRendererPrimitive>>(new Map());
  const hadForecastRef = useRef(false);
  const { settings } = useIndicatorSettings();
  const [pineRevision, setPineRevision] = useState(0);

  useEffect(() => {
    const onPineUpdated = () => setPineRevision((v) => v + 1);
    window.addEventListener(CUSTOM_PINE_UPDATED_EVENT, onPineUpdated);
    return () => window.removeEventListener(CUSTOM_PINE_UPDATED_EVENT, onPineUpdated);
  }, []);

  useEffect(() => {
    if (!chartRef.current || !candleSeriesRef.current || chartData.length === 0) return;

    let cancelled = false;
    const chart = chartRef.current;
    const candleSeries = candleSeriesRef.current;
    const indCandles = toIndicatorCandles(chartData);

    // Remove old indicator series
    for (const [_key, series] of indicatorSeriesRef.current) {
      try {
        chart.removeSeries(series);
      } catch {
        /* already removed */
      }
    }
    indicatorSeriesRef.current.clear();

    // Detach old Pine primitives
    for (const [_key, prim] of pinePrimitivesRef.current) {
      try {
        candleSeries.detachPrimitive(prim);
      } catch {
        /* already detached */
      }
    }
    pinePrimitivesRef.current.clear();

    const customScripts = getCustomPineIndicators();

    // Main chart renders overlay indicators (SMA, EMA, BOLL, VWAP, and custom Pine overlays).
    const overlayIndicators = activeIndicators.filter((type) => {
      if (type.startsWith("pine_")) {
        const s = customScripts.find((cs) => cs.id === type);
        return s ? s.overlay : false;
      }
      const config = INDICATOR_REGISTRY.find((r) => r.type === type);
      return config && config.pane === "overlay" && config.type !== "VOL";
    });

    const hasAnyForecast = overlayIndicators.some((t) => {
      if (!t.startsWith("pine_")) return false;
      const s = customScripts.find((cs) => cs.id === t);
      return s && /polyline\.new|method\s+forecast/i.test(s.code);
    });

    if (!hasAnyForecast && hadForecastRef.current) {
      hadForecastRef.current = false;
      try {
        chart.timeScale().applyOptions({ rightOffset: 6 });
      } catch {}
    }

    for (const type of overlayIndicators) {
      if (type.startsWith("pine_")) {
        const script = customScripts.find((cs) => cs.id === type);
        if (!script) continue;
        const curSettings = settings[type] as any;
        if (curSettings?.visible === false) continue;

        const applyPine = async () => {
          try {
            const parsed = parsePineScript(script.code);
            const mergedInputs = {
              ...(script.inputs || {}),
              ...(curSettings?.pineInputs || {}),
            };
            const evalRes = await evaluatePineScriptAsync(indCandles, parsed, mergedInputs, script.code);
            if (cancelled) return;

            // 1. Render visible plots (skipping display.none and user-hidden plots)
            evalRes.plots.forEach((plot) => {
              if (plot.displayNone) return;
              const isRef =
                /reference/i.test(plot.title) ||
                /init_value/i.test(plot.id) ||
                /init_value/i.test(plot.title);
              const plotVis = curSettings?.plotVisibility?.[plot.id] ?? curSettings?.plotVisibility?.[plot.title];
              if (plotVis === false) return;

              const pColor = curSettings?.plotColors?.[plot.id] ?? curSettings?.plotColors?.[plot.title] ?? (isRef ? "#787b86" : plot.color);
              const pWidth = curSettings?.plotLineWidths?.[plot.id] ?? curSettings?.plotLineWidths?.[plot.title] ?? (isRef ? 1 : ((plot.lineWidth as any) || 1.5));
              const pStyle = curSettings?.plotStyles?.[plot.id] ?? curSettings?.plotStyles?.[plot.title];
              const lineStyle = pStyle === "dashed" ? LineStyle.Dashed : pStyle === "dotted" ? LineStyle.Dotted : pStyle === "solid" ? LineStyle.Solid : (isRef ? LineStyle.Dashed : LineStyle.Solid);

              const s = chart.addLineSeries({
                color: pColor,
                lineWidth: pWidth,
                lineStyle,
                lineType: isRef ? LineType.WithSteps : LineType.Simple,
                priceScaleId: "right",
                priceLineVisible: Boolean(curSettings?.labelsOnPriceScale),
                lastValueVisible: (curSettings?.labelsOnPriceScale !== false) && !isRef,
              });
              s.setData(plot.values.map((p) => ({ time: p.time as Time, value: p.value })));
              indicatorSeriesRef.current.set(`${type}_${plot.id}`, s);
            });

            // 2. Attach PineRendererPrimitive for polylines, fills, boxes, lines, and labels
            const hasPolys = Boolean(evalRes.polylines?.length), hasFills = Boolean(evalRes.fills?.length);
            const hasBoxes = Boolean(evalRes.boxes?.length), hasLines = Boolean(evalRes.lines?.length), hasLabels = Boolean(evalRes.labels?.length);
            const showPolys = curSettings?.showPolylines !== false, showFills = curSettings?.showFills !== false;
            const showBoxes = curSettings?.showBoxes !== false, showLines = curSettings?.showLines !== false, showLabels = curSettings?.showLabels !== false;

            if ((hasPolys && showPolys) || (hasFills && showFills) || (hasBoxes && showBoxes) || (hasLines && showLines) || (hasLabels && showLabels)) {
              const prim = new PineRendererPrimitive();
              candleSeries.attachPrimitive(prim);
              prim.updateData(
                showPolys ? evalRes.polylines : [],
                showFills ? evalRes.fills : [],
                showBoxes ? evalRes.boxes : [],
                showLines ? evalRes.lines : [],
                showLabels ? evalRes.labels : [],
              );
              pinePrimitivesRef.current.set(type, prim);

              if (hasPolys && !hadForecastRef.current) {
                hadForecastRef.current = true;
                const ts = chart.timeScale();
                const fcastBars = Math.min(80, Math.max(45, (evalRes.polylines?.[0]?.points?.length ?? 50) - 1));
                ts.applyOptions({ rightOffset: fcastBars });
                const curRange = ts.getVisibleLogicalRange();
                const span = curRange ? (curRange.to - curRange.from) : 80;
                if (!curRange || curRange.to < indCandles.length + 20) {
                  const newTo = indCandles.length + fcastBars;
                  ts.setVisibleLogicalRange({
                    from: Math.max(0, newTo - span),
                    to: newTo,
                  });
                }
              }
            }
          } catch (err) {
            console.error("[useIndicators] Error evaluating Pine indicator:", err);
          }
        };
        applyPine();
        continue;
      }

      const config = INDICATOR_REGISTRY.find((r) => r.type === type);
      if (!config) continue;
      const curSettings: Partial<IndicatorSettings> = settings[type] ?? {};
      if (curSettings.visible === false) continue;

      const lineColor = curSettings.color || config.color;
      const lineWidth = (curSettings.lineWidth as any) || 1.5;

      switch (type) {
        case "SMA": {
          const period = curSettings.period ?? config.defaultParams.period ?? 20;
          const data = sma(indCandles, period);
          const s = chart.addLineSeries({
            color: lineColor,
            lineWidth,
            priceScaleId: "right",
            priceLineVisible: false,
            lastValueVisible: true,
          });
          s.setData(data.map((p) => ({ time: p.time as Time, value: p.value })));
          indicatorSeriesRef.current.set("SMA", s);
          break;
        }
        case "EMA": {
          const slots =
            curSettings.emaSlots && curSettings.emaSlots.length > 0
              ? curSettings.emaSlots
              : [{ enabled: true, period: curSettings.period ?? 20, color: lineColor }];

          slots.forEach((slot, idx) => {
            if (!slot.enabled || slot.period <= 0) return;
            const data = ema(indCandles, slot.period);
            const s = chart.addLineSeries({
              color: slot.color || lineColor,
              lineWidth,
              priceScaleId: "right",
              priceLineVisible: false,
              lastValueVisible: true,
            });
            s.setData(data.map((p) => ({ time: p.time as Time, value: p.value })));
            indicatorSeriesRef.current.set(`EMA_${idx + 1}`, s);
          });
          break;
        }
        case "BOLL": {
          const period = curSettings.period ?? config.defaultParams.period ?? 20;
          const stdDev = curSettings.stdDev ?? config.defaultParams.stdDev ?? 2;
          const data = bollingerBands(indCandles, period, stdDev);

          const upper = chart.addLineSeries({
            color: curSettings.upperColor || lineColor + "80",
            lineWidth: 1,
            priceScaleId: "right",
            priceLineVisible: false,
            lastValueVisible: false,
          });
          upper.setData(data.upper.map((p) => ({ time: p.time as Time, value: p.value })));
          indicatorSeriesRef.current.set("BOLL-upper", upper);

          const mid = chart.addLineSeries({
            color: lineColor,
            lineWidth: 1,
            priceScaleId: "right",
            priceLineVisible: false,
            lastValueVisible: true,
          });
          mid.setData(data.middle.map((p) => ({ time: p.time as Time, value: p.value })));
          indicatorSeriesRef.current.set("BOLL-mid", mid);

          const lower = chart.addLineSeries({
            color: curSettings.lowerColor || lineColor + "80",
            lineWidth: 1,
            priceScaleId: "right",
            priceLineVisible: false,
            lastValueVisible: false,
          });
          lower.setData(data.lower.map((p) => ({ time: p.time as Time, value: p.value })));
          indicatorSeriesRef.current.set("BOLL-lower", lower);
          break;
        }
        case "VWAP": {
          const data = vwap(indCandles);
          const s = chart.addLineSeries({
            color: lineColor,
            lineWidth,
            lineStyle: LineStyle.Dashed,
            priceScaleId: "right",
            priceLineVisible: false,
            lastValueVisible: true,
          });
          s.setData(data.map((p) => ({ time: p.time as Time, value: p.value })));
          indicatorSeriesRef.current.set("VWAP", s);
          break;
        }
      }
    }

    return () => {
      cancelled = true;
    };
    // chartRef/candleSeriesRef are stable refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndicators, chartData, isDark, settings, pineRevision]);
}

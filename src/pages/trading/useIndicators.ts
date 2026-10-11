import { useEffect, useRef } from "react";
import type { IChartApi, ISeriesApi, CandlestickData, Time } from "lightweight-charts";
import { LineStyle } from "lightweight-charts";
import {
  sma,
  ema,
  bollingerBands,
  vwap,
  INDICATOR_REGISTRY,
  type IndicatorType,
} from "../../lib/indicators.ts";
import { toIndicatorCandles } from "./utils.ts";
import { useIndicatorSettings } from "../../hooks/useIndicatorSettings.ts";

export function useIndicators(
  chartRef: React.RefObject<IChartApi | null>,
  candleSeriesRef: React.RefObject<ISeriesApi<"Candlestick"> | null>,
  chartData: CandlestickData<Time>[],
  activeIndicators: IndicatorType[],
  isDark: boolean,
): void {
  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<"Line">>>(new Map());
  const { settings } = useIndicatorSettings();

  useEffect(() => {
    if (!chartRef.current || !candleSeriesRef.current || chartData.length === 0) return;

    const chart = chartRef.current;
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

    // Main chart only renders overlay indicators (SMA, EMA, BOLL, VWAP).
    // Sub-chart indicators (RSI, MACD, ATR, STOCH) are rendered in the bottom panel Indicators tab.
    const overlayIndicators = activeIndicators.filter((type) => {
      const config = INDICATOR_REGISTRY.find((r) => r.type === type);
      return config && config.pane === "overlay";
    });

    for (const type of overlayIndicators) {
      const config = INDICATOR_REGISTRY.find((r) => r.type === type);
      if (!config) continue;
      const curSettings = settings[type] ?? {};
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
          const period = curSettings.period ?? config.defaultParams.period ?? 20;
          const data = ema(indCandles, period);
          const s = chart.addLineSeries({
            color: lineColor,
            lineWidth,
            priceScaleId: "right",
            priceLineVisible: false,
            lastValueVisible: true,
          });
          s.setData(data.map((p) => ({ time: p.time as Time, value: p.value })));
          indicatorSeriesRef.current.set("EMA", s);
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
    // chartRef/candleSeriesRef are stable refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndicators, chartData, isDark, settings]);
}

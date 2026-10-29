import {
  type CandlestickData,
  type HistogramData,
  type IChartApi,
  type ISeriesApi,
  LineStyle,
  type Time,
} from "lightweight-charts";
import type { Dispatch, RefObject, SetStateAction } from "react";
import type { Candle } from "../../../services/schemas.ts";
import { getMinMove } from "../utils.ts";
import { restoreLegendOnLeave } from "./realtimeFeed.ts";
import type { ChartColors, OhlcvLegend } from "./types.ts";
import { candleToLegend } from "./useChartDataPipeline.ts";

export interface SeriesInitResult {
  candleSeries: ISeriesApi<"Candlestick">;
  volumeSeries: ISeriesApi<"Histogram">;
}

export function initChartSeries(
  chart: IChartApi,
  colors: ChartColors,
  pipDigits: number,
  legendRestoredRef: RefObject<boolean>,
  lastCandleRef: RefObject<CandlestickData<Time> | null>,
  legendVolRef: RefObject<number>,
  setLegend: Dispatch<SetStateAction<OhlcvLegend | null>>,
  hoveredTimeRef?: RefObject<Time | null>,
  allCandlesRef?: RefObject<Candle[]>,
): SeriesInitResult {
  const minMove = getMinMove(pipDigits);

  const candleSeries = chart.addCandlestickSeries({
    upColor: colors.up,
    downColor: colors.down,
    borderUpColor: colors.up,
    borderDownColor: colors.down,
    wickUpColor: colors.up,
    wickDownColor: colors.down,
    priceFormat: {
      type: "price",
      precision: pipDigits,
      minMove,
    },
    lastValueVisible: false,
    priceLineVisible: false,
    priceLineWidth: 1,
    priceLineColor: "",
    priceLineStyle: LineStyle.Dotted,
  });

  const volumeSeries = chart.addHistogramSeries({
    priceFormat: { type: "volume" },
    priceScaleId: "volume",
  });
  chart.priceScale("volume").applyOptions({
    scaleMargins: { top: 0.85, bottom: 0 },
  });

  chart.subscribeCrosshairMove((param) => {
    if (!param?.time) {
      if (hoveredTimeRef) hoveredTimeRef.current = null;
      restoreLegendOnLeave(legendRestoredRef, lastCandleRef, legendVolRef, setLegend);
      return;
    }
    if (hoveredTimeRef) hoveredTimeRef.current = param.time;
    legendRestoredRef.current = false;
    const data = param.seriesData.get(candleSeries) as CandlestickData<Time> | undefined;
    if (data) {
      const vol = param.seriesData.get(volumeSeries) as HistogramData<Time> | undefined;
      let delta: number | undefined;
      const allCandles = allCandlesRef?.current;
      if (allCandles && allCandles.length > 0) {
        const timeSec = Number(param.time);
        const found = allCandles.find((c) => Number(c.time) === timeSec);
        if (found) {
          if (found.delta !== undefined) {
            delta = found.delta;
          } else if (found.takerBuyVolume !== undefined && found.volume !== undefined) {
            delta = 2 * found.takerBuyVolume - found.volume;
          }
        }
      }
      setLegend((prev) =>
        candleToLegend(
          data,
          vol?.value || 0,
          delta ?? (data.time === lastCandleRef.current?.time ? prev?.delta : undefined),
        ),
      );
    }
  });

  return { candleSeries, volumeSeries };
}

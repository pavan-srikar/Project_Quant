import {
  type CandlestickData,
  type HistogramData,
  type IChartApi,
  type ISeriesApi,
  LineStyle,
  type Time,
} from "lightweight-charts";
import type { Dispatch, RefObject, SetStateAction } from "react";
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
      restoreLegendOnLeave(legendRestoredRef, lastCandleRef, legendVolRef, setLegend);
      return;
    }
    legendRestoredRef.current = false;
    const data = param.seriesData.get(candleSeries) as CandlestickData<Time> | undefined;
    if (data) {
      const vol = param.seriesData.get(volumeSeries) as HistogramData<Time> | undefined;
      setLegend(candleToLegend(data, vol?.value || 0));
    }
  });

  return { candleSeries, volumeSeries };
}

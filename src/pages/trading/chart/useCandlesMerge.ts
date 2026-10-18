import { useEffect, useMemo, useRef, type RefObject } from "react";
import type { Candle } from "../../../services/schemas.ts";
import { TF_INTERVAL_MS, type Timeframe } from "../constants.ts";
import type { ChartColors } from "./types.ts";
import { useChartData } from "./useChartDataPipeline.ts";

export interface UseCandlesMergeParams {
  candles: Candle[];
  historicalExtra: Candle[];
  drawingManagerRef: RefObject<any>;
  onAllCandlesChange?: (candles: Candle[]) => void;
  colors: ChartColors;
  timeframe?: Timeframe;
}

export function useCandlesMerge({
  candles,
  historicalExtra,
  drawingManagerRef,
  onAllCandlesChange,
  colors,
  timeframe = "15m",
}: UseCandlesMergeParams) {
  const prevTfRef = useRef(timeframe);

  const allCandles = useMemo(() => {
    const isSameTf = prevTfRef.current === timeframe;
    prevTfRef.current = timeframe;

    // Validate that historicalExtra matches the current timeframe interval
    let validExtra = isSameTf ? historicalExtra : [];
    if (validExtra.length >= 2 && validExtra[0] && validExtra[1]) {
      const expectedSec = (TF_INTERVAL_MS[timeframe] ?? 60_000) / 1000;
      const actualSec = Math.abs(validExtra[1].time - validExtra[0].time);
      if (actualSec < expectedSec * 0.9 || actualSec > expectedSec * 1.1) {
        validExtra = [];
      }
    }

    if (validExtra.length > 0 && candles.length > 0) {
      const expectedSec = (TF_INTERVAL_MS[timeframe] ?? 60_000) / 1000;
      const maxGapSec = Math.max(expectedSec * 4, 4 * 86400);
      const extraLast = validExtra[validExtra.length - 1]!.time;
      const extraFirst = validExtra[0]!.time;
      const candlesFirst = candles[0]!.time;
      const candlesLast = candles[candles.length - 1]!.time;
      if (extraLast < candlesFirst && candlesFirst - extraLast > maxGapSec) {
        validExtra = [];
      } else if (candlesLast < extraFirst && extraFirst - candlesLast > maxGapSec) {
        validExtra = [];
      }
    }

    if (validExtra.length === 0) return candles;
    if (candles.length === 0) return validExtra;
    const map = new Map<number, Candle>();
    for (const c of candles) map.set(c.time, c);
    for (const c of validExtra) {
      if (!map.has(c.time)) map.set(c.time, c);
    }
    return Array.from(map.values()).sort((a, b) => a.time - b.time);
  }, [historicalExtra, candles, timeframe]);
  const allCandlesRef = useRef(allCandles);
  allCandlesRef.current = allCandles;

  const { chartData, volumeData } = useChartData(allCandles, colors);

  const chartDataRef = useRef(chartData);
  chartDataRef.current = chartData;

  useEffect(() => {
    drawingManagerRef.current?.setGetCandles(() => chartDataRef.current);
  }, [chartData, drawingManagerRef]);

  const lastEmittedCandlesRef = useRef<Candle[]>([]);
  useEffect(() => {
    if (allCandles !== lastEmittedCandlesRef.current && allCandles.length > 0) {
      const prev = lastEmittedCandlesRef.current;
      if (
        prev.length !== allCandles.length ||
        prev[0]?.time !== allCandles[0]?.time ||
        prev[prev.length - 1]?.time !== allCandles[allCandles.length - 1]?.time
      ) {
        lastEmittedCandlesRef.current = allCandles;
        onAllCandlesChange?.(allCandles);
      }
    }
  }, [allCandles, onAllCandlesChange]);

  return {
    allCandles,
    allCandlesRef,
    chartData,
    volumeData,
  };
}

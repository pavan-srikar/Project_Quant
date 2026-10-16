import { useEffect, useMemo, useRef, type RefObject } from "react";
import type { Candle } from "../../../services/schemas.ts";
import type { ChartColors } from "./types.ts";
import { useChartData } from "./useChartDataPipeline.ts";

export interface UseCandlesMergeParams {
  candles: Candle[];
  historicalExtra: Candle[];
  drawingManagerRef: RefObject<any>;
  onAllCandlesChange?: (candles: Candle[]) => void;
  colors: ChartColors;
}

export function useCandlesMerge({
  candles,
  historicalExtra,
  drawingManagerRef,
  onAllCandlesChange,
  colors,
}: UseCandlesMergeParams) {
  const allCandles = useMemo(
    () => (historicalExtra.length === 0 ? candles : [...historicalExtra, ...candles]),
    [historicalExtra, candles],
  );
  const allCandlesRef = useRef(allCandles);
  allCandlesRef.current = allCandles;

  useEffect(() => {
    drawingManagerRef.current?.setGetCandles(() => allCandlesRef.current);
  }, [allCandles, drawingManagerRef]);

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

  const { chartData, volumeData } = useChartData(allCandles, colors);

  return {
    allCandles,
    allCandlesRef,
    chartData,
    volumeData,
  };
}

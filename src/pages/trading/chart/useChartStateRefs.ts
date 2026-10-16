import type {
  CandlestickData,
  IChartApi,
  IPriceLine,
  ISeriesApi,
  ISeriesPrimitive,
  Time,
} from "lightweight-charts";
import { useEffect, useRef, useState } from "react";
import type { Timeframe } from "../constants.ts";
import type {
  LiveCandleData,
  LoadMoreState,
  SlTpMap,
} from "./types.ts";

export function useChartStateRefs(selectedSymbol: string, timeframe: Timeframe) {
  const lastGapRefetchAtRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const initialLoadCompleteRef = useRef(false);
  const hasUserPannedOrZoomedRef = useRef(false);
  const lastRenderedBarCountRef = useRef(0);

  const [historicalExtra, setHistoricalExtra] = useState<any[]>([]);
  const loadMoreRef = useRef<LoadMoreState>({
    loading: false,
    noMoreData: false,
    lastFetchedBeforeMs: 0,
    fetchFromMs: 0,
  });
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const priceLineRef = useRef<IPriceLine[]>([]);
  const drawingManagerRef = useRef<any>(null);
  const timeframeRef = useRef(timeframe);
  const chartPluginsRef = useRef<ISeriesPrimitive<Time>[]>([]);
  const bidLineRef = useRef<IPriceLine | null>(null);
  const askLineRef = useRef<IPriceLine | null>(null);
  const midLineRef = useRef<IPriceLine | null>(null);
  const slTpLinesRef = useRef<SlTpMap>(new Map());

  const lastCandleRef = useRef<CandlestickData<Time> | null>(null);
  const lastLoadKeyRef = useRef<string>("");
  const lastLoadedSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const latestLiveCandleRef = useRef<LiveCandleData | undefined>(undefined);
  const liveCandleTsRef = useRef<number>(0);
  const legendVolRef = useRef<number>(0);
  const legendRestoredRef = useRef(true);

  // Reset historical extension on symbol/tf change
  useEffect(() => {
    setHistoricalExtra([]);
    initialLoadCompleteRef.current = false;
    hasUserPannedOrZoomedRef.current = false;
    lastRenderedBarCountRef.current = 0;
    loadMoreRef.current = {
      loading: false,
      noMoreData: false,
      lastFetchedBeforeMs: 0,
      fetchFromMs: 0,
      emptyFetchCount: 0,
    };
    lastGapRefetchAtRef.current = 0;
    lastLoadKeyRef.current = "";
    lastCandleRef.current = null;
    liveCandleTsRef.current = 0;
  }, [selectedSymbol, timeframe]);

  return {
    lastGapRefetchAtRef,
    containerRef,
    chartRef,
    candleSeriesRef,
    initialLoadCompleteRef,
    hasUserPannedOrZoomedRef,
    lastRenderedBarCountRef,
    historicalExtra,
    setHistoricalExtra,
    loadMoreRef,
    volumeSeriesRef,
    priceLineRef,
    drawingManagerRef,
    timeframeRef,
    chartPluginsRef,
    bidLineRef,
    askLineRef,
    midLineRef,
    slTpLinesRef,
    lastCandleRef,
    lastLoadKeyRef,
    lastLoadedSeriesRef,
    latestLiveCandleRef,
    liveCandleTsRef,
    legendVolRef,
    legendRestoredRef,
  };
}

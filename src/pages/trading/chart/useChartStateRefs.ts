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
import { useTradingStore } from "../../../services/store.tsx";
import { getChartPriceRange, getChartTimeScaleState, type ChartTimeScaleState } from "./chartFraming.ts";
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

  const isScrolledBackRef = useRef(false);
  const pendingHistoricalTargetRef = useRef<{
    centerTime: number;
    barCount: number;
    targetSymbol: string;
  } | null>(null);
  const lastVisibleTimeRangeRef = useRef<{
    from: number;
    to: number;
    centerTime?: number;
    barCount?: number;
  } | null>(null);
  const prevSymbolRef = useRef(selectedSymbol);
  const prevTfRef = useRef(timeframe);
  const needsTfReframeRef = useRef(false);
  const isChangingTfRef = useRef(false);
  const preservedPriceRangeRef = useRef<{ symbol: string; min: number; max: number } | null>(null);
  const preservedTimeScaleRef = useRef<{ symbol: string; state: ChartTimeScaleState } | null>(null);

  // Reset historical extension on symbol/tf change
  useEffect(() => {
    if (prevSymbolRef.current !== selectedSymbol) {
      prevSymbolRef.current = selectedSymbol;
      hasUserPannedOrZoomedRef.current = false;
      isScrolledBackRef.current = false;
      lastVisibleTimeRangeRef.current = null;
      pendingHistoricalTargetRef.current = null;
      initialLoadCompleteRef.current = false;
      preservedPriceRangeRef.current = null;
      preservedTimeScaleRef.current = null;
    }
    if (prevTfRef.current !== timeframe) {
      prevTfRef.current = timeframe;
      needsTfReframeRef.current = true;
      hasUserPannedOrZoomedRef.current = false;
      isChangingTfRef.current = true;
      const anchor = useTradingStore.getState().chartViewportAnchor;
      if (!anchor || anchor.fromTime === 0) {
        isScrolledBackRef.current = false;
        lastVisibleTimeRangeRef.current = null;
        pendingHistoricalTargetRef.current = null;
      }
      if (chartRef.current) {
        const pr = getChartPriceRange(chartRef.current);
        if (pr) preservedPriceRangeRef.current = { symbol: selectedSymbol, ...pr };
        const ts = getChartTimeScaleState(chartRef.current);
        if (ts) preservedTimeScaleRef.current = { symbol: selectedSymbol, state: ts };
      }
    }
    setHistoricalExtra([]);
    lastRenderedBarCountRef.current = 0;
    loadMoreRef.current = {
      loading: false,
      noMoreData: false,
      lastFetchedBeforeMs: 0,
      fetchFromMs: 0,
      emptyFetchCount: 0,
    };
    lastGapRefetchAtRef.current = 0;
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
    isScrolledBackRef,
    pendingHistoricalTargetRef,
    needsTfReframeRef,
    lastVisibleTimeRangeRef,
    isChangingTfRef,
    preservedPriceRangeRef,
    preservedTimeScaleRef,
  };
}

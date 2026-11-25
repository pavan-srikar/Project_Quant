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
  const hoveredTimeRef = useRef<Time | null>(null);

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
      if (anchor?.priceRange) {
        preservedPriceRangeRef.current = { symbol: selectedSymbol, ...anchor.priceRange };
      } else if (chartRef.current) {
        const pr = getChartPriceRange(chartRef.current, candleSeriesRef.current);
        if (pr) preservedPriceRangeRef.current = { symbol: selectedSymbol, ...pr };
      }
      if (anchor?.timeScaleState) {
        preservedTimeScaleRef.current = { symbol: selectedSymbol, state: anchor.timeScaleState };
      } else if (chartRef.current) {
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
    hoveredTimeRef,
    isScrolledBackRef,
    pendingHistoricalTargetRef,
    needsTfReframeRef,
    lastVisibleTimeRangeRef,
    isChangingTfRef,
    preservedPriceRangeRef,
    preservedTimeScaleRef,
  };
}

export function captureTimeScaleOnUnmount(
  chart: IChartApi,
  preservedTimeScaleRef: React.RefObject<{ symbol: string; state: ChartTimeScaleState } | null> | undefined,
  initialLoadCompleteRef: React.RefObject<boolean> | undefined,
  allCandlesRef: React.RefObject<any[]>,
  timeframeRef: React.RefObject<Timeframe>,
  selectedSymbol: string,
): void {
  if (!preservedTimeScaleRef || !initialLoadCompleteRef?.current || allCandlesRef.current.length === 0) return;
  const ts = getChartTimeScaleState(chart, allCandlesRef.current, timeframeRef.current);
  if (ts && ts.barSpacing > 0 && (!preservedTimeScaleRef.current || preservedTimeScaleRef.current.symbol === selectedSymbol)) {
    preservedTimeScaleRef.current = { symbol: selectedSymbol, state: ts };
  }
}

export function resolvePreservedTimeScale(
  refEntry: { symbol: string; state: ChartTimeScaleState } | null | undefined,
  selectedSymbol: string,
  anchorTs: ChartTimeScaleState | null | undefined,
  isTfChange: boolean,
  isAnchorMatch: boolean,
  isNewChart: boolean,
): ChartTimeScaleState | null {
  const refTs = refEntry
    ? refEntry.symbol === selectedSymbol
      ? refEntry.state
      : {
          barSpacing: refEntry.state.barSpacing,
          rightOffset: refEntry.state.rightOffset,
          visibleBars: refEntry.state.visibleBars,
          scrollPosition: Math.max(refEntry.state.rightOffset ?? 6, 0),
        }
    : null;
  if (isTfChange || isAnchorMatch) return anchorTs || refTs || null;
  return isNewChart ? refTs : null;
}

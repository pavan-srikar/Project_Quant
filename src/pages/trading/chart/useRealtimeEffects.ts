import type { useQueryClient } from "@tanstack/react-query";
import type { CandlestickData, IPriceLine, ISeriesApi, Time } from "lightweight-charts";
import { useEffect, useRef, type Dispatch, type RefObject, type SetStateAction } from "react";
import type { useChartPreferences } from "../../../hooks/useChartPreferences.ts";
import type { Order, Position, Symbol } from "../../../services/schemas.ts";
import { useTradingStore } from "../../../services/stores/useTradingStore.ts";
import type { DrawingLine, Timeframe } from "../constants.ts";
import {
  frameHistoricalViewport, frameLatestCandles,
  getChartPriceRange, setChartPriceRange, type ChartTimeScaleState,
} from "./chartFraming.ts";
import { addOrderOverlay, addPositionOverlay, clearPriceLines } from "./chartOverlays.ts";
import { removePriceLineSafe } from "./bidAskLines.ts";
import {
  applyBidAskLines, applyServerCandle, applyTick,
  reapplyLive, replayBufferedLive, scheduleStaleRefetch,
} from "./realtimeFeed.ts";
import type {
  ChartColors, LiveCandleData, OhlcvLegend, OverlayOpts,
  ReplayTradeEvent, RtCtx, TickData,
} from "./types.ts";
import { useCandleCountdown } from "./useCandleCountdown.ts";
import { resolvePreservedTimeScale } from "./useChartStateRefs.ts";
import { legendFromSeries } from "./useChartDataPipeline.ts";
import { useLineCrossAlerts } from "./useLineCrossAlerts.ts";
import { useReplayMarkers } from "./useReplayMarkers.ts";
import { useStalenessWatchdog } from "./useStalenessWatchdog.ts";

export interface RealtimeEffectsParams {
  chartRef: RefObject<any>;
  candleSeriesRef: RefObject<ISeriesApi<"Candlestick"> | null>;
  volumeSeriesRef: RefObject<ISeriesApi<"Histogram"> | null>;
  chartData: CandlestickData<Time>[];
  volumeData: any[];
  selectedSymbol: string;
  timeframe: Timeframe;
  makeRtCtx: (series: ISeriesApi<"Candlestick">) => RtCtx;
  lastLoadKeyRef: RefObject<string>;
  lastLoadedSeriesRef: RefObject<ISeriesApi<"Candlestick"> | null>;
  lastCandleRef: RefObject<CandlestickData<Time> | null>;
  latestLiveCandleRef: RefObject<LiveCandleData | undefined>;
  liveCandleTsRef: RefObject<number>;
  lastGapRefetchAtRef: RefObject<number>;
  initialLoadCompleteRef: RefObject<boolean>;
  lastRenderedBarCountRef: RefObject<number>;
  hasUserPannedOrZoomedRef: RefObject<boolean>;
  isScrolledBackRef?: RefObject<boolean>;
  needsTfReframeRef?: RefObject<boolean>;
  isChangingTfRef?: RefObject<boolean>;
  pendingHistoricalTargetRef?: RefObject<{ centerTime: number; barCount: number; targetSymbol: string } | null>;
  lastVisibleTimeRangeRef?: RefObject<{ from: number; to: number; centerTime?: number; barCount?: number } | null>;
  preservedPriceRangeRef?: RefObject<{ symbol: string; min: number; max: number } | null>;
  preservedTimeScaleRef?: RefObject<{ symbol: string; state: ChartTimeScaleState } | null>;
  setLegend: Dispatch<SetStateAction<OhlcvLegend | null>>;
  liveCandle?: LiveCandleData; tick?: TickData; drawingsRef: RefObject<DrawingLine[]>;
  pipDigits: number; isReplaying?: boolean; queryClient: ReturnType<typeof useQueryClient>;
  chartPrefs: ReturnType<typeof useChartPreferences>; priceLineRef: RefObject<IPriceLine[]>;
  slTpLinesRef: RefObject<any>; positions: Position[]; orders: Order[]; colors: ChartColors;
  symbolInfo?: Symbol; replayTradeEvents?: ReplayTradeEvent[];
  setCountdown: Dispatch<SetStateAction<string>>;
}

export function useRealtimeEffects(params: RealtimeEffectsParams) {
  const {
    chartRef, candleSeriesRef, volumeSeriesRef, chartData, volumeData,
    selectedSymbol, timeframe, makeRtCtx, lastLoadKeyRef, lastLoadedSeriesRef,
    lastCandleRef, latestLiveCandleRef, liveCandleTsRef, lastGapRefetchAtRef,
    initialLoadCompleteRef, lastRenderedBarCountRef, hasUserPannedOrZoomedRef,
    isScrolledBackRef, needsTfReframeRef, isChangingTfRef, pendingHistoricalTargetRef,
    lastVisibleTimeRangeRef, preservedPriceRangeRef, preservedTimeScaleRef, setLegend, liveCandle, tick, drawingsRef,
    pipDigits, isReplaying, queryClient, chartPrefs, priceLineRef,
    slTpLinesRef, positions, orders, colors, symbolInfo,
    replayTradeEvents, setCountdown,
  } = params;

  const lastSetDataKeyRef = useRef<string>("");

  // 1. Keep latest live candle in a ref (avoids stale closure in setData effect)
  useEffect(() => {
    latestLiveCandleRef.current = liveCandle;
  }, [liveCandle, latestLiveCandleRef]);

  // 2. Update candle data from server (historical fetch / periodic sync)
  useEffect(() => {
    const series = candleSeriesRef.current;
    if (!series || chartData.length === 0) return;
    const ctx = makeRtCtx(series);
    const loadKey = `${selectedSymbol}:${timeframe}`;
    const isNewChart =
      lastLoadKeyRef.current !== loadKey ||
      lastLoadedSeriesRef.current !== series;

    const prevKey = lastLoadKeyRef.current;
    const isTfChange = Boolean(
      needsTfReframeRef?.current ||
      (prevKey && prevKey.startsWith(`${selectedSymbol}:`) && prevKey !== loadKey)
    );

    // Capture target before setData fires timescale listeners that could clear state
    const saved = lastVisibleTimeRangeRef?.current;
    const target =
      pendingHistoricalTargetRef?.current?.targetSymbol === selectedSymbol
        ? pendingHistoricalTargetRef.current
        : isScrolledBackRef?.current && saved
          ? {
              centerTime: saved.centerTime ?? Math.round((saved.from + saved.to) / 2),
              barCount: saved.barCount && saved.barCount > 10 ? saved.barCount : 80,
              targetSymbol: selectedSymbol,
            }
          : null;

    const buffered = latestLiveCandleRef.current;
    const isInitialLoad = !initialLoadCompleteRef.current;
    const anchor = useTradingStore.getState().chartViewportAnchor;
    const isAnchorMatch = Boolean(anchor && anchor.symbol === selectedSymbol);
    const shouldReframe = isNewChart || isInitialLoad || isTfChange || isAnchorMatch;

    const anchorPr = isAnchorMatch ? anchor?.priceRange : null;
    const refPr = preservedPriceRangeRef?.current?.symbol === selectedSymbol ? preservedPriceRangeRef.current : null;
    const currentChartPr = (isTfChange || isAnchorMatch) ? getChartPriceRange(chartRef.current, series) : null;
    const preservedPriceRange = (isTfChange || isAnchorMatch) ? (anchorPr || refPr || currentChartPr || null) : null;
    if (preservedPriceRange && preservedPriceRangeRef) preservedPriceRangeRef.current = { symbol: selectedSymbol, ...preservedPriceRange };
    const anchorTs = isAnchorMatch ? anchor?.timeScaleState : null;
    const preservedTimeScale = resolvePreservedTimeScale(
      preservedTimeScaleRef?.current, selectedSymbol, anchorTs, isTfChange, isAnchorMatch, isNewChart,
    );
    if (preservedTimeScale && preservedTimeScaleRef) preservedTimeScaleRef.current = { symbol: selectedSymbol, state: preservedTimeScale };

    if (isChangingTfRef) isChangingTfRef.current = true;
    if (isNewChart) {
      removePriceLineSafe(ctx.bidLine, series);
      removePriceLineSafe(ctx.askLine, series);
      removePriceLineSafe(ctx.midLine, series);
    }

    // Lock price scale to manual when preserved, or momentary auto-fit when switching instruments
    if (preservedPriceRange && preservedPriceRange.max > preservedPriceRange.min) {
      setChartPriceRange(chartRef.current, preservedPriceRange, series);
    } else if (isNewChart) {
      try {
        chartRef.current?.priceScale("right").applyOptions({ autoScale: true });
        if (!chartPrefs.autoScale) {
          requestAnimationFrame(() => {
            try { chartRef.current?.priceScale("right").applyOptions({ autoScale: false }); } catch {}
          });
        }
      } catch {}
    }

    // Pre-apply preserved barSpacing and rightOffset BEFORE setting data
    const ts = chartRef.current?.timeScale();
    if (ts && preservedTimeScale && preservedTimeScale.barSpacing > 0) {
      try {
        ts.applyOptions({
          barSpacing: preservedTimeScale.barSpacing,
          rightOffset: preservedTimeScale.rightOffset ?? 6,
        });
      } catch {}
    }

    const firstTime = (chartData[0] as any)?.time ?? 0;
    const lastTime = (chartData[chartData.length - 1] as any)?.time ?? 0;
    const chartDataKey = `${loadKey}:${chartData.length}:${firstTime}:${lastTime}`;
    if (isNewChart || lastSetDataKeyRef.current !== chartDataKey) {
      series.setData(chartData);
      volumeSeriesRef.current?.setData(volumeData);
      lastSetDataKeyRef.current = chartDataKey;
      setLegend(legendFromSeries(chartData, volumeData));
    }
    lastCandleRef.current = chartData[chartData.length - 1] ?? null;
    lastLoadKeyRef.current = loadKey;
    lastLoadedSeriesRef.current = series;
    lastRenderedBarCountRef.current = chartData.length;

    if (!shouldReframe) {
      if (isChangingTfRef) isChangingTfRef.current = false;
      reapplyLive(buffered, ctx);
      return;
    }

    initialLoadCompleteRef.current = true;
    if (needsTfReframeRef) needsTfReframeRef.current = false;

    const isLiveEdgeAnchor = isAnchorMatch && anchor && anchor.fromTime === 0;
    const isHistoricalData = chartData.length > 0 && (!anchor?.toTime || Number(chartData[0]!.time) <= anchor.toTime + 86400 * 30);
    if (isAnchorMatch && anchor && anchor.fromTime > 0 && isHistoricalData) {
      frameHistoricalViewport(
        chartRef.current, chartData, anchor.centerTime, anchor.barCount || 80,
        chartPrefs.autoScale, { from: anchor.fromTime, to: anchor.toTime },
        preservedPriceRange, preservedTimeScale, series, timeframe,
      );
      useTradingStore.getState().setChartViewportAnchor(null);
      if (lastVisibleTimeRangeRef) {
        lastVisibleTimeRangeRef.current = { from: anchor.fromTime, to: anchor.toTime, centerTime: anchor.centerTime, barCount: anchor.barCount || 80 };
      }
      if (pendingHistoricalTargetRef) pendingHistoricalTargetRef.current = null;
      if (isScrolledBackRef) isScrolledBackRef.current = true;
    } else if (isAnchorMatch && anchor && anchor.fromTime > 0 && !isHistoricalData) {
      // Historical query in-flight: do not reframe or clear anchor on stale live data
    } else if (target && !isLiveEdgeAnchor) {
      if (isAnchorMatch) useTradingStore.getState().setChartViewportAnchor(null);
      frameHistoricalViewport(
        chartRef.current, chartData, target.centerTime, target.barCount,
        chartPrefs.autoScale, saved ? { from: saved.from, to: saved.to } : null,
        preservedPriceRange, preservedTimeScale, series, timeframe,
      );
      if (pendingHistoricalTargetRef) pendingHistoricalTargetRef.current = null;
    } else {
      if (isAnchorMatch) useTradingStore.getState().setChartViewportAnchor(null);
      if (pendingHistoricalTargetRef) pendingHistoricalTargetRef.current = null;
      if (lastVisibleTimeRangeRef) lastVisibleTimeRangeRef.current = null;
      if (isScrolledBackRef) isScrolledBackRef.current = false;
      frameLatestCandles(
        chartRef.current, chartData.length, chartPrefs.autoScale,
        preservedPriceRange, preservedTimeScale, chartData, series,
      );
    }
    liveCandleTsRef.current = 0;
    replayBufferedLive(buffered, chartData, ctx);

    requestAnimationFrame(() => {
      if (isChangingTfRef) isChangingTfRef.current = false;
      if (preservedPriceRange && preservedPriceRange.max > preservedPriceRange.min) {
        setChartPriceRange(chartRef.current, preservedPriceRange, series);
      }
    });

    return scheduleStaleRefetch(chartData, ctx);
  }, [
    chartData, volumeData, selectedSymbol, timeframe, makeRtCtx, candleSeriesRef,
    volumeSeriesRef, lastLoadKeyRef, lastLoadedSeriesRef, lastCandleRef, latestLiveCandleRef,
    setLegend, initialLoadCompleteRef, lastRenderedBarCountRef, hasUserPannedOrZoomedRef,
    chartRef, liveCandleTsRef, isChangingTfRef, isScrolledBackRef, needsTfReframeRef,
    pendingHistoricalTargetRef, lastVisibleTimeRangeRef, preservedPriceRangeRef,
    preservedTimeScaleRef, chartPrefs.autoScale,
  ]);

  // 3. Real-time candle updates: server-aggregated CandleUpdate
  useEffect(() => {
    const series = candleSeriesRef.current;
    if (!series || !liveCandle || !lastCandleRef.current) return;
    applyServerCandle(liveCandle, makeRtCtx(series));
  }, [liveCandle, makeRtCtx, candleSeriesRef, lastCandleRef]);

  // 4. Tick-based smoothing
  useEffect(() => {
    const series = candleSeriesRef.current;
    if (!series || !tick) return;
    if (lastLoadKeyRef.current !== `${selectedSymbol}:${timeframe}`) return;
    applyTick(tick, makeRtCtx(series));
  }, [tick, selectedSymbol, timeframe, makeRtCtx, candleSeriesRef, lastLoadKeyRef]);

  // 5. Line-cross price alerts (client-side, in-session)
  useLineCrossAlerts(tick, drawingsRef, selectedSymbol, pipDigits);

  // 6. Staleness watchdog
  useStalenessWatchdog(isReplaying, timeframe, lastCandleRef, lastGapRefetchAtRef, queryClient, selectedSymbol);

  // 7. Live bid/ask price tracking lines
  useEffect(() => {
    const series = candleSeriesRef.current;
    if (!series) return;
    const lastBar = chartData[chartData.length - 1];
    const lastClose = Number(lastBar?.close) || 0;
    const isStale = Boolean(tick && lastClose > 0 && Math.abs(tick.bid - lastClose) / lastClose > 0.5);
    applyBidAskLines(
      isStale ? undefined : tick,
      { showBidLine: chartPrefs.showBidLine, showAskLine: chartPrefs.showAskLine },
      makeRtCtx(series),
    );
  }, [tick, chartPrefs.showBidLine, chartPrefs.showAskLine, makeRtCtx, candleSeriesRef, chartData]);

  // 8. Position/order overlays
  useEffect(() => {
    const series = candleSeriesRef.current;
    if (!series) return;
    clearPriceLines(series, priceLineRef.current);
    priceLineRef.current = [];
    slTpLinesRef.current.clear();
    if (!chartPrefs.overlayPositionsOnChart) return;

    const opts: OverlayOpts = { symbol: selectedSymbol, colors, contractSize: symbolInfo?.contractSize || 100000 };
    for (const pos of positions) addPositionOverlay(series, pos, opts, priceLineRef.current, slTpLinesRef.current);
    for (const ord of orders) addOrderOverlay(series, ord, selectedSymbol, colors.orderLine, priceLineRef.current);
  }, [
    positions, orders, selectedSymbol, chartData, symbolInfo, colors,
    chartPrefs.overlayPositionsOnChart, candleSeriesRef, priceLineRef, slTpLinesRef,
  ]);

  // 9. Replay trade event markers
  useReplayMarkers(candleSeriesRef, replayTradeEvents, timeframe);

  // 10. Candle close countdown timer
  useCandleCountdown(timeframe, setCountdown);
}

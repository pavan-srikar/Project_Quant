import type { IChartApi } from "lightweight-charts";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { prefetchCandles, useCandles } from "../../services/queries.ts";
import { useTradingStore } from "../../services/store.tsx";
import { setRepositoryAnchor } from "../../services/market-data/index.ts";
import type { Candle } from "../../services/schemas.ts";
import { TF_INTERVAL_MS, TIMEFRAMES, type Timeframe } from "../trading/constants.ts";
import { getChartPriceRange, getChartTimeScaleState } from "../trading/chart/chartFraming.ts";
import type { ChartTimeScaleState } from "../../services/stores/useTradingStore.ts";

export interface HistoricalAnchor {
  symbol: string;
  centerTime: number;
  fromTime: number;
  toTime: number;
  barCount: number;
  lastVisibleTime?: number;
  lastVisibleEndTime?: number;
  rightMarginBars?: number;
  priceRange?: { min: number; max: number } | null;
  timeScaleState?: ChartTimeScaleState | null;
}

export function useChartViewportController(
  selectedSymbol: string,
  mainChart: IChartApi | null,
  allCandles: Candle[],
  replayVersion?: number,
) {
  // Chart timeframe persistence across symbols
  const [timeframe, setTimeframe] = useState<Timeframe>(() => {
    const saved = localStorage.getItem("trading_timeframe");
    return saved && TIMEFRAMES.includes(saved as Timeframe) ? (saved as Timeframe) : "4h";
  });

  const [historicalTargetTime, setHistoricalTargetTime] = useState<number | undefined>(undefined);

  const candleLimit = useMemo(() => {
    switch (timeframe) {
      case "1w":
        return 520;
      default:
        return 1_000;
    }
  }, [timeframe]);

  const queryClient = useQueryClient();
  useEffect(() => {
    if (!selectedSymbol || replayVersion) return;
    const timer = setTimeout(() => {
      const commonTfs: Timeframe[] = ["15m", "1h", "4h", "1d"];
      for (const tf of commonTfs) {
        if (tf === timeframe) continue;
        prefetchCandles(queryClient, selectedSymbol, tf, 1_000);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [selectedSymbol, timeframe, replayVersion, queryClient]);

  const { data: candles = [] } = useCandles(
    selectedSymbol,
    timeframe,
    candleLimit,
    replayVersion,
    historicalTargetTime,
  );

  const onTimeframeChange = useCallback(
    (tf: Timeframe) => {
      const chart = mainChart ?? (window as any).__mainChart;
      let anchor: HistoricalAnchor | null = null;

      if (chart) {
        try {
          const displayCandles = allCandles && allCandles.length > 0 ? allCandles : candles;
          const priceRange = getChartPriceRange(chart);
          const timeScaleState = getChartTimeScaleState(chart, displayCandles, timeframe);
          const vr = chart.timeScale().getVisibleRange();
          const lr = chart.timeScale().getVisibleLogicalRange();
          const totalBars = displayCandles.length;
          const ts = chart.timeScale() as any;
          const scrollPos = typeof ts.scrollPosition === "function" ? ts.scrollPosition() : 0;
          const hasValidVr =
            vr && typeof vr.from === "number" && typeof vr.to === "number" && vr.from < vr.to;
          const rightBarIdx = lr ? Math.min(totalBars - 1, Math.floor(lr.to)) : totalBars - 1;
          const rightMarginBars = lr && rightBarIdx >= 0
            ? Math.max(0, Math.round(lr.to - (rightBarIdx + 1)))
            : (timeScaleState?.rightMarginBars ?? (scrollPos > 0 ? scrollPos : 0));

          const nowSec = Math.floor(Date.now() / 1000);
          const vrToSec = hasValidVr ? (vr.to as number) : 0;
          // If the visible right edge is more than 3 days in the past, it CANNOT be live edge
          const isHistoricalTime = vrToSec > 0 && (nowSec - vrToSec > 86400 * 3);
          const isAtLiveEdge = !isHistoricalTime && totalBars > 0 && lr
            ? (rightBarIdx >= totalBars - 2 && rightMarginBars <= 20)
            : false;
          const barCount = lr ? Math.round(lr.to - lr.from) : (timeScaleState?.visibleBars || 80);

          const fromTime = hasValidVr ? (vr.from as number) : 0;
          const toTime = hasValidVr ? (vr.to as number) : 0;
          const centerTime = hasValidVr ? Math.round((fromTime + toTime) / 2) : 0;
          const candleAtRight = rightBarIdx >= 0 && rightBarIdx < displayCandles.length ? displayCandles[rightBarIdx] : null;
          const curTfSec = (TF_INTERVAL_MS[timeframe] ?? 3600_000) / 1000;
          const lastVisibleEndTime = candleAtRight ? Number(candleAtRight.time) + curTfSec : (toTime > 0 ? toTime : undefined);
          const lastVisibleTime = candleAtRight ? Number(candleAtRight.time) : (timeScaleState?.lastVisibleTime ?? (toTime > 0 ? toTime : undefined));

          anchor = {
            symbol: selectedSymbol,
            fromTime: isAtLiveEdge ? 0 : fromTime,
            toTime: isAtLiveEdge ? 0 : toTime,
            centerTime: isAtLiveEdge ? 0 : centerTime,
            lastVisibleTime,
            lastVisibleEndTime,
            rightMarginBars,
            barCount,
            priceRange,
            timeScaleState: timeScaleState ? { ...timeScaleState, lastVisibleTime, lastVisibleEndTime, rightMarginBars } : null,
          };
        } catch {}
      }

      useTradingStore.getState().setChartViewportAnchor(anchor);
      if (anchor && anchor.fromTime > 0) {
        setRepositoryAnchor(anchor);
        setHistoricalTargetTime(anchor.centerTime);
      } else {
        setRepositoryAnchor(null);
        setHistoricalTargetTime(undefined);
      }
      setTimeframe(tf);
      localStorage.setItem("trading_timeframe", tf);
    },
    [mainChart, allCandles, candles, selectedSymbol, timeframe],
  );

  const resetToLive = useCallback(() => {
    useTradingStore.getState().setChartViewportAnchor(null);
    setRepositoryAnchor(null);
    setHistoricalTargetTime(undefined);
  }, []);

  return {
    timeframe,
    setTimeframe,
    onTimeframeChange,
    candles,
    resetToLive,
    historicalTargetTime,
  };
}

import type { IChartApi } from "lightweight-charts";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { prefetchCandles, useCandles } from "../../services/queries.ts";
import { useTradingStore } from "../../services/store.tsx";
import { setRepositoryAnchor } from "../../services/market-data/index.ts";
import { TIMEFRAMES, type Timeframe } from "../trading/constants.ts";
import { getChartPriceRange, getChartTimeScaleState } from "../trading/chart/chartFraming.ts";
import type { ChartTimeScaleState } from "../../services/stores/useTradingStore.ts";

export interface HistoricalAnchor {
  symbol: string;
  centerTime: number;
  fromTime: number;
  toTime: number;
  barCount: number;
  priceRange?: { min: number; max: number } | null;
  timeScaleState?: ChartTimeScaleState | null;
}

export function useChartViewportController(
  selectedSymbol: string,
  mainChart: IChartApi | null,
  allCandlesLength: number,
  replayVersion?: number,
) {
  // Chart timeframe persistence across symbols
  const [timeframe, setTimeframe] = useState<Timeframe>(() => {
    const saved = localStorage.getItem("trading_timeframe");
    return saved && TIMEFRAMES.includes(saved as Timeframe) ? (saved as Timeframe) : "15m";
  });

  const [historicalTargetTime, setHistoricalTargetTime] = useState<number | undefined>(undefined);

  const candleLimit = useMemo(() => {
    switch (timeframe) {
      case "1m":
        return 1_000;
      case "5m":
        return 1_500;
      case "15m":
      case "30m":
        return 2_000;
      case "1h":
      case "4h":
        return 2_500;
      case "1d":
        return 1_825;
      case "1w":
        return 520;
      default:
        return 2_000;
    }
  }, [timeframe]);

  const queryClient = useQueryClient();
  useEffect(() => {
    if (!selectedSymbol || replayVersion) return;
    const commonTfs: Timeframe[] = ["15m", "30m", "1h", "4h", "1d"];
    for (const tf of commonTfs) {
      if (tf === timeframe) continue;
      const limit = tf === "4h" || tf === "1h" ? 2_500 : tf === "1d" ? 1_825 : 2_000;
      prefetchCandles(queryClient, selectedSymbol, tf, limit);
    }
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
          const priceRange = getChartPriceRange(chart);
          const timeScaleState = getChartTimeScaleState(chart);
          const vr = chart.timeScale().getVisibleRange();
          const lr = chart.timeScale().getVisibleLogicalRange();
          const totalBars = allCandlesLength > 0 ? allCandlesLength : candles.length;
          const ts = chart.timeScale() as any;
          const scrollPos = typeof ts.scrollPosition === "function" ? ts.scrollPosition() : 0;
          const hasValidVr =
            vr && typeof vr.from === "number" && typeof vr.to === "number" && vr.from < vr.to;
          const latestBarIdx = totalBars > 0 ? totalBars - 1 : 0;
          const isLatestBarInView =
            totalBars <= 0 ||
            !lr ||
            lr.to >= totalBars - 30 ||
            (latestBarIdx >= lr.from - 10 && latestBarIdx <= lr.to + 50);
          const isAtLiveEdge = scrollPos >= -30 || isLatestBarInView;
          const barCount = lr ? Math.round(lr.to - lr.from) : (timeScaleState?.visibleBars || 80);

          if (!isAtLiveEdge && hasValidVr) {
            const fromTime = vr.from as number;
            const toTime = vr.to as number;
            const centerTime = Math.round((fromTime + toTime) / 2);
            anchor = {
              symbol: selectedSymbol,
              fromTime,
              toTime,
              centerTime,
              barCount,
              priceRange,
              timeScaleState,
            };
          } else {
            anchor = {
              symbol: selectedSymbol,
              fromTime: 0,
              toTime: 0,
              centerTime: 0,
              barCount,
              priceRange,
              timeScaleState,
            };
          }
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
    [mainChart, allCandlesLength, candles.length, selectedSymbol],
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

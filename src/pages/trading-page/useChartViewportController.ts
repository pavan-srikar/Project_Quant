import type { IChartApi } from "lightweight-charts";
import { useCallback, useMemo, useState } from "react";
import { useCandles } from "../../services/queries.ts";
import { useTradingStore } from "../../services/store.tsx";
import { setRepositoryAnchor } from "../../services/market-data/index.ts";
import { TIMEFRAMES, type Timeframe } from "../trading/constants.ts";

export interface HistoricalAnchor {
  symbol: string;
  centerTime: number;
  fromTime: number;
  toTime: number;
  barCount: number;
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
          const vr = chart.timeScale().getVisibleRange();
          const lr = chart.timeScale().getVisibleLogicalRange();
          const totalBars = allCandlesLength;
          const hasValidVr =
            vr && typeof vr.from === "number" && typeof vr.to === "number" && vr.from < vr.to;
          const isAtLiveEdge = totalBars > 0 && lr && lr.to >= totalBars - 3;

          if (!isAtLiveEdge && hasValidVr) {
            const fromTime = vr.from as number;
            const toTime = vr.to as number;
            const centerTime = Math.round((fromTime + toTime) / 2);
            const barCount = lr ? Math.max(30, Math.min(250, Math.round(lr.to - lr.from))) : 80;
            anchor = {
              symbol: selectedSymbol,
              fromTime,
              toTime,
              centerTime,
              barCount,
            };
          }
        } catch {}
      }

      useTradingStore.getState().setChartViewportAnchor(anchor);
      setRepositoryAnchor(anchor);
      setHistoricalTargetTime(anchor ? anchor.centerTime : undefined);
      setTimeframe(tf);
      localStorage.setItem("trading_timeframe", tf);
    },
    [mainChart, allCandlesLength, selectedSymbol],
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

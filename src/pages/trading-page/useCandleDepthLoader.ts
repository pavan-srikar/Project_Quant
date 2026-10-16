import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { queryKeys, useCandles } from "../../services/queries.ts";
import type { Candle } from "../../services/schemas.ts";
import { TIMEFRAMES, type Timeframe } from "../trading/constants.ts";

export function useCandleDepthLoader(selectedSymbol: string, replayVersion?: number) {
  const queryClient = useQueryClient();

  // Chart timeframe persistence (#8)
  const [timeframe, setTimeframe] = useState<Timeframe>(() => {
    const saved = localStorage.getItem(`tf_${selectedSymbol}`);
    return saved && TIMEFRAMES.includes(saved as Timeframe) ? (saved as Timeframe) : "15m";
  });

  const handleTimeframeChange = useCallback(
    (tf: Timeframe) => {
      setTimeframe(tf);
      localStorage.setItem(`tf_${selectedSymbol}`, tf);
    },
    [selectedSymbol],
  );

  // Restore timeframe when symbol changes
  useEffect(() => {
    const saved = localStorage.getItem(`tf_${selectedSymbol}`);
    if (saved && TIMEFRAMES.includes(saved as Timeframe)) setTimeframe(saved as Timeframe);
  }, [selectedSymbol]);

  // Deep-history target used after the initial fast render completes.
  const deepCandleLimit = useMemo(() => {
    switch (timeframe) {
      case "1m":
        return 3_000;
      case "5m":
        return 5_000;
      case "15m":
        return 12_000;
      case "30m":
        return 8_000;
      case "1h":
        return 8_760;
      case "4h":
        return 4_380;
      case "1d":
        return 1_825;
      case "1w":
        return 520;
      default:
        return 5_000;
    }
  }, [timeframe]);

  // First paint: viewport-sized so the initial fetch is as small as possible.
  // Mobile (<768px) needs fewer bars to fill the screen; desktop gets more.
  // The deep-history fetch fires 400ms later and loads a full year of data.
  const firstPaintCandleLimit = useMemo(() => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    return isMobile ? 500 : 400;
  }, []);

  const [candleLimit, setCandleLimit] = useState(firstPaintCandleLimit);

  useEffect(() => {
    // If deep candles are already in cache for this symbol & timeframe, skip the 400-bar downgrade
    const cached = queryClient.getQueryData<{ candles?: Candle[] }>([
      ...queryKeys.market.candles(selectedSymbol, timeframe),
      deepCandleLimit,
      replayVersion ?? 0,
    ]);
    if (cached?.candles && cached.candles.length > 0) {
      setCandleLimit(deepCandleLimit);
      return;
    }

    setCandleLimit(firstPaintCandleLimit);
    // Wait long enough for the first-paint response to arrive and render
    // before firing the heavier deep-history request. 400 ms is a reasonable
    // budget for a cached/warm DB response; users on fast connections will
    // see data before the deep load starts, avoiding visible re-draws.
    const timer = window.setTimeout(() => {
      setCandleLimit(deepCandleLimit);
    }, 400);
    return () => {
      window.clearTimeout(timer);
    };
  }, [selectedSymbol, timeframe, firstPaintCandleLimit, deepCandleLimit, queryClient, replayVersion]);

  const { data: candles = [] } = useCandles(selectedSymbol, timeframe, candleLimit, replayVersion);

  return {
    timeframe,
    setTimeframe,
    handleTimeframeChange,
    candles,
  };
}

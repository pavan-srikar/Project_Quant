import { useCallback, useMemo, useState } from "react";
import { useCandles } from "../../services/queries.ts";
import { TIMEFRAMES, type Timeframe } from "../trading/constants.ts";

export function useCandleDepthLoader(
  selectedSymbol: string,
  replayVersion?: number,
  targetTimeSec?: number,
) {
  // Chart timeframe persistence - global across symbols
  const [timeframe, setTimeframe] = useState<Timeframe>(() => {
    const saved = localStorage.getItem("trading_timeframe");
    return saved && TIMEFRAMES.includes(saved as Timeframe) ? (saved as Timeframe) : "15m";
  });

  const handleTimeframeChange = useCallback((tf: Timeframe) => {
    setTimeframe(tf);
    localStorage.setItem("trading_timeframe", tf);
  }, []);

  // Clean, high-performance candle limit per timeframe (<3k bars for instant 60fps rendering)
  const candleLimit = useMemo(() => {
    switch (timeframe) {
      case "1m":
        return 1_000;
      case "5m":
        return 1_500;
      case "15m":
        return 2_000;
      case "30m":
        return 2_000;
      case "1h":
        return 2_500;
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
    targetTimeSec,
  );

  return {
    timeframe,
    setTimeframe,
    handleTimeframeChange,
    candles,
  };
}

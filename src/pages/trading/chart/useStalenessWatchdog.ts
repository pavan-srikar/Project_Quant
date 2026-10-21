import type { useQueryClient } from "@tanstack/react-query";
import type { CandlestickData, Time } from "lightweight-charts";
import { useEffect } from "react";
import { TF_INTERVAL_MS, type Timeframe } from "../constants.ts";
import { isSeriesAtLiveEdge, requestGapRefetch } from "./realtimeFeed.ts";

export function useStalenessWatchdog(
  isReplaying: boolean | undefined,
  timeframe: Timeframe,
  lastCandleRef: React.RefObject<CandlestickData<Time> | null>,
  lastGapRefetchAtRef: React.RefObject<number>,
  queryClient: ReturnType<typeof useQueryClient>,
  selectedSymbol: string,
) {
  useEffect(() => {
    if (isReplaying) return;
    const intervalSec = (TF_INTERVAL_MS[timeframe] ?? 60_000) / 1000;
    const id = setInterval(() => {
      if (!lastCandleRef.current) return;
      const lastBarSec = lastCandleRef.current.time as number;
      if (!isSeriesAtLiveEdge(lastBarSec, timeframe)) return;
      const staleSec = Date.now() / 1000 - lastBarSec;
      if (staleSec < intervalSec * 2) return;
      requestGapRefetch(
        lastGapRefetchAtRef,
        queryClient,
        selectedSymbol,
        timeframe,
      );
    }, 30_000);
    return () => clearInterval(id);
  }, [
    selectedSymbol,
    timeframe,
    queryClient,
    isReplaying,
    lastCandleRef,
    lastGapRefetchAtRef,
  ]);
}

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore, useTradingStore } from "../../services/store.tsx";
import { wsClient } from "../../services/ws.ts";
import { queryKeys } from "../../services/queries.ts";
import { type MarketDataEvent, toTimestamp } from "./types.ts";

export function useMarketDataWs() {
  const updateTick = useTradingStore((s) => s.updateTick);
  const updateLiveTick = useTradingStore((s) => s.updateLiveTick);
  const updateCandleFromWs = useTradingStore((s) => s.updateCandleFromWs);
  const onReplayStateChanged = useTradingStore((s) => s.onReplayStateChanged);
  const queryClient = useQueryClient();

  // Market-data: ticks, candles, replay.
  useEffect(() => {
    const unsub = wsClient.subscribe("market-data", (event) => {
      const wsEvent = event as MarketDataEvent;
      if (wsEvent.eventType === "MarketTick") {
        updateTick(wsEvent.symbol, wsEvent.bid, wsEvent.ask, toTimestamp(wsEvent.occurredAt));
      } else if ((wsEvent as { eventType: string }).eventType === "HftLiveTick") {
        const liveTick = wsEvent as unknown as { symbol: string; bid: number; ask: number; occurredAt?: number | string };
        updateLiveTick(liveTick.symbol, liveTick.bid, liveTick.ask, toTimestamp(liveTick.occurredAt));
      } else if (wsEvent.eventType === "CandleUpdate") {
        updateCandleFromWs(wsEvent.symbol, wsEvent.timeframe, {
          open: wsEvent.open,
          high: wsEvent.high,
          low: wsEvent.low,
          close: wsEvent.close,
          volume: wsEvent.volume,
          timestamp: wsEvent.timestamp,
        });
      } else if (wsEvent.eventType === "CandleClosed") {
        queryClient.invalidateQueries({
          queryKey: queryKeys.market.candles(wsEvent.symbol, wsEvent.timeframe),
        });
      } else if (wsEvent.eventType === "ReplayStateChanged") {
        const currentUserId = useAuthStore.getState().user?.id;
        if (wsEvent.userId && currentUserId && wsEvent.userId !== currentUserId) return;
        onReplayStateChanged(wsEvent.action || "started", {
          speed: wsEvent.speed,
          cursorTimestamp: wsEvent.cursorTimestamp,
        });
        queryClient.invalidateQueries({ queryKey: ["candles"] });
      }
    });
    return () => {
      unsub();
    };
  }, [updateTick, updateLiveTick, updateCandleFromWs, onReplayStateChanged, queryClient]);
}

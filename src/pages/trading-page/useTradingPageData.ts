import { useMemo } from "react";
import type { useChartPreferences } from "../../hooks/useChartPreferences.ts";
import { useOrders, usePositions } from "../../services/queries.ts";
import type { Symbol } from "../../services/schemas.ts";
import { useTradingStore } from "../../services/store.tsx";
import type { Timeframe } from "../trading/constants.ts";
import { useReplayChartData } from "../trading/useReplayChartData.ts";
import { useReplayPlayback } from "../trading/useReplayPlayback.ts";
import { getPipDigits } from "../trading/utils.ts";

export interface UseTradingPageDataParams {
  activeAccountId: string | null;
  selectedSymbol: string;
  timeframe: Timeframe;
  symbols: Symbol[];
  chartPrefs: ReturnType<typeof useChartPreferences>;
}

export function useTradingPageData({
  activeAccountId,
  selectedSymbol,
  timeframe,
  symbols,
  chartPrefs,
}: UseTradingPageDataParams) {
  // Replay
  const { replayCandles, replayTradeEvents } = useReplayChartData(activeAccountId);
  useReplayPlayback(activeAccountId ?? "");

  // Positions & Orders
  const { data: positions = [] } = usePositions(activeAccountId);
  const { data: orders = [] } = useOrders(activeAccountId);
  const chartPositions = chartPrefs.overlayPositionsOnChart ? positions : [];
  const chartOrders = chartPrefs.overlayPositionsOnChart ? orders : [];
  const positionPnl = useMemo(
    () => positions.reduce((sum, position) => sum + (position.unrealizedPnl || 0), 0),
    [positions],
  );

  // Account & symbols info
  const account = useTradingStore((s) => s.accounts.find((a) => a.id === activeAccountId));
  const ticks = useTradingStore((s) => s.ticks);
  const tick = ticks[selectedSymbol];
  const symbolInfo = symbols.find((s) => s.name === selectedSymbol) as Symbol | undefined;
  const liveCandleUpdates = useTradingStore((s) => s.liveCandleUpdates);
  const liveCandle = liveCandleUpdates[`${selectedSymbol}:${timeframe}`];
  const pipDigits = useMemo(
    () => getPipDigits(symbolInfo, selectedSymbol),
    [symbolInfo, selectedSymbol],
  );

  return {
    replayCandles,
    replayTradeEvents,
    positions,
    orders,
    chartPositions,
    chartOrders,
    positionPnl,
    account,
    tick,
    symbolInfo,
    liveCandle,
    pipDigits,
  };
}

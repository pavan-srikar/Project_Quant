import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import type { MarketDataCandlesPayload } from "../api/market-data";
import type { Candle, Symbol } from "../schemas";
import { queryKeys } from "./keys";

export function useSymbols() {
  return useQuery<Symbol[]>({
    queryKey: queryKeys.market.symbols,
    queryFn: () => api.getSymbols(),
    staleTime: 5 * 60_000, // 5min
  });
}

export interface EconomicCalendarEvent {
  id: string;
  time: string;
  currency: string;
  impact: "low" | "medium" | "high";
  event: string;
  forecast?: string;
  previous?: string;
  actual?: string;
  country: string;
}

export function useEconomicCalendar(currencies: string[]) {
  return useQuery<EconomicCalendarEvent[]>({
    queryKey: queryKeys.market.economicCalendar(currencies),
    queryFn: async () => {
      const now = new Date();
      const from = new Date(now);
      from.setDate(from.getDate() - 14);
      const to = new Date(now);
      to.setDate(to.getDate() + 14);
      const res = await api.getEconomicCalendar(
        currencies,
        from.toISOString().split("T")[0],
        to.toISOString().split("T")[0],
      );
      return res as EconomicCalendarEvent[];
    },
    enabled: currencies.length > 0,
    staleTime: 10 * 60_000, // refresh every 10min
  });
}

export function useCandles(
  symbol: string,
  timeframe: string,
  limit?: number,
  replayVersion?: number,
) {
  return useQuery<MarketDataCandlesPayload, Error, Candle[]>({
    // Include replayVersion in the query key so each replay session forces a
    // completely fresh query — React Query won't reuse structural sharing or
    // stale cache from a previous replay / normal session.
    queryKey: [...queryKeys.market.candles(symbol, timeframe), limit ?? "auto", replayVersion ?? 0],
    queryFn: () =>
      api.getCandlesWithMeta(symbol, timeframe, limit) as unknown as Promise<MarketDataCandlesPayload>,
    // Extract just the candles array for consumers — raw payload (with isPartial)
    // is still accessible via query.state.data inside refetchInterval below.
    select: (data) => data.candles,
    staleTime: 30_000,
    // Keep previously-fetched candles visible while a new depth query (different
    // limit in the key) is in-flight for the EXACT same symbol & timeframe.
    // When switching symbols, placeholderData should be undefined so old symbol
    // data does not persist.
    placeholderData: (prev, prevQuery) => {
      const prevKey = prevQuery?.queryKey;
      if (prevKey && prevKey[1] === symbol && prevKey[2] === timeframe) {
        return prev;
      }
      return undefined;
    },
    // When the server signals the response is partial (backfill queued), poll
    // at 3 s until data fills in. Otherwise use the 5-min safety-net cadence.
    refetchInterval: (query) => (query.state.data?.metadata?.isPartial ? 3_000 : 5 * 60_000),
  });
}

export function useMarketDataHealth() {
  return useQuery({
    queryKey: ["market-data-health"] as const,
    queryFn: () => api.getMarketDataHealth(),
    staleTime: 5_000,
    refetchInterval: 5_000,
  });
}

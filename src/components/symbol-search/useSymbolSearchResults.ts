import { useState, useEffect, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getBinanceTickers,
  getCachedTickers,
  createSymbolDefinition,
  saveKnownPrice,
  type BinanceSearchResult,
} from "../../services/demo/binance.ts";
import { updateFeedPrice } from "../../services/demo/feed.ts";
import { addDynamicSymbol } from "../../services/demo/instruments.ts";
import { queryKeys } from "../../services/queries.ts";
import { useTradingStore } from "../../services/store.tsx";
import type { Symbol as TradingSymbol } from "../../services/schemas.ts";
import { toast } from "../../services/toast.ts";
import type { SearchCategory } from "./types.ts";

export interface UseSymbolSearchResultsParams {
  isOpen: boolean;
  query: string;
  category: SearchCategory;
  mode: "switch" | "add_to_watchlist";
  onSelectSymbol: (symbol: string) => void;
  onClose: () => void;
}

export function useSymbolSearchResults({
  isOpen,
  query,
  category,
  mode,
  onSelectSymbol,
  onClose,
}: UseSymbolSearchResultsParams) {
  const queryClient = useQueryClient();
  const [tickers, setTickers] = useState<BinanceSearchResult[]>(getCachedTickers);
  const [loading, setLoading] = useState(false);

  const symbols = useTradingStore((s) => s.symbols);
  const loadSymbols = useTradingStore((s) => s.loadSymbols);
  const watchlistSymbols = useTradingStore((s) => s.watchlistSymbols);
  const watchlists = useTradingStore((s) => s.watchlists);
  const activeWatchlistId = useTradingStore((s) => s.activeWatchlistId);
  const addToWatchlist = useTradingStore((s) => s.addToWatchlist);
  const removeFromWatchlist = useTradingStore((s) => s.removeFromWatchlist);

  const activeWatchlist = useMemo(
    () => watchlists.find((w) => w.id === activeWatchlistId),
    [watchlists, activeWatchlistId],
  );

  // Fetch Binance tickers on open
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      getBinanceTickers()
        .then((res) => {
          setTickers(res);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  // Filtered results list
  const filteredResults = useMemo(() => {
    const q = query.trim().toUpperCase();

    // Map existing loaded symbols to result shape
    const localResults: BinanceSearchResult[] = symbols.map((s) => {
      const baseAsset = s.name.replace(/USD[T]?$/, "");
      const matchedTicker = tickers.find(
        (t) => t.symbol === s.name || t.baseAsset === baseAsset,
      );
      return {
        symbol: s.name,
        binancePair: `${baseAsset}USDT`,
        baseAsset,
        displayName: s.displayName || baseAsset,
        price: matchedTicker?.price ?? 0,
        change24h: matchedTicker?.change24h ?? 0,
        volume24h: matchedTicker?.volume24h ?? 1000000,
        tickSize: s.tickSize,
      };
    });

    // Combine local results with all public Binance pairs
    const seen = new Set<string>();
    const combined: BinanceSearchResult[] = [];

    for (const item of localResults) {
      if (!seen.has(item.symbol)) {
        seen.add(item.symbol);
        combined.push(item);
      }
    }

    for (const item of tickers) {
      if (!seen.has(item.symbol)) {
        seen.add(item.symbol);
        combined.push(item);
      }
    }

    let results = combined;

    if (category === "watchlist") {
      results = results.filter((r) => watchlistSymbols.includes(r.symbol));
    }

    if (!q) return results.slice(0, 80);

    return results
      .filter(
        (r) =>
          r.symbol.toUpperCase().includes(q) ||
          r.baseAsset.toUpperCase().includes(q) ||
          r.displayName.toUpperCase().includes(q),
      )
      .slice(0, 80);
  }, [query, category, symbols, tickers, watchlistSymbols]);

  // Handle selection
  const handleSelect = useCallback(
    (item: BinanceSearchResult) => {
      // 1. Ensure symbol is registered in instruments
      const def = createSymbolDefinition(item.symbol, item.displayName, item.tickSize);
      addDynamicSymbol(def);

      // 2. Immediately seed live price into price cache and feed so watchlist and chart have it instantly
      if (item.price > 0) {
        saveKnownPrice(item.symbol, item.price);
        updateFeedPrice(item.symbol, item.price, item.tickSize);
      }

      // 3. Synchronously update React Query's symbols cache so all components immediately see the new symbol
      queryClient.setQueryData<TradingSymbol[]>(queryKeys.market.symbols, (old) => {
        const list = old ? [...old] : [];
        if (!list.some((s) => s.name === def.name)) {
          list.push(def);
        }
        return list;
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.market.symbols });

      // 4. Update zustand store symbols
      loadSymbols();

      // 5. Invalidate candle queries for the new symbol
      queryClient.invalidateQueries({ queryKey: ["candles", item.symbol] });

      // 6. Only add to user's watchlist if explicitly opened from "+ Add Symbol"
      if (mode === "add_to_watchlist") {
        addToWatchlist(item.symbol, activeWatchlistId);
        const targetName = activeWatchlist ? activeWatchlist.name : "watchlist";
        toast.success("Watchlist", `Added ${item.symbol} to ${targetName}`);
      }

      // 7. Select symbol & close modal
      onSelectSymbol(item.symbol);
      onClose();
    },
    [
      queryClient,
      loadSymbols,
      mode,
      addToWatchlist,
      activeWatchlistId,
      activeWatchlist,
      onSelectSymbol,
      onClose,
    ],
  );

  return {
    tickers,
    loading,
    filteredResults,
    handleSelect,
    activeWatchlist,
    watchlistSymbols,
    addToWatchlist,
    removeFromWatchlist,
    activeWatchlistId,
  };
}

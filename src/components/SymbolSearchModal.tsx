import { useState, useEffect, useRef, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Search, X, TrendingUp, TrendingDown, Star, Sparkles, Plus, Check } from "lucide-react";
import {
  getBinanceTickers,
  getCachedTickers,
  createSymbolDefinition,
  saveKnownPrice,
  type BinanceSearchResult,
} from "../services/demo/binance.ts";
import { updateFeedPrice } from "../services/demo/feed.ts";
import { addDynamicSymbol } from "../services/demo/instruments.ts";
import { queryKeys } from "../services/queries.ts";
import { useTradingStore } from "../services/store.tsx";
import type { Symbol as TradingSymbol } from "../services/schemas.ts";
import { cn } from "../lib/utils.ts";
import { toast } from "../services/toast.ts";

interface SymbolSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  initialQuery?: string;
  mode?: "switch" | "add_to_watchlist";
}

export function SymbolSearchModal({
  isOpen,
  onClose,
  selectedSymbol,
  onSelectSymbol,
  initialQuery = "",
  mode = "switch",
}: SymbolSearchModalProps) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<"all" | "crypto" | "watchlist">("all");
  const [tickers, setTickers] = useState<BinanceSearchResult[]>(getCachedTickers);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

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

  // Sync initial query when opened via keypress
  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      setSelectedIndex(0);
      requestAnimationFrame(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.selectionStart = inputRef.current.value.length;
          inputRef.current.selectionEnd = inputRef.current.value.length;
        }
      });
    }
  }, [isOpen, initialQuery]);

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
  const handleSelect = (item: BinanceSearchResult) => {
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
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredResults.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredResults[selectedIndex]) {
          handleSelect(filteredResults[selectedIndex]!);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredResults, selectedIndex]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.children[selectedIndex] as HTMLElement | undefined;
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-start justify-center pt-16 md:pt-24 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl mx-4 bg-[#131722] border border-[#2a2e39] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header & Search Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#2a2e39] bg-[#1e222d]">
          <Search className="h-5 w-5 text-neutral-400 shrink-0" />
          <input
            ref={inputRef}
            placeholder={
              mode === "add_to_watchlist"
                ? "Add symbol to watchlist (e.g. DOGE, PEPE, SOL)..."
                : "Search symbols (e.g. BTC, ETH, DOGE, SOL, PEPE)..."
            }
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 bg-transparent text-base text-neutral-100 placeholder:text-neutral-500 outline-none font-medium"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setSelectedIndex(0);
                inputRef.current?.focus();
              }}
              className="p-1 rounded text-neutral-400 hover:text-neutral-200 hover:bg-[#2a2e39]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {mode === "add_to_watchlist" && (
            <div className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-[#2962ff] bg-[#2962ff]/15 px-2 py-0.5 rounded border border-[#2962ff]/30">
              Add to {activeWatchlist ? `"${activeWatchlist.name}"` : "Watchlist"}
            </div>
          )}
          <div className="hidden sm:flex items-center gap-1 text-[11px] text-neutral-400 font-mono bg-[#131722] px-2 py-0.5 rounded border border-[#2a2e39]">
            ESC to close
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[#2a2e39] bg-[#131722] text-xs font-semibold">
          <button
            onClick={() => setCategory("all")}
            className={cn(
              "px-3 py-1 rounded-md transition-colors",
              category === "all"
                ? "bg-[#2962ff] text-white"
                : "text-neutral-400 hover:text-neutral-200 hover:bg-[#1e222d]",
            )}
          >
            All
          </button>
          <button
            onClick={() => setCategory("crypto")}
            className={cn(
              "px-3 py-1 rounded-md transition-colors flex items-center gap-1",
              category === "crypto"
                ? "bg-[#2962ff] text-white"
                : "text-neutral-400 hover:text-neutral-200 hover:bg-[#1e222d]",
            )}
          >
            <Sparkles className="h-3 w-3" />
            Crypto
          </button>
          <button
            onClick={() => setCategory("watchlist")}
            className={cn(
              "px-3 py-1 rounded-md transition-colors flex items-center gap-1",
              category === "watchlist"
                ? "bg-[#2962ff] text-white"
                : "text-neutral-400 hover:text-neutral-200 hover:bg-[#1e222d]",
            )}
          >
            <Star className="h-3 w-3" />
            Watchlist
          </button>
        </div>

        {/* Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto overscroll-contain divide-y divide-[#1e222d]">
          {filteredResults.length === 0 ? (
            <div className="py-12 text-center text-sm text-neutral-400">
              {loading ? "Searching Binance crypto pairs..." : `No pairs match "${query}"`}
            </div>
          ) : (
            filteredResults.map((item, index) => {
              const isSelected = item.symbol === selectedSymbol;
              const isFocused = index === selectedIndex;
              const isPositive = item.change24h >= 0;
              const isWatchlisted = watchlistSymbols.includes(item.symbol);

              return (
                <button
                  key={item.symbol}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors",
                    isFocused ? "bg-[#2a2e39]" : "hover:bg-[#1e222d]",
                    isSelected && "border-l-2 border-[#2962ff]",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#1e222d] border border-[#2a2e39] flex items-center justify-center font-bold text-xs text-neutral-200 shrink-0">
                      {item.baseAsset.slice(0, 3)}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-neutral-100">{item.symbol}</span>
                        <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-[#2a2e39] text-neutral-400">
                          BINANCE
                        </span>
                      </div>
                      <span className="text-xs text-neutral-400">{item.displayName}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {item.price > 0 && (
                      <div className="flex flex-col items-end">
                        <span className="font-mono font-medium text-sm text-neutral-100">
                          ${item.price < 1 ? item.price.toFixed(4) : item.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        <div
                          className={cn(
                            "flex items-center gap-0.5 text-xs font-semibold",
                            isPositive ? "text-[#0ecb81]" : "text-[#f6465d]",
                          )}
                        >
                          {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {isPositive ? "+" : ""}
                          {item.change24h.toFixed(2)}%
                        </div>
                      </div>
                    )}

                    {/* Quick Watchlist Toggle Button */}
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isWatchlisted) {
                          removeFromWatchlist(item.symbol);
                          toast.success("Watchlist", `Removed ${item.symbol} from watchlist`);
                        } else {
                          const def = createSymbolDefinition(item.symbol, item.displayName, item.tickSize);
                          addDynamicSymbol(def);
                          if (item.price > 0) {
                            saveKnownPrice(item.symbol, item.price);
                            updateFeedPrice(item.symbol, item.price, item.tickSize);
                          }
                          addToWatchlist(item.symbol);
                          toast.success("Watchlist", `Added ${item.symbol} to watchlist`);
                        }
                      }}
                      className={cn(
                        "p-1.5 rounded transition-colors shrink-0 cursor-pointer",
                        isWatchlisted
                          ? "text-[#2962ff] bg-[#2962ff]/15 hover:bg-[#2962ff]/25"
                          : "text-neutral-400 hover:text-neutral-100 hover:bg-[#2a2e39]",
                      )}
                      title={isWatchlisted ? "Remove from watchlist" : "Add to watchlist"}
                    >
                      {isWatchlisted ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Hint */}
        <div className="px-4 py-2 border-t border-[#2a2e39] bg-[#1e222d] flex items-center justify-between text-[11px] text-neutral-400">
          <span>
            {mode === "add_to_watchlist"
              ? "Click pair to add to your watchlist & view chart"
              : "Search hundreds of Binance crypto pairs in real time"}
          </span>
          <span>Press ↵ to select</span>
        </div>
      </div>
    </div>
  );
}

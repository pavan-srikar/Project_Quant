import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import type { SymbolSearchModalProps, SearchCategory } from "./types";
import { CategoryFilterBar } from "./CategoryFilterBar";
import { SymbolSearchResultRow } from "./SymbolSearchResultRow";
import { useSymbolSearchResults } from "./useSymbolSearchResults";
import { toast } from "../../services/toast.ts";

export function SymbolSearchModal({
  isOpen,
  onClose,
  selectedSymbol,
  onSelectSymbol,
  initialQuery = "",
  mode = "switch",
}: SymbolSearchModalProps) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<SearchCategory>("all");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const {
    loading,
    filteredResults,
    handleSelect,
    activeWatchlist,
    watchlistSymbols,
    addToWatchlist,
    removeFromWatchlist,
    activeWatchlistId,
  } = useSymbolSearchResults({
    isOpen,
    query,
    category,
    mode,
    onSelectSymbol,
    onClose,
  });

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        className="w-full max-w-2xl bg-card border border-border/80 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] md:max-h-[640px] animate-in zoom-in-95 duration-150 mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header / Search Input */}
        <div className="flex items-center px-4 py-3 border-b border-border/60 gap-3 bg-secondary/30">
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search crypto symbols (e.g. BTC, ETH, SOL)..."
            className="flex-1 bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground text-sm font-medium"
            autoFocus
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="text-muted-foreground hover:text-foreground text-xs px-1.5 py-0.5 rounded bg-secondary hover:bg-secondary/80 transition-colors"
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Categories Bar */}
        <CategoryFilterBar category={category} onSelectCategory={setCategory} />

        {/* Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto divide-y divide-border/20">
          {loading && filteredResults.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>Fetching market data from Binance...</span>
            </div>
          )}

          {!loading && filteredResults.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No symbols found for "{query}"
            </div>
          )}

          {filteredResults.map((item, index) => {
            const isSelected = selectedSymbol === item.symbol;
            const isHighlighted = selectedIndex === index;
            const inWatchlist = watchlistSymbols.includes(item.symbol);

            return (
              <SymbolSearchResultRow
                key={item.symbol}
                item={item}
                isSelected={isSelected}
                isFocused={isHighlighted}
                isWatchlisted={inWatchlist}
                onMouseEnter={() => setSelectedIndex(index)}
                onSelect={() => handleSelect(item)}
                onToggleWatchlist={(e) => {
                  e.stopPropagation();
                  if (inWatchlist) {
                    removeFromWatchlist(item.symbol, activeWatchlistId);
                    const targetName = activeWatchlist ? activeWatchlist.name : "watchlist";
                    toast.info("Watchlist", `Removed ${item.symbol} from ${targetName}`);
                  } else {
                    addToWatchlist(item.symbol, activeWatchlistId);
                    const targetName = activeWatchlist ? activeWatchlist.name : "watchlist";
                    toast.success("Watchlist", `Added ${item.symbol} to ${targetName}`);
                  }
                }}
              />
            );
          })}
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-2 bg-secondary/30 border-t border-border/40 text-[11px] text-muted-foreground flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span>
              Use <kbd className="px-1 py-0.5 rounded bg-secondary border border-border">↑</kbd>{" "}
              <kbd className="px-1 py-0.5 rounded bg-secondary border border-border">↓</kbd> to
              navigate
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded bg-secondary border border-border">Enter</kbd> to
              select
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded bg-secondary border border-border">Esc</kbd> to
              close
            </span>
          </div>
          <span>Showing {filteredResults.length} symbols</span>
        </div>
      </div>
    </div>
  );
}

import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { toast } from "../../../services/toast.ts";
import { useTradingStore } from "../../../services/store.tsx";
import { getKnownChange24h } from "../../../services/demo/binance.ts";
import type { WatchlistPanelProps, ActiveTab } from "./types";
import { RibbonFlagIcon } from "./RibbonFlagIcon";
import { useTickerChanges } from "./useTickerChanges";
import { WatchlistBurgerMenu } from "./WatchlistBurgerMenu";
import { WatchlistTabBar } from "./WatchlistTabBar";
import { WatchlistSymbolRow } from "./WatchlistSymbolRow";

export function WatchlistPanel({
  symbols,
  ticks,
  selectedSymbol,
  onSelect,
  onOpenSymbolSearch,
  oneClick,
  accountId,
  isFeedConnected = true,
}: WatchlistPanelProps) {
  const watchlists = useTradingStore((s) => s.watchlists);
  const activeWatchlistId = useTradingStore((s) => s.activeWatchlistId);
  const flaggedSymbols = useTradingStore((s) => s.flaggedSymbols);
  const toggleFlagSymbol = useTradingStore((s) => s.toggleFlagSymbol);
  const removeFromWatchlist = useTradingStore((s) => s.removeFromWatchlist);
  const reorderWatchlist = useTradingStore((s) => s.reorderWatchlist);

  // Active view: "watchlist" | "flagged" | "all"
  const [activeTab, setActiveTab] = useState<ActiveTab>("watchlist");

  // Drag & drop state (only active when in "watchlist" view)
  const [draggedSymbol, setDraggedSymbol] = useState<string | null>(null);
  const [dragOverSymbol, setDragOverSymbol] = useState<string | null>(null);

  // 24h Price change % hook
  const tickerChanges = useTickerChanges();

  // Current active watchlist object
  const activeWatchlist = useMemo(
    () => watchlists.find((w) => w.id === activeWatchlistId) || watchlists[0],
    [watchlists, activeWatchlistId],
  );

  // Map user's ordered watchlist symbols to symbol data
  const currentWatchlistItems = useMemo(() => {
    const symbolMap = new Map(symbols.map((s) => [s.name, s]));
    const list = activeWatchlist?.symbols || [];
    return list.map((name) => {
      const existing = symbolMap.get(name);
      if (existing) return existing;
      const baseAsset = name.replace(/USD[T]?$/, "");
      return {
        id: name,
        name,
        displayName: baseAsset,
        category: "CRYPTO",
        isActive: true,
      };
    });
  }, [symbols, activeWatchlist]);

  // Map flagged symbols
  const flaggedItems = useMemo(() => {
    const symbolMap = new Map(symbols.map((s) => [s.name, s]));
    return flaggedSymbols.map((name) => {
      const existing = symbolMap.get(name);
      if (existing) return existing;
      const baseAsset = name.replace(/USD[T]?$/, "");
      return {
        id: name,
        name,
        displayName: baseAsset,
        category: "CRYPTO",
        isActive: true,
      };
    });
  }, [symbols, flaggedSymbols]);

  // Map all catalog symbols + any custom symbols from watchlists/flagged
  const allItems = useMemo(() => {
    const knownMap = new Map(symbols.map((s) => [s.name, s]));
    const allKnownNames = new Set<string>();
    for (const wl of watchlists) {
      for (const sym of wl.symbols) allKnownNames.add(sym);
    }
    for (const sym of flaggedSymbols) allKnownNames.add(sym);

    const list = [...symbols];
    for (const name of allKnownNames) {
      if (!knownMap.has(name)) {
        const baseAsset = name.replace(/USD[T]?$/, "");
        list.push({
          id: name,
          name,
          displayName: baseAsset,
          category: "CRYPTO",
          isActive: true,
        });
      }
    }
    return list;
  }, [symbols, watchlists, flaggedSymbols]);

  const displayItems = useMemo(() => {
    if (activeTab === "flagged") return flaggedItems;
    if (activeTab === "all") return allItems;
    return currentWatchlistItems;
  }, [activeTab, flaggedItems, allItems, currentWatchlistItems]);

  const filtered = useMemo(() => {
    return displayItems.filter((s) => s.isActive !== false);
  }, [displayItems]);

  // Drag & drop handlers
  const isDragAllowed = activeTab === "watchlist";

  const handleDragStart = (e: React.DragEvent, symbolName: string) => {
    if (!isDragAllowed) return;
    setDraggedSymbol(symbolName);
    e.dataTransfer.setData("text/plain", symbolName);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, targetSymbol: string) => {
    if (!isDragAllowed) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedSymbol && draggedSymbol !== targetSymbol && dragOverSymbol !== targetSymbol) {
      setDragOverSymbol(targetSymbol);
    }
  };

  const handleDrop = (e: React.DragEvent, targetSymbol: string) => {
    if (!isDragAllowed || !activeWatchlist) return;
    e.preventDefault();
    const source = draggedSymbol || e.dataTransfer.getData("text/plain");
    if (!source || source === targetSymbol) {
      setDraggedSymbol(null);
      setDragOverSymbol(null);
      return;
    }

    const currentList = activeWatchlist.symbols;
    const fromIdx = currentList.indexOf(source);
    const toIdx = currentList.indexOf(targetSymbol);
    if (fromIdx >= 0 && toIdx >= 0) {
      const next = [...currentList];
      const [moved] = next.splice(fromIdx, 1);
      if (moved !== undefined) {
        next.splice(toIdx, 0, moved);
        reorderWatchlist(next, activeWatchlist.id);
      }
    }

    setDraggedSymbol(null);
    setDragOverSymbol(null);
  };

  const handleDragEnd = () => {
    setDraggedSymbol(null);
    setDragOverSymbol(null);
  };

  const handleRemoveSymbol = (name: string) => {
    if (activeTab === "flagged") {
      toggleFlagSymbol(name);
      toast.success("Watchlist Flag", `Unflagged ${name}`);
    } else if (activeWatchlist) {
      removeFromWatchlist(name, activeWatchlist.id);
      toast.success("Watchlist", `Removed ${name} from ${activeWatchlist.name}`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1e222d]">
      {/* Top Header */}
      <div className="shrink-0 px-3.5 pt-3 pb-2.5">
        {/* Header Title & Add Symbol */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
            Watchlist
          </span>
          {onOpenSymbolSearch && (
            <button
              onClick={onOpenSymbolSearch}
              className="flex items-center gap-1 text-xs text-[#2962ff] hover:text-[#2962ff]/80 font-medium px-2 py-1 rounded hover:bg-[#131722] transition-colors"
              title={
                activeTab === "watchlist" && activeWatchlist
                  ? `Add Symbol to ${activeWatchlist.name}`
                  : "Add Symbol to watchlist"
              }
            >
              <Plus className="h-3.5 w-3.5" />
              Add Symbol
            </button>
          )}
        </div>
      </div>

      {/* Floating Watchlist Carousel Bar */}
      <div className="px-2.5 shrink-0 mb-2">
        <div className="flex items-center gap-2 bg-[#131722] p-1.5 rounded-2xl border border-[#2a2e39] shadow-sm">
          <WatchlistBurgerMenu activeTab={activeTab} setActiveTab={setActiveTab} />
          <WatchlistTabBar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            allItemCount={allItems.length}
          />
        </div>
      </div>

      {/* Pairs Block - Distinct Panel with Rounded Corners and Gap */}
      <div className="flex-1 min-h-0 px-2.5 pb-2.5 flex flex-col">
        <div className="flex-1 min-h-0 flex flex-col bg-[#131722] border border-[#2a2e39] rounded-2xl shadow-sm overflow-hidden">
          <div className="flex-1 overflow-y-auto divide-y divide-[#1e222d] no-scrollbar">
            {filtered.length === 0 ? (
              <div className="py-12 px-4 text-center text-xs text-neutral-400 flex flex-col items-center gap-2">
                {activeTab === "flagged" ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-3 rounded-full bg-[#ff2604]/10 text-[#ff2604]">
                      <RibbonFlagIcon className="h-6 w-6" filled />
                    </div>
                    <span className="font-semibold text-neutral-300">No flagged pairs</span>
                    <span className="text-[11px] text-neutral-500 max-w-xs">
                      Click the red flag icon on any pair in your watchlists to pin it here.
                    </span>
                  </div>
                ) : activeTab === "watchlist" ? (
                  <div className="flex flex-col items-center gap-2">
                    <span>Watchlist "{activeWatchlist?.name || "Watchlist"}" is empty</span>
                    {onOpenSymbolSearch && (
                      <button
                        onClick={onOpenSymbolSearch}
                        className="text-[#2962ff] hover:underline font-medium"
                      >
                        + Add symbol to {activeWatchlist?.name || "watchlist"}
                      </button>
                    )}
                  </div>
                ) : (
                  <span>No symbols found</span>
                )}
              </div>
            ) : (
              filtered.map((s) => {
                const t = ticks[s.name];
                const isFlagged = flaggedSymbols.includes(s.name);
                const isSelected = s.name === selectedSymbol;
                const baseAsset = s.name.replace(/USD[T]?$/, "");
                const change =
                  tickerChanges[s.name] ??
                  tickerChanges[`${baseAsset}USDT`] ??
                  tickerChanges[baseAsset] ??
                  getKnownChange24h(s.name) ??
                  getKnownChange24h(`${baseAsset}USDT`) ??
                  getKnownChange24h(baseAsset);

                return (
                  <WatchlistSymbolRow
                    key={s.id || s.name}
                    symbol={s}
                    tick={t}
                    isSelected={isSelected}
                    isFlagged={isFlagged}
                    change={change}
                    oneClick={oneClick}
                    accountId={accountId}
                    isFeedConnected={isFeedConnected}
                    activeTab={activeTab}
                    activeWatchlistName={activeWatchlist?.name}
                    isDragAllowed={isDragAllowed}
                    draggedSymbol={draggedSymbol}
                    dragOverSymbol={dragOverSymbol}
                    onSelect={onSelect}
                    onToggleFlag={toggleFlagSymbol}
                    onRemove={handleRemoveSymbol}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onDragEnd={handleDragEnd}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

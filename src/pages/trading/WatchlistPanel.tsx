import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Plus, X, Trash2, GripVertical, Menu, Edit2, Check } from "lucide-react";
import { usePlaceOrder } from "../../services/queries.ts";
import { useTradingStore } from "../../services/store.tsx";
import { formatNumber, cn } from "../../lib/utils.ts";
import { toast } from "../../services/toast.ts";
import {
  getBinanceTickers,
  getCachedTickers,
  onTickersUpdated,
  getKnownChange24h,
} from "../../services/demo/binance.ts";

export function RibbonFlagIcon({
  className,
  filled = false,
}: {
  className?: string;
  filled?: boolean;
}) {
  if (filled) {
    return (
      <svg
        viewBox="0 0 16 19"
        fill="currentColor"
        className={cn("shrink-0", className)}
        aria-hidden="true"
      >
        <path d="M0.5 1.2C0.5 0.8 0.8 0.5 1.2 0.5H14.8C15.2 0.5 15.5 0.8 15.5 1.2V18.5L8 14.1L0.5 18.5V1.2Z" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 16 19"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <path d="M1.5 1.5H14.5V17.2L8 13.5L1.5 17.2V1.5Z" />
    </svg>
  );
}

export function WatchlistPanel({
  symbols,
  ticks,
  selectedSymbol,
  onSelect,
  onOpenSymbolSearch,
  oneClick,
  accountId,
  isFeedConnected = true,
}: {
  symbols: Array<{
    id?: string;
    name: string;
    displayName?: string | null;
    assetClass?: string;
    category?: string;
    isActive?: boolean;
    tickSize?: number;
  }>;
  ticks: Record<string, { bid: number; ask: number; timestamp: number }>;
  selectedSymbol: string;
  onSelect: (s: string) => void;
  onOpenSymbolSearch?: () => void;
  oneClick?: boolean;
  accountId?: string | null;
  isFeedConnected?: boolean;
}) {
  const placeOrder = usePlaceOrder();

  const watchlists = useTradingStore((s) => s.watchlists);
  const activeWatchlistId = useTradingStore((s) => s.activeWatchlistId);
  const flaggedSymbols = useTradingStore((s) => s.flaggedSymbols);
  const setActiveWatchlist = useTradingStore((s) => s.setActiveWatchlist);
  const createWatchlist = useTradingStore((s) => s.createWatchlist);
  const renameWatchlist = useTradingStore((s) => s.renameWatchlist);
  const deleteWatchlist = useTradingStore((s) => s.deleteWatchlist);
  const toggleFlagSymbol = useTradingStore((s) => s.toggleFlagSymbol);
  const removeFromWatchlist = useTradingStore((s) => s.removeFromWatchlist);
  const reorderWatchlist = useTradingStore((s) => s.reorderWatchlist);

  // Active view: "watchlist" | "flagged" | "all"
  const [activeTab, setActiveTab] = useState<"watchlist" | "flagged" | "all">("watchlist");

  // Burger menu dropdown state
  const [showMenu, setShowMenu] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");

  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuDropdownRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  // Scroll detection for horizontal carousel fade indicators
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    if (!tabsRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current;
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 2);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = tabsRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll, watchlists]);

  // Close burger dropdown on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        menuDropdownRef.current &&
        !menuDropdownRef.current.contains(e.target as Node) &&
        menuButtonRef.current &&
        !menuButtonRef.current.contains(e.target as Node)
      ) {
        setShowMenu(false);
        setIsCreating(false);
        setEditingId(null);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [showMenu]);

  // Current active watchlist object
  const activeWatchlist = useMemo(
    () => watchlists.find((w) => w.id === activeWatchlistId) || watchlists[0],
    [watchlists, activeWatchlistId],
  );

  const handleCreateWatchlist = () => {
    const trimmed = newListName.trim();
    if (!trimmed) return;
    const newId = createWatchlist(trimmed);
    setNewListName("");
    setIsCreating(false);
    setActiveWatchlist(newId);
    setActiveTab("watchlist");
    toast.success("Watchlist Created", `Created "${trimmed}"`);
  };

  const handleSaveRename = (id: string) => {
    const trimmed = renameText.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }
    renameWatchlist(id, trimmed);
    setEditingId(null);
    toast.success("Watchlist Renamed", `Renamed to "${trimmed}"`);
  };

  // Drag & drop state (only active when in "watchlist" view)
  const [draggedSymbol, setDraggedSymbol] = useState<string | null>(null);
  const [dragOverSymbol, setDragOverSymbol] = useState<string | null>(null);

  // 24h Price change % for each symbol
  const [tickerChanges, setTickerChanges] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    const cached = getCachedTickers();
    for (const t of cached) {
      initial[t.symbol] = t.change24h;
      initial[t.binancePair] = t.change24h;
      initial[t.baseAsset] = t.change24h;
    }
    return initial;
  });

  useEffect(() => {
    getBinanceTickers().then((res) => {
      const map: Record<string, number> = {};
      for (const t of res) {
        map[t.symbol] = t.change24h;
        map[t.binancePair] = t.change24h;
        map[t.baseAsset] = t.change24h;
      }
      setTickerChanges((prev) => ({ ...prev, ...map }));
    });

    const unsub = onTickersUpdated((res) => {
      const map: Record<string, number> = {};
      for (const t of res) {
        map[t.symbol] = t.change24h;
        map[t.binancePair] = t.change24h;
        map[t.baseAsset] = t.change24h;
      }
      setTickerChanges((prev) => ({ ...prev, ...map }));
    });

    const interval = setInterval(() => {
      getBinanceTickers().then((res) => {
        const map: Record<string, number> = {};
        for (const t of res) {
          map[t.symbol] = t.change24h;
          map[t.binancePair] = t.change24h;
          map[t.baseAsset] = t.change24h;
        }
        setTickerChanges((prev) => ({ ...prev, ...map }));
      });
    }, 15000);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

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
            {/* Burger Menu Button */}
            <div className="relative shrink-0">
              <button
                ref={menuButtonRef}
                type="button"
                data-testid="watchlist-burger-btn"
                onClick={() => setShowMenu((prev) => !prev)}
                className={cn(
                  "h-8 w-8 rounded-xl border transition-all flex items-center justify-center shrink-0 shadow-sm",
                  showMenu
                    ? "bg-[#2962ff] text-white border-[#2962ff] shadow-md shadow-[#2962ff]/25"
                    : "text-neutral-300 hover:text-white bg-[#1e222d] border-[#2a2e39] hover:bg-[#252a38] hover:border-neutral-500",
                )}
                title="Configure Watchlists (Create, Rename, Delete)"
              >
                <Menu className="h-4 w-4" />
              </button>

              {/* Burger Dropdown / Popover */}
              {showMenu && (
                <div
                  ref={menuDropdownRef}
                  className="absolute left-0 top-full mt-2 w-72 bg-[#131722] border border-[#2a2e39] rounded-xl shadow-2xl z-50 p-3 flex flex-col gap-2.5 backdrop-blur-md"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-[#2a2e39] pb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-neutral-100 uppercase tracking-wide">
                        Watchlists
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#2a2e39] text-neutral-400 font-mono">
                        {watchlists.length}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setIsCreating(false);
                        setEditingId(null);
                      }}
                      className="p-1 rounded text-neutral-400 hover:text-neutral-200 hover:bg-[#2a2e39]"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Create New Watchlist Button / Input */}
                  {isCreating ? (
                    <div className="flex items-center gap-1.5 bg-[#131722] p-1.5 rounded-lg border border-[#2962ff]">
                      <input
                        autoFocus
                        placeholder="Watchlist name..."
                        value={newListName}
                        onChange={(e) => setNewListName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCreateWatchlist();
                          if (e.key === "Escape") setIsCreating(false);
                        }}
                        className="flex-1 text-xs bg-transparent text-neutral-100 outline-none px-1"
                      />
                      <button
                        type="button"
                        data-testid="save-new-watchlist-btn"
                        onClick={handleCreateWatchlist}
                        className="p-1 rounded bg-[#2962ff] text-white hover:bg-[#2962ff]/80 shrink-0"
                        title="Save Watchlist"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCreating(false)}
                        className="p-1 rounded text-neutral-400 hover:text-neutral-200 hover:bg-[#2a2e39] shrink-0"
                        title="Cancel"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      data-testid="create-watchlist-trigger"
                      onClick={() => setIsCreating(true)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-[#2962ff]/50 text-xs font-semibold text-[#2962ff] hover:bg-[#2962ff]/10 hover:border-[#2962ff] transition-all"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Create New Watchlist</span>
                    </button>
                  )}

                  {/* Watchlist Items list */}
                  <div className="flex flex-col gap-1 max-h-60 overflow-y-auto no-scrollbar py-1">
                    {watchlists.map((wl) => {
                      const isSelected =
                        activeTab === "watchlist" && wl.id === activeWatchlistId;
                      const isEditing = editingId === wl.id;

                      if (isEditing) {
                        return (
                          <div
                            key={wl.id}
                            className="flex items-center gap-1.5 bg-[#131722] p-1.5 rounded-lg border border-[#2962ff]"
                          >
                            <input
                              autoFocus
                              value={renameText}
                              onChange={(e) => setRenameText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveRename(wl.id);
                                if (e.key === "Escape") setEditingId(null);
                              }}
                              className="w-full text-xs bg-transparent text-neutral-100 outline-none px-1"
                            />
                            <button
                              type="button"
                              data-testid="save-rename-watchlist-btn"
                              onClick={() => handleSaveRename(wl.id)}
                              className="p-1 rounded bg-[#2962ff] text-white hover:bg-[#2962ff]/80 shrink-0"
                              title="Confirm rename"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="p-1 rounded text-neutral-400 hover:text-neutral-200 hover:bg-[#2a2e39] shrink-0"
                              title="Cancel"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={wl.id}
                          data-testid={`menu-watchlist-item-${wl.id}`}
                          className={cn(
                            "flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors group cursor-pointer",
                            isSelected
                              ? "bg-[#2962ff]/15 text-white border border-[#2962ff]/40"
                              : "hover:bg-[#2a2e39]/60 text-neutral-300",
                          )}
                          onClick={() => {
                            setActiveWatchlist(wl.id);
                            setActiveTab("watchlist");
                            setShowMenu(false);
                          }}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {isSelected ? (
                              <div className="w-1.5 h-1.5 rounded-full bg-[#2962ff] shrink-0" />
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-neutral-600 shrink-0" />
                            )}
                            <span className="font-semibold truncate">{wl.name}</span>
                            <span className="text-[10px] text-neutral-400 font-mono">
                              ({wl.symbols.length})
                            </span>
                          </div>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              data-testid={`rename-watchlist-${wl.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingId(wl.id);
                                setRenameText(wl.name);
                              }}
                              className="p-1 rounded hover:bg-[#2a2e39] text-neutral-400 hover:text-neutral-100"
                              title="Rename watchlist"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>

                            {watchlists.length > 1 && (
                              <button
                                type="button"
                                data-testid={`delete-watchlist-${wl.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteWatchlist(wl.id);
                                  toast.success("Watchlist", `Deleted watchlist "${wl.name}"`);
                                }}
                                className="p-1 rounded hover:bg-[#2a2e39] text-neutral-400 hover:text-[#f6465d]"
                                title="Delete watchlist"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Quick info footer */}
                  <div className="pt-2 border-t border-[#2a2e39] flex items-center justify-between text-[11px] text-neutral-400">
                    <span className="flex items-center gap-1.5">
                      <RibbonFlagIcon className="h-3 w-3 text-[#ff2604]" filled />
                      <span>Flagged items</span>
                    </span>
                    <span className="font-bold text-neutral-300">{flaggedSymbols.length}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Scrollable Track Container with Distinct Background */}
            <div className="relative flex-1 min-w-0 bg-[#1e222d] border border-[#2a2e39] rounded-xl p-1 shadow-inner overflow-hidden">
              {/* Carousel Tabs Container */}
              <div
                ref={tabsRef}
                onWheel={(e) => {
                  if (e.deltaY !== 0) {
                    e.currentTarget.scrollLeft += e.deltaY;
                  }
                }}
                className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth px-0.5 py-0.5"
              >
                {/* 1. Flagged Tab */}
                <button
                  type="button"
                  data-testid="tab-flagged"
                  onClick={() => setActiveTab("flagged")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg whitespace-nowrap flex items-center gap-1.5 text-xs transition-all shrink-0 select-none",
                    activeTab === "flagged"
                      ? "bg-[#2962ff] text-white shadow-sm font-semibold"
                      : "text-neutral-300 hover:text-white hover:bg-[#131722]/80 font-medium",
                  )}
                >
                  <RibbonFlagIcon className="h-3.5 w-3.5 text-[#ff2604]" filled />
                  <span>Flagged</span>
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full font-mono font-semibold leading-none shrink-0",
                      activeTab === "flagged"
                        ? "bg-white/20 text-white"
                        : "bg-[#131722] text-neutral-400 border border-[#2a2e39]",
                    )}
                  >
                    {flaggedSymbols.length}
                  </span>
                </button>

                {/* 2. User Watchlists Tabs */}
                {watchlists.map((wl) => {
                  const isActive = activeTab === "watchlist" && wl.id === activeWatchlistId;
                  return (
                    <button
                      key={wl.id}
                      type="button"
                      data-testid={`tab-watchlist-${wl.id}`}
                      onClick={() => {
                        setActiveWatchlist(wl.id);
                        setActiveTab("watchlist");
                      }}
                      className={cn(
                        "px-2.5 py-1 rounded-lg whitespace-nowrap flex items-center gap-1.5 text-xs transition-all shrink-0 select-none",
                        isActive
                          ? "bg-[#2962ff] text-white shadow-sm font-semibold"
                          : "text-neutral-300 hover:text-white hover:bg-[#131722]/80 font-medium",
                      )}
                      title={`${wl.name} (${wl.symbols.length} symbols)`}
                    >
                      <span>{wl.name}</span>
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded-full font-mono font-semibold leading-none shrink-0",
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-[#131722] text-neutral-400 border border-[#2a2e39]",
                        )}
                      >
                        {wl.symbols.length}
                      </span>
                    </button>
                  );
                })}

                {/* 3. "All" Tab - AT THE VERY LAST */}
                <button
                  type="button"
                  data-testid="tab-all"
                  onClick={() => setActiveTab("all")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg whitespace-nowrap flex items-center gap-1.5 text-xs transition-all shrink-0 select-none",
                    activeTab === "all"
                      ? "bg-[#2962ff] text-white shadow-sm font-semibold"
                      : "text-neutral-300 hover:text-white hover:bg-[#131722]/80 font-medium",
                  )}
                  title={`All symbols (${allItems.length})`}
                >
                  <span>All</span>
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full font-mono font-semibold leading-none shrink-0",
                      activeTab === "all"
                        ? "bg-white/20 text-white"
                        : "bg-[#131722] text-neutral-400 border border-[#2a2e39]",
                    )}
                  >
                    {allItems.length}
                  </span>
                </button>
              </div>

              {/* Edge fade cues when overflowing */}
              {canScrollRight && (
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#1e222d] to-transparent pointer-events-none rounded-r-xl" />
              )}
              {canScrollLeft && (
                <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#1e222d] to-transparent pointer-events-none rounded-l-xl" />
              )}
          </div>
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
            const isPositive = (change ?? 0) >= 0;

            const handleQuickTrade = (side: "BUY" | "SELL") => {
              if (!isFeedConnected) {
                toast.warning("No Data Feed", "Cannot trade while disconnected");
                return;
              }
              if (!accountId) {
                toast.warning("No Account", "Select an account first");
                return;
              }
              placeOrder.mutate(
                {
                  accountId,
                  symbol: s.name,
                  side,
                  type: "MARKET",
                  quantity: 0.1,
                },
                {
                  onSuccess: () => toast.success("Quick Trade", `${side} 0.1 ${s.name}`),
                  onError: (err: unknown) =>
                    toast.error("Trade Failed", (err as { message?: string })?.message || "Failed"),
                },
              );
            };

            return (
              <div
                key={s.id || s.name}
                data-watchlist-symbol={s.name}
                draggable={isDragAllowed}
                onDragStart={(e) => handleDragStart(e, s.name)}
                onDragOver={(e) => handleDragOver(e, s.name)}
                onDrop={(e) => handleDrop(e, s.name)}
                onDragEnd={handleDragEnd}
                onClick={() => onSelect(s.name)}
                className={cn(
                  "w-full flex items-center justify-between gap-1.5 pl-2.5 pr-2 py-1.5 text-xs group cursor-pointer transition-colors select-none relative",
                  isSelected ? "bg-[#1e222d]" : "hover:bg-[#181c28]",
                  draggedSymbol === s.name && "opacity-35 bg-[#181c28]",
                  dragOverSymbol === s.name && "border-t-2 border-t-[#2962ff] bg-[#2962ff]/10",
                )}
              >
                {/* Selected Active Indicator: Sleek vertical blue pill bar */}
                {isSelected && (
                  <div
                    data-testid="symbol-active-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#2962ff] rounded-r-full shadow-[0_0_8px_rgba(41,98,255,0.7)] pointer-events-none"
                  />
                )}

                {/* Left side: Grip + Red Flag + Avatar + Name */}
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  {isDragAllowed && (
                    <div
                      className="opacity-0 group-hover:opacity-40 hover:!opacity-100 cursor-grab active:cursor-grabbing text-neutral-400 shrink-0 transition-opacity"
                      title="Drag to rearrange order"
                    >
                      <GripVertical className="h-3.5 w-3.5" />
                    </div>
                  )}

                  {/* Red Ribbon Flag Button */}
                  <button
                    type="button"
                    data-testid="flag-watchlist-symbol"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFlagSymbol(s.name);
                      toast.success(
                        "Watchlist Flag",
                        isFlagged ? `Unflagged ${s.name}` : `Flagged ${s.name} (Red Flag)`,
                      );
                    }}
                    className={cn(
                      "shrink-0 p-1 rounded hover:bg-[#2a2e39] transition-colors",
                      isFlagged ? "text-[#ff2604]" : "text-neutral-500 hover:text-[#ff2604]",
                    )}
                    title={isFlagged ? `Unflag ${s.name}` : `Flag ${s.name}`}
                  >
                    <RibbonFlagIcon className="h-3.5 w-3.5" filled={isFlagged} />
                  </button>

                  <div className="w-6 h-6 rounded-full bg-[#1e222d] border border-[#2a2e39] flex items-center justify-center font-bold text-[9px] text-neutral-300 shrink-0">
                    {(baseAsset || s.name).slice(0, 3)}
                  </div>

                  <div className="text-left flex-1 min-w-0 pr-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-neutral-100 truncate">{s.name}</span>
                      {s.category && !s.displayName && (
                        <span className="text-[9px] font-semibold uppercase px-1 py-0.2 rounded bg-[#2a2e39] text-neutral-400 shrink-0">
                          {s.category}
                        </span>
                      )}
                    </div>
                    {s.displayName && s.displayName !== s.name && (
                      <div className="text-[10px] text-neutral-400 truncate">{s.displayName}</div>
                    )}
                  </div>
                </div>

                {/* Right side: Prices (Bid/Ask) / % Change / Actions / Bin Icon */}
                <div className="flex items-center gap-2 shrink-0">
                  {t ? (
                    (() => {
                      const dec =
                        s.tickSize && s.tickSize < 0.0001
                          ? 8
                          : t.bid < 0.1
                            ? 6
                            : t.bid < 10
                              ? 4
                              : 2;
                      return (
                        <div className="flex items-center gap-1">
                          <div className="text-right font-mono text-[11px] leading-tight">
                            <div className="text-[#0ecb81] font-semibold">{formatNumber(t.bid, dec)}</div>
                            <div className="text-[#f6465d] font-semibold">{formatNumber(t.ask, dec)}</div>
                          </div>
                          {oneClick && (
                            <div className="hidden group-hover:flex flex-col gap-0.5 ml-0.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickTrade("BUY");
                                }}
                                className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-[#0ecb81]/15 text-[#0ecb81] hover:bg-[#0ecb81] hover:text-white border border-[#0ecb81]/30 transition-colors"
                              >
                                B
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickTrade("SELL");
                                }}
                                className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-[#f6465d]/15 text-[#f6465d] hover:bg-[#f6465d] hover:text-white border border-[#f6465d]/30 transition-colors"
                              >
                                S
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    <span className="text-neutral-500 font-mono text-[11px]">--</span>
                  )}

                  {/* 24h % Change (after Bid & Ask, clean green/red text without solid background) */}
                  {change !== undefined ? (
                    <div
                      data-testid="symbol-change-tag"
                      className={cn(
                        "text-[11px] font-bold font-mono tracking-tight text-right min-w-[46px] shrink-0",
                        isPositive ? "text-[#0ecb81]" : "text-[#f6465d]",
                      )}
                    >
                      {isPositive ? "+" : ""}
                      {change.toFixed(2)}%
                    </div>
                  ) : (
                    <div className="text-[11px] font-mono text-neutral-500 text-right min-w-[46px] shrink-0">--</div>
                  )}

                  {/* Bin Icon: appears on hover */}
                  {(activeTab === "watchlist" || activeTab === "flagged") && (
                    <button
                      type="button"
                      data-testid="remove-watchlist-item"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (activeTab === "flagged") {
                          toggleFlagSymbol(s.name);
                          toast.success("Watchlist Flag", `Unflagged ${s.name}`);
                        } else if (activeWatchlist) {
                          removeFromWatchlist(s.name, activeWatchlist.id);
                          toast.success("Watchlist", `Removed ${s.name} from ${activeWatchlist.name}`);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-neutral-400 hover:text-[#f6465d] hover:bg-[#2a2e39] transition-all ml-1"
                      title={
                        activeTab === "flagged"
                          ? `Unflag ${s.name}`
                          : `Remove ${s.name} from ${activeWatchlist?.name || "watchlist"}`
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
          </div>
        </div>
      </div>
    </div>
  );
}

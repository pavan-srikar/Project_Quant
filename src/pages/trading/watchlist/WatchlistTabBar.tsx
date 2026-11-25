import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useTradingStore } from "../../../services/store.tsx";
import { RibbonFlagIcon } from "./RibbonFlagIcon";
import type { ActiveTab } from "./types";

export interface WatchlistTabBarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  allItemCount: number;
}

export function WatchlistTabBar({
  activeTab,
  setActiveTab,
  allItemCount,
}: WatchlistTabBarProps) {
  const watchlists = useTradingStore((s) => s.watchlists);
  const activeWatchlistId = useTradingStore((s) => s.activeWatchlistId);
  const flaggedSymbols = useTradingStore((s) => s.flaggedSymbols);
  const setActiveWatchlist = useTradingStore((s) => s.setActiveWatchlist);

  const tabsRef = useRef<HTMLDivElement>(null);
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

  return (
    <div className="relative flex-1 min-w-0 bg-[#1e222d] border border-[#2a2e39] rounded-xl p-1 shadow-inner overflow-hidden">
      {/* Carousel Tabs Container */}
      <div
        ref={tabsRef}
        onWheel={(e) => {
          if (e.deltaY !== 0) {
            e.currentTarget.scrollLeft -= e.deltaY;
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
          title={`All symbols (${allItemCount})`}
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
            {allItemCount}
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
  );
}

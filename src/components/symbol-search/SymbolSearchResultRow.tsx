import React from "react";
import { TrendingUp, TrendingDown, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BinanceSearchResult } from "../../services/demo/binance.ts";

export interface SymbolSearchResultRowProps {
  item: BinanceSearchResult;
  isSelected: boolean;
  isFocused: boolean;
  isWatchlisted: boolean;
  onSelect: () => void;
  onMouseEnter: () => void;
  onToggleWatchlist: (e: React.MouseEvent) => void;
}

export function SymbolSearchResultRow({
  item,
  isSelected,
  isFocused,
  isWatchlisted,
  onSelect,
  onMouseEnter,
  onToggleWatchlist,
}: SymbolSearchResultRowProps) {
  const isPositive = item.change24h >= 0;

  return (
    <button
      onClick={onSelect}
      onMouseEnter={onMouseEnter}
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
          onClick={onToggleWatchlist}
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
}

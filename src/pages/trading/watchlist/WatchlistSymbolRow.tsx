import React from "react";
import { GripVertical, Trash2 } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { toast } from "../../../services/toast.ts";
import { usePlaceOrder } from "../../../services/queries.ts";
import { RibbonFlagIcon } from "./RibbonFlagIcon";
import type { WatchlistSymbol, ActiveTab } from "./types";

export interface WatchlistSymbolRowProps {
  symbol: WatchlistSymbol;
  tick?: { bid: number; ask: number; timestamp: number };
  isSelected: boolean;
  isFlagged: boolean;
  change?: number;
  oneClick?: boolean;
  accountId?: string | null;
  isFeedConnected?: boolean;
  activeTab: ActiveTab;
  activeWatchlistName?: string;
  isDragAllowed: boolean;
  draggedSymbol: string | null;
  dragOverSymbol: string | null;
  onSelect: (name: string) => void;
  onToggleFlag: (name: string) => void;
  onRemove: (name: string) => void;
  onDragStart: (e: React.DragEvent, name: string) => void;
  onDragOver: (e: React.DragEvent, name: string) => void;
  onDrop: (e: React.DragEvent, name: string) => void;
  onDragEnd: () => void;
}

export function WatchlistSymbolRow({
  symbol: s,
  tick: t,
  isSelected,
  isFlagged,
  change,
  oneClick,
  accountId,
  isFeedConnected = true,
  activeTab,
  isDragAllowed,
  draggedSymbol,
  dragOverSymbol,
  onSelect,
  onToggleFlag,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: WatchlistSymbolRowProps) {
  const placeOrder = usePlaceOrder();
  const baseAsset = s.name.replace(/USD[T]?$/, "");
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
      data-watchlist-symbol={s.name}
      draggable={isDragAllowed}
      onDragStart={(e) => onDragStart(e, s.name)}
      onDragOver={(e) => onDragOver(e, s.name)}
      onDrop={(e) => onDrop(e, s.name)}
      onDragEnd={onDragEnd}
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
            onToggleFlag(s.name);
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

        {/* 24h % Change */}
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
              onRemove(s.name);
            }}
            className="opacity-0 group-hover:opacity-100 p-1 rounded text-neutral-400 hover:text-[#f6465d] hover:bg-[#2a2e39] transition-all ml-1"
            title={`Remove ${s.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

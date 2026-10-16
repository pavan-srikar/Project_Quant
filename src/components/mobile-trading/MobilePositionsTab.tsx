import { cn } from "@/lib/utils";
import { useInstrumentLabels } from "../../hooks/useInstrumentLabels.ts";
import type { MobilePosition } from "./types";

export interface MobilePositionsTabProps {
  positions: MobilePosition[];
  onClosePosition?: (positionId: string) => void;
  onCloseAllPositions?: () => void;
  closingPositionId?: string | null;
  closingAll?: boolean;
}

export function MobilePositionsTab({
  positions,
  onClosePosition,
  onCloseAllPositions,
  closingPositionId = null,
  closingAll = false,
}: MobilePositionsTabProps) {
  const { formatQty } = useInstrumentLabels();
  const totalPnl = positions.reduce((sum: number, p) => sum + (p.pnl ?? p.unrealizedPnl ?? 0), 0);

  if (positions.length === 0) {
    return (
      <div className="p-3 space-y-2 max-h-[50vh] overflow-y-auto">
        <div className="text-center py-8 text-slate-500 text-sm">No open positions</div>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2 max-h-[50vh] overflow-y-auto">
      {/* Total P&L bar */}
      <div className="flex items-center justify-between bg-slate-800/60 rounded-lg p-2.5">
        <span className="text-xs text-slate-400">
          Total P&L ({positions.length} positions)
        </span>
        <span
          className={cn(
            "font-mono font-bold text-sm",
            totalPnl >= 0 ? "text-emerald-400" : "text-red-400",
          )}
        >
          {totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}
        </span>
      </div>

      {/* Position cards */}
      {positions.map((pos) => {
        const posSymbol = pos.symbol ?? pos.symbolName ?? "";
        const posSide =
          pos.side === "LONG" ? "BUY" : pos.side === "SHORT" ? "SELL" : pos.side;
        const posPnl = pos.pnl ?? pos.unrealizedPnl ?? 0;
        return (
          <div
            key={pos.id}
            className="bg-slate-800/40 border border-slate-700 rounded-xl p-3"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded text-xs font-bold",
                    posSide === "BUY"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-red-500/20 text-red-400",
                  )}
                >
                  {posSide}
                </span>
                <span className="text-sm font-medium text-white">{posSymbol}</span>
                <span className="text-xs text-slate-500">
                  {formatQty(pos.quantity ?? 0)}
                </span>
              </div>
              <span
                className={cn(
                  "font-mono text-sm font-bold",
                  posPnl >= 0 ? "text-emerald-400" : "text-red-400",
                )}
              >
                {posPnl >= 0 ? "+" : ""}${posPnl.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-mono">
                Entry: {pos.entryPrice?.toFixed(5) ?? "—"}
              </span>
              {onClosePosition && (
                <button
                  onClick={() => onClosePosition(pos.id)}
                  disabled={closingPositionId === pos.id || closingAll}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition active:scale-95",
                    closingPositionId === pos.id
                      ? "bg-slate-700/50 text-slate-500 cursor-not-allowed"
                      : "bg-slate-700 hover:bg-red-600/40 active:bg-red-600/60 text-slate-300 hover:text-white",
                  )}
                >
                  {closingPositionId === pos.id ? "Closing…" : "Close"}
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Close all button */}
      {positions.length > 1 && onCloseAllPositions && (
        <button
          onClick={onCloseAllPositions}
          disabled={closingAll}
          className={cn(
            "w-full py-3 rounded-xl text-sm font-semibold transition active:scale-[0.98]",
            closingAll
              ? "bg-slate-700/30 text-slate-500 cursor-not-allowed"
              : "bg-red-600/20 hover:bg-red-600/30 active:bg-red-600/40 text-red-400",
          )}
        >
          {closingAll ? "Closing All…" : "Close All Positions"}
        </button>
      )}
    </div>
  );
}

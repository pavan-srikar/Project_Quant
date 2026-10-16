import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import { Shield, Target } from "lucide-react";
import type { Position } from "./types";

export interface ModifyTpSlTabProps {
  position: Position;
  tp: string;
  setTp: (val: string) => void;
  sl: string;
  setSl: (val: string) => void;
  saving: boolean;
  isFeedConnected: boolean;
  onModify: () => void;
  onSetBreakeven: () => void;
}

export function ModifyTpSlTab({
  position,
  tp,
  setTp,
  sl,
  setSl,
  saving,
  isFeedConnected,
  onModify,
  onSetBreakeven,
}: ModifyTpSlTabProps) {
  // Risk/reward calculation
  const tpVal = parseFloat(tp);
  const slVal = parseFloat(sl);
  const riskReward =
    !isNaN(tpVal) && !isNaN(slVal) && slVal !== position.entryPrice
      ? Math.abs((tpVal - position.entryPrice) / (position.entryPrice - slVal))
      : null;

  // Estimated P&L at TP/SL — use per-instrument contractSize if available.
  const contractSize = position.contractSize ?? 100000;
  const tpPnl = !isNaN(tpVal)
    ? (position.side === "LONG" ? tpVal - position.entryPrice : position.entryPrice - tpVal) *
      position.quantity *
      contractSize
    : null;
  const slPnl = !isNaN(slVal)
    ? (position.side === "LONG" ? slVal - position.entryPrice : position.entryPrice - slVal) *
      position.quantity *
      contractSize
    : null;

  return (
    <>
      {/* Take Profit */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
            <Target className="h-3.5 w-3.5 text-[#0ecb81]" /> Take Profit
          </label>
          {tpPnl !== null && (
            <span
              className={cn(
                "text-[10px] font-mono font-semibold",
                tpPnl >= 0 ? "text-[#0ecb81]" : "text-[#f6465d]",
              )}
            >
              Est: {tpPnl >= 0 ? "+" : ""}
              {formatCurrency(tpPnl)}
            </span>
          )}
        </div>
        <input
          type="number"
          value={tp}
          onChange={(e) => setTp(e.target.value)}
          placeholder={position.takeProfit ? String(position.takeProfit) : "Not set"}
          className="w-full text-sm font-mono rounded-lg bg-[#131722] border border-[#2a2e39] text-neutral-100 px-3 py-2 outline-none focus:border-[#2962ff] transition-colors"
          step="0.00001"
        />
        {tp && (
          <button
            onClick={() => setTp("")}
            className="text-[10px] text-neutral-400 hover:text-[#f6465d] mt-1 transition-colors"
          >
            Remove TP
          </button>
        )}
      </div>

      {/* Stop Loss */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
            <Shield className="h-3.5 w-3.5 text-[#f6465d]" /> Stop Loss
          </label>
          {slPnl !== null && (
            <span
              className={cn(
                "text-[10px] font-mono font-semibold",
                slPnl >= 0 ? "text-[#0ecb81]" : "text-[#f6465d]",
              )}
            >
              Est: {slPnl >= 0 ? "+" : ""}
              {formatCurrency(slPnl)}
            </span>
          )}
        </div>
        <input
          type="number"
          value={sl}
          onChange={(e) => setSl(e.target.value)}
          placeholder={position.stopLoss ? String(position.stopLoss) : "Not set"}
          className="w-full text-sm font-mono rounded-lg bg-[#131722] border border-[#2a2e39] text-neutral-100 px-3 py-2 outline-none focus:border-[#2962ff] transition-colors"
          step="0.00001"
        />
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={onSetBreakeven}
            className="text-[10px] text-neutral-400 hover:text-[#2962ff] transition-colors"
          >
            Breakeven ({formatNumber(position.entryPrice, 5)})
          </button>
          {sl && (
            <button
              onClick={() => setSl("")}
              className="text-[10px] text-neutral-400 hover:text-[#f6465d] transition-colors"
            >
              Remove SL
            </button>
          )}
        </div>
      </div>

      {/* Risk/Reward */}
      {riskReward !== null && (
        <div className="bg-[#1e222d] border border-[#2a2e39] rounded-xl p-2.5 text-center">
          <span className="text-[10px] font-bold uppercase text-neutral-400">Risk : Reward</span>
          <span
            className={cn(
              "text-sm font-mono font-bold ml-2",
              riskReward >= 2
                ? "text-[#0ecb81]"
                : riskReward >= 1
                  ? "text-neutral-100"
                  : "text-[#f6465d]",
            )}
          >
            1:{riskReward.toFixed(2)}
          </span>
        </div>
      )}

      <button
        type="button"
        className="w-full h-10 rounded-lg bg-[#2962ff] hover:bg-[#2962ff]/90 text-white font-bold text-xs shadow-lg shadow-[#2962ff]/20 transition-all disabled:opacity-50"
        onClick={onModify}
        disabled={saving || !isFeedConnected}
      >
        {saving ? "Saving..." : !isFeedConnected ? "Disconnected" : "Save Changes"}
      </button>
    </>
  );
}

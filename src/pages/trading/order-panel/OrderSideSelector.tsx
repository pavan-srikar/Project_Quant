import { TrendingDown, TrendingUp } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";

export interface OrderSideSelectorProps {
  side: "BUY" | "SELL";
  onSelectSide: (side: "BUY" | "SELL") => void;
  orderType: "MARKET" | "LIMIT" | "STOP";
  onSelectOrderType: (type: "MARKET" | "LIMIT" | "STOP") => void;
  tick?: { bid: number; ask: number; timestamp: number };
}

export function OrderSideSelector({
  side,
  onSelectSide,
  orderType,
  onSelectOrderType,
  tick,
}: OrderSideSelectorProps) {
  return (
    <>
      {/* Side Selection */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onSelectSide("BUY")}
          className={cn(
            "h-10 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold transition-all",
            side === "BUY"
              ? "bg-[#0ecb81] text-white shadow-lg shadow-[#0ecb81]/20"
              : "bg-[#1e222d] border border-[#2a2e39] text-neutral-400 hover:text-neutral-200 hover:bg-[#2a2e39]",
          )}
        >
          <TrendingUp className="h-3.5 w-3.5" />
          BUY {tick ? formatNumber(tick.ask, 5) : ""}
        </button>
        <button
          type="button"
          onClick={() => onSelectSide("SELL")}
          className={cn(
            "h-10 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold transition-all",
            side === "SELL"
              ? "bg-[#f6465d] text-white shadow-lg shadow-[#f6465d]/20"
              : "bg-[#1e222d] border border-[#2a2e39] text-neutral-400 hover:text-neutral-200 hover:bg-[#2a2e39]",
          )}
        >
          <TrendingDown className="h-3.5 w-3.5" />
          SELL {tick ? formatNumber(tick.bid, 5) : ""}
        </button>
      </div>

      {/* Order Type */}
      <div>
        <label className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
          Order Type
        </label>
        <div className="grid grid-cols-3 gap-1.5 mt-1">
          {(["MARKET", "LIMIT", "STOP"] as const).map((t) => (
            <button
              key={t}
              onClick={() => onSelectOrderType(t)}
              className={cn(
                "py-1.5 text-xs font-semibold rounded-lg border transition-colors",
                t === orderType
                  ? "bg-[#2962ff] text-white border-[#2962ff] shadow-sm"
                  : "bg-[#1e222d] border-[#2a2e39] text-neutral-400 hover:text-neutral-200 hover:bg-[#2a2e39]",
              )}
            >
              {t.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

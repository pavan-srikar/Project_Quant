import { cn } from "@/lib/utils";
import type { Position } from "./types";

export interface PartialCloseTabProps {
  position: Position;
  partialQty: string;
  setPartialQty: (val: string) => void;
  saving: boolean;
  isFeedConnected: boolean;
  onPartialClose: () => void;
  unitLabel: string;
  isFutures: boolean;
}

export function PartialCloseTab({
  position,
  partialQty,
  setPartialQty,
  saving,
  isFeedConnected,
  onPartialClose,
  unitLabel,
  isFutures,
}: PartialCloseTabProps) {
  return (
    <>
      <div>
        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
          Close Volume ({unitLabel})
        </label>
        <input
          type="number"
          value={partialQty}
          onChange={(e) => setPartialQty(e.target.value)}
          placeholder={`Max: ${position.quantity}`}
          className="w-full mt-1 text-sm font-mono rounded-lg bg-[#131722] border border-[#2a2e39] text-neutral-100 px-3 py-2 outline-none focus:border-[#2962ff] transition-colors"
          step={isFutures ? "1" : "0.01"}
          min={isFutures ? "1" : "0.01"}
          max={position.quantity}
        />
      </div>

      {/* Quick partial close buttons */}
      <div className="grid grid-cols-4 gap-1.5">
        {[25, 50, 75, 100].map((pct) => {
          const rawAmt = (position.quantity * pct) / 100;
          const amt = isFutures
            ? Math.min(position.quantity, Math.max(1, Math.round(rawAmt)))
            : rawAmt;
          return (
            <button
              key={pct}
              onClick={() => setPartialQty(isFutures ? String(amt) : amt.toFixed(2))}
              className={cn(
                "text-[10px] py-2 rounded-lg border transition-colors font-medium",
                parseFloat(partialQty) === amt
                  ? "bg-[#2962ff]/15 text-[#2962ff] border-[#2962ff]/40 font-bold"
                  : "bg-[#1e222d] border-[#2a2e39] text-neutral-400 hover:text-neutral-200 hover:bg-[#2a2e39]",
              )}
            >
              {pct}%
              <div className="text-[9px] text-neutral-500 font-mono">
                {isFutures ? amt : amt.toFixed(2)}
              </div>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="w-full h-10 rounded-lg bg-[#f6465d] hover:bg-[#f6465d]/90 text-white font-bold text-xs shadow-lg shadow-[#f6465d]/20 transition-all disabled:opacity-50"
        onClick={onPartialClose}
        disabled={saving || !partialQty || !isFeedConnected}
      >
        {saving
          ? "Closing..."
          : !isFeedConnected
            ? "Disconnected"
            : `Close ${partialQty || "?"} ${unitLabel}`}
      </button>
    </>
  );
}

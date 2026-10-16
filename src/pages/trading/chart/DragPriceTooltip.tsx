import { cn } from "../../../lib/utils.ts";
import type { DragPriceState } from "../useSlTpDrag.ts";

export interface DragPriceTooltipProps {
  dragPrice: DragPriceState | null;
  pipDigits: number;
}

export function DragPriceTooltip({ dragPrice, pipDigits }: DragPriceTooltipProps) {
  if (!dragPrice) return null;

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 z-20 pointer-events-none"
      style={{ top: dragPrice.y - 32 }}
    >
      <div
        className={cn(
          "px-2 py-1 rounded text-[11px] font-mono font-bold shadow-lg border",
          dragPrice.field === "TP"
            ? "bg-[#0ecb81]/20 text-[#0ecb81] border-[#0ecb81]/40"
            : "bg-[#f6465d]/20 text-[#f6465d] border-[#f6465d]/40",
        )}
      >
        {dragPrice.field} → {dragPrice.price.toFixed(pipDigits)}
        <span
          className={dragPrice.pnlUsd >= 0 ? "ml-1.5 text-[#0ecb81]" : "ml-1.5 text-[#f6465d]"}
        >
          {dragPrice.pnlUsd >= 0 ? "+" : ""}${dragPrice.pnlUsd.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

import { formatNumber } from "../../../lib/utils.ts";
import { getPipDigits } from "../utils.ts";
import type { ToolbarSymbolInfo, ToolbarTick } from "./types.ts";

export interface LivePriceBadgeProps {
  tick?: ToolbarTick;
  symbolInfo?: ToolbarSymbolInfo;
  selectedSymbol: string;
}

export function LivePriceBadge({
  tick,
  symbolInfo,
  selectedSymbol,
}: LivePriceBadgeProps) {
  if (!tick) return null;

  const dec =
    symbolInfo?.tickSize && symbolInfo.tickSize < 0.0001
      ? 8
      : tick.bid < 0.1
        ? 6
        : tick.bid < 10
          ? 4
          : 2;

  // Spread in pips/points: (ask - bid) * 10 ** pipDigits.
  const spread = (
    (tick.ask - tick.bid) *
    10 ** getPipDigits(symbolInfo, selectedSymbol)
  ).toFixed(1);

  return (
    <div className="flex items-center gap-1 md:gap-1.5 px-1.5 md:px-2 border-l border-r border-[#2a2e39] shrink-0">
      <span className="inline-flex items-center gap-1 px-1 md:px-1.5 py-0.5 rounded bg-[#0ecb81]/15 text-[#0ecb81] font-mono font-bold text-[12px] md:text-[13px] tabular-nums tracking-tight">
        {formatNumber(tick.bid, dec)}
      </span>
      <span className="text-neutral-500 text-[10px] font-medium">/</span>
      <span className="inline-flex items-center gap-1 px-1 md:px-1.5 py-0.5 rounded bg-[#f6465d]/15 text-[#f6465d] font-mono font-bold text-[12px] md:text-[13px] tabular-nums tracking-tight">
        {formatNumber(tick.ask, dec)}
      </span>
      <span className="text-neutral-400 text-[10px] font-medium ml-0.5 hidden md:inline">
        Sprd: {spread}
      </span>
    </div>
  );
}

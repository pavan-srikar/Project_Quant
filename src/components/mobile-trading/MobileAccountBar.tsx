import { cn } from "@/lib/utils";

/**
 * Mobile-optimized account summary strip shown at top of trading page.
 */
export function MobileAccountBar({
  balance,
  equity,
  margin,
  pnl,
}: {
  balance: number;
  equity: number;
  margin: number;
  pnl: number;
}) {
  return (
    <div className="md:hidden flex items-center gap-2 px-2 py-1 bg-slate-800/80 border-b border-slate-700 overflow-x-auto no-scrollbar">
      <div className="shrink-0">
        <div className="text-[9px] text-slate-500 uppercase">Bal</div>
        <div className="text-[11px] font-mono font-bold text-white">
          ${balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </div>
      </div>
      <div className="w-px h-5 bg-slate-700 shrink-0" />
      <div className="shrink-0">
        <div className="text-[9px] text-slate-500 uppercase">Equity</div>
        <div className="text-[11px] font-mono font-bold text-white">
          ${equity.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </div>
      </div>
      <div className="w-px h-5 bg-slate-700 shrink-0" />
      <div className="shrink-0">
        <div className="text-[9px] text-slate-500 uppercase">Margin</div>
        <div className="text-[11px] font-mono font-bold text-slate-300">
          ${margin.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </div>
      </div>
      <div className="w-px h-5 bg-slate-700 shrink-0" />
      <div className="shrink-0">
        <div className="text-[9px] text-slate-500 uppercase">P&L</div>
        <div
          className={cn(
            "text-[11px] font-mono font-bold",
            pnl >= 0 ? "text-emerald-400" : "text-red-400",
          )}
        >
          {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
        </div>
      </div>
    </div>
  );
}

import { cn } from "@/lib/utils";

/**
 * Touch-friendly symbol selector with larger tap targets.
 */
export function MobileSymbolSelector({
  symbols,
  selected,
  onSelect,
}: {
  symbols: Array<{ symbol: string; bid?: number; ask?: number; change?: number }>;
  selected: string;
  onSelect: (symbol: string) => void;
}) {
  return (
    <div className="md:hidden overflow-x-auto no-scrollbar">
      <div className="flex gap-1.5 px-2 py-2">
        {symbols.map((s) => (
          <button
            key={s.symbol}
            onClick={() => onSelect(s.symbol)}
            className={cn(
              "shrink-0 px-3 py-2 rounded-xl text-xs transition active:scale-95",
              selected === s.symbol
                ? "bg-violet-600 text-white ring-1 ring-violet-400"
                : "bg-slate-800 text-slate-300 border border-slate-700",
            )}
          >
            <div className="font-semibold">{s.symbol}</div>
            <div className="font-mono mt-0.5 text-[10px] opacity-75">
              {s.bid != null ? s.bid.toFixed(s.bid > 10 ? 2 : 5) : "—"}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

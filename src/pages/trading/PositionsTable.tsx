import { useState } from "react";
import { X, Scissors } from "lucide-react";
import { formatNumber, formatCurrency, formatDate, cn } from "../../lib/utils.ts";

interface PositionRow {
  id: string;
  symbolName: string;
  side: "LONG" | "SHORT" | string;
  quantity: number;
  entryPrice: number;
  currentPrice?: number | null;
  unrealizedPnl: number;
  stopLoss?: number | null;
  takeProfit?: number | null;
  openedAt: string | Date;
}

export function PositionsTable({
  positions,
  onClose,
  onModify,
  onPartialClose,
  onSelectSymbol,
}: {
  positions: PositionRow[];
  onClose: (id: string) => void;
  onModify?: (p: PositionRow) => void;
  onPartialClose?: (id: string, quantity: number) => void;
  onSelectSymbol?: (symbolName: string) => void;
}) {
  const [partialCloseId, setPartialCloseId] = useState<string | null>(null);
  const [partialQty, setPartialQty] = useState("");

  if (positions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
        No open positions
      </div>
    );
  }

  const handlePartialSubmit = (positionId: string, maxQty: number) => {
    const qty = parseFloat(partialQty);
    if (!qty || qty <= 0 || qty >= maxQty) return;
    onPartialClose?.(positionId, qty);
    setPartialCloseId(null);
    setPartialQty("");
  };

  return (
    <table className="w-full text-xs">
      <thead className="sticky top-0 bg-[#1e222d] border-b border-[#2a2e39] z-10">
        <tr>
          <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Symbol</th>
          <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Side</th>
          <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Qty</th>
          <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Entry</th>
          <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Current</th>
          <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">P&L</th>
          <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">SL</th>
          <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">TP</th>
          <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Time</th>
          <th className="py-2.5 px-3"></th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[#1e222d]">
        {positions.map((p) => (
          <tr
            key={p.id}
            className={cn(
              "hover:bg-[#1e222d]/60 transition-colors",
              onSelectSymbol ? "cursor-pointer" : undefined,
            )}
            onClick={() => onSelectSymbol?.(p.symbolName)}
            onKeyDown={(e) => {
              if (!onSelectSymbol) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectSymbol(p.symbolName);
              }
            }}
            tabIndex={onSelectSymbol ? 0 : undefined}
          >
            <td className="font-bold text-neutral-100 py-2 px-3">{p.symbolName}</td>
            <td className="py-2 px-3">
              <span
                className={cn(
                  "font-bold text-[10px] px-2 py-0.5 rounded",
                  p.side === "LONG"
                    ? "bg-[#3179f5]/15 text-[#3179f5] border border-[#3179f5]/30"
                    : "bg-[#ec407a]/15 text-[#ec407a] border border-[#ec407a]/30",
                )}
              >
                {p.side}
              </span>
            </td>
            <td className="font-mono text-neutral-200 py-2 px-3">{p.quantity}</td>
            <td className="font-mono text-neutral-200 py-2 px-3">{formatNumber(p.entryPrice, 5)}</td>
            <td className="font-mono text-neutral-200 py-2 px-3">{p.currentPrice ? formatNumber(p.currentPrice, 5) : "--"}</td>
            <td
              className={cn(
                "font-mono font-bold py-2 px-3",
                p.unrealizedPnl >= 0 ? "text-[#0ecb81]" : "text-[#f6465d]",
              )}
            >
              {p.unrealizedPnl >= 0 ? "+" : ""}
              {formatCurrency(p.unrealizedPnl)}
            </td>
            <td className="font-mono text-[#f6465d] py-2 px-3">
              {p.stopLoss ? formatNumber(p.stopLoss, 5) : "--"}
            </td>
            <td className="font-mono text-[#0ecb81] py-2 px-3">
              {p.takeProfit ? formatNumber(p.takeProfit, 5) : "--"}
            </td>
            <td className="text-neutral-400 font-mono text-[11px] py-2 px-3">{formatDate(p.openedAt)}</td>
            <td className="py-2 px-3">
              {partialCloseId === p.id ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={partialQty}
                    onChange={(e) => setPartialQty(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder={`Max ${p.quantity}`}
                    min={0.01}
                    max={p.quantity - 0.01}
                    step="any"
                    className="w-16 h-6 text-xs rounded-md border border-[#2a2e39] bg-[#131722] text-neutral-100 px-1.5 font-mono outline-none focus:border-[#2962ff]"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handlePartialSubmit(p.id, p.quantity);
                      if (e.key === "Escape") {
                        setPartialCloseId(null);
                        setPartialQty("");
                      }
                    }}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePartialSubmit(p.id, p.quantity);
                    }}
                    className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-400/20 text-amber-400 hover:bg-amber-400 hover:text-black transition-colors"
                  >
                    Go
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPartialCloseId(null);
                      setPartialQty("");
                    }}
                    className="p-1 rounded text-neutral-400 hover:text-neutral-200 hover:bg-[#2a2e39] transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-1.5 justify-end">
                  {onModify && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onModify(p);
                      }}
                      className="px-2 py-0.5 text-[10px] font-semibold rounded bg-[#2962ff]/15 text-[#2962ff] hover:bg-[#2962ff] hover:text-white border border-[#2962ff]/30 transition-colors"
                    >
                      Modify
                    </button>
                  )}
                  {onPartialClose && p.quantity > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPartialCloseId(p.id);
                        setPartialQty("");
                      }}
                      className="px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-400/15 text-amber-400 hover:bg-amber-400 hover:text-black border border-amber-400/30 transition-colors flex items-center gap-1"
                      title="Partial Close"
                    >
                      <Scissors className="h-3 w-3" /> Partial
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose(p.id);
                    }}
                    className="px-2 py-0.5 text-[10px] font-semibold rounded bg-[#f6465d]/15 text-[#f6465d] hover:bg-[#f6465d] hover:text-white border border-[#f6465d]/30 transition-colors"
                  >
                    Close
                  </button>
                </div>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

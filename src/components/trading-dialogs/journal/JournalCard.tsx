import { cn, formatCurrency, formatNumber, formatDate } from "@/lib/utils";
import { Pencil, Trash2 } from "lucide-react";
import type { JournalEntry } from "./types";

interface JournalCardProps {
  entry: JournalEntry;
  onEdit: (entry: JournalEntry) => void;
  onDelete: (id: string) => void;
}

export function JournalCard({ entry, onEdit, onDelete }: JournalCardProps) {
  return (
    <div className="px-4 py-3 hover:bg-[#1e222d]/50 group text-xs transition-colors">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          {entry.symbolName && <span className="font-bold text-white text-sm">{entry.symbolName}</span>}
          {entry.side && (
            <span
              className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded",
                entry.side === "BUY" ? "text-[#0ecb81] bg-[#0ecb81]/15" : "text-[#f6465d] bg-[#f6465d]/15",
              )}
            >
              {entry.side}
            </span>
          )}
          {entry.pnl != null && (
            <span
              className={cn(
                "font-mono text-xs font-semibold px-1.5 py-0.5 rounded",
                entry.pnl >= 0 ? "text-[#0ecb81] bg-[#0ecb81]/10" : "text-[#f6465d] bg-[#f6465d]/10",
              )}
            >
              {entry.pnl >= 0 ? "+" : ""}
              {formatCurrency(entry.pnl)}
            </span>
          )}
          {entry.emotion && (
            <span className="px-1.5 py-0.5 rounded bg-[#2962ff]/15 text-[#2962ff] text-[10px] font-medium">
              {entry.emotion}
            </span>
          )}
          {entry.rating != null && entry.rating > 0 && (
            <span className="text-yellow-400 text-xs">
              {"★".repeat(entry.rating)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(entry)}
            className="p-1 rounded hover:bg-[#2a2e39] text-neutral-400 hover:text-white transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onDelete(entry.id)}
            className="p-1 rounded hover:bg-[#f6465d]/20 text-neutral-400 hover:text-[#f6465d] transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {entry.tags.length > 0 && (
        <div className="flex gap-1.5 mb-1.5">
          {entry.tags.map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 rounded bg-[#1e222d] border border-[#2a2e39] text-[10px] text-neutral-400"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
      {entry.notes && (
        <p className="text-xs text-neutral-300 leading-relaxed my-1">{entry.notes}</p>
      )}
      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-neutral-500 font-mono">
        {entry.entryPrice != null && (
          <span>
            Entry: <strong className="text-neutral-300 font-mono">{formatNumber(entry.entryPrice, 5)}</strong>
          </span>
        )}
        {entry.exitPrice != null && (
          <span>
            Exit: <strong className="text-neutral-300 font-mono">{formatNumber(entry.exitPrice, 5)}</strong>
          </span>
        )}
        <span className="text-neutral-500">{formatDate(entry.createdAt)}</span>
      </div>
    </div>
  );
}

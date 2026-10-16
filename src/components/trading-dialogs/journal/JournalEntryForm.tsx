import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { EMOTIONS } from "./types";

interface JournalEntryFormProps {
  editingId: string | null;
  symbolName: string;
  setSymbolName: (v: string) => void;
  side: "BUY" | "SELL";
  setSide: (v: "BUY" | "SELL") => void;
  entryPrice: string;
  setEntryPrice: (v: string) => void;
  exitPrice: string;
  setExitPrice: (v: string) => void;
  pnl: string;
  setPnl: (v: string) => void;
  emotion: string;
  setEmotion: (v: string) => void;
  rating: number;
  setRating: (v: number) => void;
  tags: string;
  setTags: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function JournalEntryForm({
  editingId,
  symbolName,
  setSymbolName,
  side,
  setSide,
  entryPrice,
  setEntryPrice,
  exitPrice,
  setExitPrice,
  pnl,
  setPnl,
  emotion,
  setEmotion,
  rating,
  setRating,
  tags,
  setTags,
  notes,
  setNotes,
  onSubmit,
  onCancel,
}: JournalEntryFormProps) {
  return (
    <div className="px-4 py-3 border-b border-[#2a2e39] bg-[#1e222d]/60 space-y-2.5 text-xs">
      {!editingId && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="text-[11px] font-medium text-neutral-400">Symbol</label>
              <input
                value={symbolName}
                onChange={(e) => setSymbolName(e.target.value)}
                className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-[#2a2e39] bg-[#131722] text-xs text-white focus:outline-none focus:border-[#2962ff] uppercase"
                placeholder="e.g. BTCUSDT"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-neutral-400">Side</label>
              <select
                value={side}
                onChange={(e) => setSide(e.target.value as "BUY" | "SELL")}
                className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-[#2a2e39] bg-[#131722] text-xs text-white focus:outline-none focus:border-[#2962ff]"
              >
                <option value="BUY">BUY</option>
                <option value="SELL">SELL</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[11px] font-medium text-neutral-400">Entry</label>
              <input
                type="number"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-[#2a2e39] bg-[#131722] text-xs font-mono text-white focus:outline-none focus:border-[#2962ff]"
                step="0.00001"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-neutral-400">Exit</label>
              <input
                type="number"
                value={exitPrice}
                onChange={(e) => setExitPrice(e.target.value)}
                className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-[#2a2e39] bg-[#131722] text-xs font-mono text-white focus:outline-none focus:border-[#2962ff]"
                step="0.00001"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-neutral-400">P&L</label>
              <input
                type="number"
                value={pnl}
                onChange={(e) => setPnl(e.target.value)}
                className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-[#2a2e39] bg-[#131722] text-xs font-mono text-white focus:outline-none focus:border-[#2962ff]"
              />
            </div>
          </div>
        </>
      )}
      <div>
        <label className="text-[11px] font-medium text-neutral-400">Emotion</label>
        <div className="flex gap-1.5 flex-wrap mt-1">
          {EMOTIONS.map((em) => (
            <button
              key={em}
              onClick={() => setEmotion(emotion === em ? "" : em)}
              className={cn(
                "px-2 py-0.5 rounded-md text-[11px] border font-medium transition-colors",
                emotion === em
                  ? "bg-[#2962ff] text-white border-[#2962ff]"
                  : "bg-[#131722] text-neutral-400 border-[#2a2e39] hover:text-white hover:border-neutral-500",
              )}
            >
              {em}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-[11px] font-medium text-neutral-400">Rating</label>
        <div className="flex gap-1 mt-1">
          {[1, 2, 3, 4, 5].map((r) => (
            <button
              key={r}
              onClick={() => setRating(rating === r ? 0 : r)}
              className={cn(
                "text-sm p-0.5",
                r <= rating ? "text-yellow-400" : "text-neutral-600 hover:text-neutral-400",
              )}
            >
              <Star className="h-4 w-4" fill={r <= rating ? "currentColor" : "none"} />
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-[11px] font-medium text-neutral-400">Tags (comma-separated)</label>
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-[#2a2e39] bg-[#131722] text-xs text-white focus:outline-none focus:border-[#2962ff]"
          placeholder="e.g. breakout, trend, fomo"
        />
      </div>
      <div>
        <label className="text-[11px] font-medium text-neutral-400">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-[#2a2e39] bg-[#131722] text-xs text-white focus:outline-none focus:border-[#2962ff] min-h-[60px] resize-y"
          placeholder="What happened? What did you learn?"
        />
      </div>
      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs rounded-lg border-[#2a2e39] bg-transparent text-neutral-300 hover:bg-[#2a2e39] hover:text-white"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          className="h-7 text-xs rounded-lg bg-[#2962ff] hover:bg-[#2962ff]/80 text-white font-semibold"
          onClick={onSubmit}
        >
          {editingId ? "Update Entry" : "Save Entry"}
        </Button>
      </div>
    </div>
  );
}

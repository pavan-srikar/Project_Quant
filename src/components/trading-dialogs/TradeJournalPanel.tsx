import { useState } from "react";
import { cn, formatCurrency, formatNumber, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { BookOpen, Star, Pencil, Trash2, Plus } from "lucide-react";

const EMOTIONS = [
  "Calm",
  "Confident",
  "Anxious",
  "Greedy",
  "Fearful",
  "FOMO",
  "Revenge",
  "Bored",
] as const;

interface JournalEntry {
  id: string;
  accountId: string;
  positionId?: string | null;
  symbolName?: string | null;
  side?: string | null;
  entryPrice?: number | null;
  exitPrice?: number | null;
  pnl?: number | null;
  emotion?: string | null;
  rating?: number | null;
  tags: string[];
  notes: string;
  createdAt: string;
}

interface TradeJournalPanelProps {
  entries: JournalEntry[];
  isLoading: boolean;
  accountId: string | null;
  onCreateEntry: (data: Partial<JournalEntry> & { notes: string; tags: string[] }) => void;
  onUpdateEntry: (
    id: string,
    data: Partial<JournalEntry> & { notes: string; tags: string[] },
  ) => void;
  onDeleteEntry: (id: string) => void;
}

export function TradeJournalPanel({
  entries,
  isLoading,
  accountId,
  onCreateEntry,
  onUpdateEntry,
  onDeleteEntry,
}: TradeJournalPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [symbolName, setSymbolName] = useState("");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [entryPrice, setEntryPrice] = useState("");
  const [exitPrice, setExitPrice] = useState("");
  const [pnl, setPnl] = useState("");
  const [emotion, setEmotion] = useState("");
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setSymbolName("");
    setSide("BUY");
    setEntryPrice("");
    setExitPrice("");
    setPnl("");
    setEmotion("");
    setRating(0);
    setTags("");
    setNotes("");
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (entry: JournalEntry) => {
    setEditingId(entry.id);
    setSymbolName(entry.symbolName || "");
    setSide((entry.side as "BUY" | "SELL") || "BUY");
    setEntryPrice(entry.entryPrice != null ? String(entry.entryPrice) : "");
    setExitPrice(entry.exitPrice != null ? String(entry.exitPrice) : "");
    setPnl(entry.pnl != null ? String(entry.pnl) : "");
    setEmotion(entry.emotion || "");
    setRating(entry.rating || 0);
    setTags(entry.tags.join(", "));
    setNotes(entry.notes);
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!accountId) return;
    const data: Partial<JournalEntry> & { notes: string; tags: string[] } = {
      notes,
      emotion: emotion || undefined,
      rating: rating || undefined,
      tags: tags
        ? tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
    };

    if (editingId) {
      onUpdateEntry(editingId, data);
    } else {
      data.accountId = accountId;
      data.symbolName = symbolName || undefined;
      data.side = side;
      data.entryPrice = entryPrice ? parseFloat(entryPrice) : undefined;
      data.exitPrice = exitPrice ? parseFloat(exitPrice) : undefined;
      data.pnl = pnl ? parseFloat(pnl) : undefined;
      onCreateEntry(data);
    }
    resetForm();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
        Loading journal...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#131722]">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#2a2e39] bg-[#1e222d]">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-300 flex items-center gap-2">
          <BookOpen className="h-3.5 w-3.5 text-[#2962ff]" />
          Trade Journal
        </h3>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#2962ff]/15 text-[#2962ff] hover:bg-[#2962ff]/25 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> New Entry
        </button>
      </div>

      {showForm && (
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
            <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg border-[#2a2e39] bg-transparent text-neutral-300 hover:bg-[#2a2e39] hover:text-white" onClick={resetForm}>
              Cancel
            </Button>
            <Button size="sm" className="h-7 text-xs rounded-lg bg-[#2962ff] hover:bg-[#2962ff]/80 text-white font-semibold" onClick={handleSubmit}>
              {editingId ? "Update Entry" : "Save Entry"}
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-neutral-500 text-xs gap-2 py-8">
            <BookOpen className="h-8 w-8 opacity-40" />
            <span className="font-medium">No journal entries yet</span>
            <span className="text-[11px] text-neutral-600">Click "New Entry" to record your first trade</span>
          </div>
        ) : (
          <div className="divide-y divide-[#2a2e39]/40">
            {entries.map((entry) => (
              <div key={entry.id} className="px-4 py-3 hover:bg-[#1e222d]/50 group text-xs transition-colors">
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
                      onClick={() => startEdit(entry)}
                      className="p-1 rounded hover:bg-[#2a2e39] text-neutral-400 hover:text-white transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteEntry(entry.id)}
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
                    <span>Entry: <strong className="text-neutral-300 font-mono">{formatNumber(entry.entryPrice, 5)}</strong></span>
                  )}
                  {entry.exitPrice != null && <span>Exit: <strong className="text-neutral-300 font-mono">{formatNumber(entry.exitPrice, 5)}</strong></span>}
                  <span className="text-neutral-500">{formatDate(entry.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { BookOpen, Plus } from "lucide-react";
import type { JournalEntry, TradeJournalPanelProps } from "./types";
import { JournalEntryForm } from "./JournalEntryForm";
import { JournalCard } from "./JournalCard";

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
        <JournalEntryForm
          editingId={editingId}
          symbolName={symbolName}
          setSymbolName={setSymbolName}
          side={side}
          setSide={setSide}
          entryPrice={entryPrice}
          setEntryPrice={setEntryPrice}
          exitPrice={exitPrice}
          setExitPrice={setExitPrice}
          pnl={pnl}
          setPnl={setPnl}
          emotion={emotion}
          setEmotion={setEmotion}
          rating={rating}
          setRating={setRating}
          tags={tags}
          setTags={setTags}
          notes={notes}
          setNotes={setNotes}
          onSubmit={handleSubmit}
          onCancel={resetForm}
        />
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
              <JournalCard
                key={entry.id}
                entry={entry}
                onEdit={startEdit}
                onDelete={onDeleteEntry}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

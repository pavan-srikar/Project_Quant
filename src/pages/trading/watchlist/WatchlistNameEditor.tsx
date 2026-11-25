import { Check, X } from "lucide-react";

export interface WatchlistNameEditorProps {
  value: string;
  placeholder?: string;
  saveTestId: string;
  saveTitle: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

/** Shared inline text editor for creating or renaming a watchlist. */
export function WatchlistNameEditor({
  value,
  placeholder,
  saveTestId,
  saveTitle,
  onChange,
  onSave,
  onCancel,
}: WatchlistNameEditorProps) {
  return (
    <div className="flex items-center gap-1.5 bg-[#181c28] p-1.5 rounded-xl border border-[#4c7eff]">
      <input
        autoFocus
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave();
          if (e.key === "Escape") onCancel();
        }}
        className="w-full flex-1 text-xs bg-transparent text-neutral-100 placeholder:text-neutral-500 outline-none px-1.5"
      />
      <button
        type="button"
        data-testid={saveTestId}
        onClick={onSave}
        className="p-1 rounded-lg bg-[#2962ff] text-white hover:bg-[#346dff] shrink-0"
        title={saveTitle}
      >
        <Check className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="p-1 rounded-lg text-neutral-300 hover:text-white hover:bg-[#2f364a] shrink-0"
        title="Cancel"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

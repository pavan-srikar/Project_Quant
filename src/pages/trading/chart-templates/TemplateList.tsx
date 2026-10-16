import React, { useState } from "react";
import { Check, CloudUpload, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChartTemplate } from "../../../services/api/chart-templates.ts";

export function MenuRow({
  icon,
  label,
  disabled = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-foreground hover:bg-secondary disabled:opacity-40 disabled:hover:bg-transparent"
    >
      <span className="flex h-3.5 w-3.5 items-center justify-center text-muted-foreground">
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}

export function AutosaveRow({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5">
      <div className="flex items-center gap-2 text-xs text-foreground">
        <CloudUpload className="h-3.5 w-3.5 text-muted-foreground" />
        Autosave
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={onToggle}
        className={cn(
          "inline-flex h-4 w-8 shrink-0 cursor-pointer items-center rounded-full border-0 p-0 transition-colors",
          enabled ? "bg-primary" : "bg-secondary",
        )}
      >
        <span
          className={cn(
            "inline-block h-3 w-3 rounded-full bg-white shadow transition-transform",
            enabled ? "translate-x-[18px]" : "translate-x-[2px]",
          )}
        />
      </button>
    </div>
  );
}

export function AddTemplateRow({ onAdd }: { onAdd: (name: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  if (!adding) {
    return (
      <MenuRow
        icon={<Plus className="h-3.5 w-3.5" />}
        label="Add template"
        onClick={() => setAdding(true)}
      />
    );
  }
  const commit = () => {
    const trimmed = name.trim();
    if (trimmed) onAdd(trimmed);
    setAdding(false);
    setName("");
  };
  return (
    <div className="px-3 py-1.5">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setAdding(false);
        }}
        onBlur={commit}
        placeholder="Template name…"
        className="w-full rounded border border-border bg-transparent px-2 py-1 text-xs text-foreground outline-none focus:border-primary"
      />
    </div>
  );
}

export function TemplateList({
  templates,
  activeName,
  manageMode,
  onApply,
  onDelete,
}: {
  templates: ChartTemplate[];
  activeName: string;
  manageMode: boolean;
  onApply: (t: ChartTemplate) => void;
  onDelete: (t: ChartTemplate) => void;
}) {
  if (templates.length === 0) {
    return <div className="px-3 py-2 text-[11px] text-muted-foreground">No templates yet</div>;
  }
  return (
    <>
      {templates.map((t) => (
        <div key={t.id} className="group flex items-center">
          <button
            onClick={() => onApply(t)}
            className="flex min-w-0 flex-1 items-center gap-2 px-3 py-1.5 text-left text-xs text-foreground hover:bg-secondary"
          >
            <span className="flex h-3.5 w-3.5 items-center justify-center text-primary">
              {t.name === activeName && <Check className="h-3.5 w-3.5" />}
            </span>
            <span className="truncate">{t.name}</span>
          </button>
          {manageMode && (
            <button
              onClick={() => onDelete(t)}
              title={`Delete "${t.name}"`}
              className="px-2 text-red-400/70 hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}
    </>
  );
}

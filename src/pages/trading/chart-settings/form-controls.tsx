import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  // In-flow flex knob with explicit p-0/border-0 — relying on absolute
  // positioning let the browser's default button padding push the knob off
  // the track, which is what made these render misaligned.
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-0 p-0 transition-colors",
        checked ? "bg-[#2962ff]" : "bg-[#2a2e39]",
      )}
    >
      <span
        className={cn(
          "inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-[19px]" : "translate-x-[3px]",
        )}
      />
    </button>
  );
}

export function ToggleRow({
  label,
  hint,
  checked,
  disabled = false,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 py-2 border-b border-[#2a2e39]/30 last:border-0 cursor-pointer select-none",
        disabled && "opacity-40 pointer-events-none",
      )}
      onClick={() => !disabled && onChange(!checked)}
    >
      <div className="min-w-0">
        <div className="text-xs font-medium text-neutral-200">{label}</div>
        {hint && <div className="text-[11px] text-neutral-400">{hint}</div>}
      </div>
      <Switch checked={checked} onChange={disabled ? () => undefined : onChange} />
    </div>
  );
}

export function ColorSwatch({
  value,
  fallback,
  onChange,
}: {
  value: string;
  fallback: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="color"
      value={value || fallback}
      onChange={(e) => onChange(e.target.value)}
      className="h-6 w-8 cursor-pointer rounded border border-[#2a2e39] bg-transparent p-0"
    />
  );
}

export function ColorRow({
  label,
  value,
  fallback,
  onChange,
}: {
  label: string;
  /** Stored override; empty string means "theme default". */
  value: string;
  fallback: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-[#2a2e39]/30 last:border-0">
      <div className="text-xs font-medium text-neutral-200">{label}</div>
      <div className="flex items-center gap-2">
        <ColorSwatch value={value} fallback={fallback} onChange={onChange} />
        {value && (
          <button
            onClick={() => onChange("")}
            className="text-[10px] text-neutral-400 hover:text-white transition-colors"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

/** Two swatches on one row (e.g. long/short, up/down). */
export function ColorPairRow({
  label,
  a,
  b,
}: {
  label: string;
  a: { value: string; fallback: string; onChange: (v: string) => void };
  b: { value: string; fallback: string; onChange: (v: string) => void };
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-[#2a2e39]/30 last:border-0">
      <div className="text-xs font-medium text-neutral-200">{label}</div>
      <div className="flex items-center gap-1.5">
        <ColorSwatch {...a} />
        <ColorSwatch {...b} />
      </div>
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="mb-1.5 mt-3.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 first:mt-0">
      {children}
    </div>
  );
}

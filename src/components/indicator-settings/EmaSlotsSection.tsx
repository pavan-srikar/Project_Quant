import React from "react";
import type { IndicatorSettings, EmaSlotConfig } from "../../hooks/useIndicatorSettings.ts";
import { ColorPicker } from "../color-picker/ColorPicker";

export interface EmaSlotsSectionProps {
  draft: IndicatorSettings;
  setDraft: React.Dispatch<React.SetStateAction<IndicatorSettings>>;
}

const DEFAULT_SLOTS: EmaSlotConfig[] = [
  { enabled: true, period: 20, color: "#e377c2" },
  { enabled: false, period: 50, color: "#2962ff" },
  { enabled: false, period: 100, color: "#ff9800" },
  { enabled: false, period: 200, color: "#00bcd4" },
  { enabled: false, period: 9, color: "#9c27b0" },
];

export function EmaSlotsSection({ draft, setDraft }: EmaSlotsSectionProps) {
  const slots = draft.emaSlots && draft.emaSlots.length === 5 ? draft.emaSlots : DEFAULT_SLOTS;

  const updateSlot = (idx: number, patch: Partial<EmaSlotConfig>) => {
    const next = [...slots];
    next[idx] = { ...slots[idx]!, ...patch };
    setDraft((d) => ({
      ...d,
      emaSlots: next,
      period: idx === 0 && patch.period !== undefined ? patch.period : d.period,
      color: idx === 0 && patch.color !== undefined ? patch.color : d.color,
    }));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-400 px-1">
        <span>Exponential Moving Averages</span>
        <span className="text-[10px] text-neutral-500">Up to 5 EMAs</span>
      </div>
      <div className="space-y-2 bg-[#131722] p-2.5 rounded-xl border border-[#2a2e39]">
        {slots.map((slot, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 justify-between py-1 border-b border-[#2a2e39]/50 last:border-0"
          >
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={slot.enabled}
                onChange={(e) => updateSlot(idx, { enabled: e.target.checked })}
                className="rounded bg-[#1e222d] border-[#2a2e39] text-[#2962ff] focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer"
              />
              <span className={`text-xs font-medium ${slot.enabled ? "text-white" : "text-neutral-500"}`}>
                EMA {idx + 1}
              </span>
            </label>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-neutral-400">Length</span>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={slot.period}
                  disabled={!slot.enabled}
                  onChange={(e) =>
                    updateSlot(idx, { period: Math.max(1, parseInt(e.target.value, 10) || 1) })
                  }
                  className="w-16 px-2 py-1 rounded bg-[#1e222d] border border-[#2a2e39] text-white font-mono text-xs focus:outline-none focus:border-[#2962ff] disabled:opacity-40"
                />
              </div>
              <div className="flex items-center">
                <ColorPicker
                  compact
                  value={slot.color}
                  label={`EMA ${idx + 1} Color`}
                  onChange={(val) => updateSlot(idx, { color: val })}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

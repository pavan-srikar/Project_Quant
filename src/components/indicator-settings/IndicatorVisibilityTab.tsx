import React from "react";
import type { IndicatorSettings } from "../../hooks/useIndicatorSettings.ts";

export interface IndicatorVisibilityTabProps {
  draft: IndicatorSettings;
  setDraft: React.Dispatch<React.SetStateAction<IndicatorSettings>>;
}

const TIMEFRAMES = [
  { id: "seconds", label: "Seconds", range: "1 — 59" },
  { id: "minutes", label: "Minutes", range: "1 — 59" },
  { id: "hours", label: "Hours", range: "1 — 24" },
  { id: "days", label: "Days", range: "1 — 365" },
  { id: "weeks", label: "Weeks", range: "1 — 52" },
  { id: "months", label: "Months", range: "1 — 12" },
];

export function IndicatorVisibilityTab({
  draft,
  setDraft,
}: IndicatorVisibilityTabProps) {
  const vis = draft.visibilityTimeframes || {};

  const handleToggle = (id: string, checked: boolean) => {
    setDraft((d) => ({
      ...d,
      visibilityTimeframes: {
        ...(d.visibilityTimeframes || {}),
        [id]: checked,
      },
    }));
  };

  return (
    <div className="space-y-4 text-xs select-none">
      <div className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase border-b border-[#2a2e39]/60 pb-1.5">
        TIMEFRAME VISIBILITY
      </div>
      <div className="space-y-3">
        {TIMEFRAMES.map((tf) => {
          const isChecked = vis[tf.id] !== false;
          return (
            <div key={tf.id} className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => handleToggle(tf.id, e.target.checked)}
                  className="w-4 h-4 rounded bg-[#131722] border border-[#2a2e39] text-[#2962ff] focus:ring-0 cursor-pointer"
                />
                <span className="text-neutral-200 font-medium">{tf.label}</span>
              </label>
              <span className="text-neutral-500 font-mono text-[11px]">{tf.range}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IndicatorType } from "../../lib/indicators.ts";
import type { IndicatorSettings } from "../../hooks/useIndicatorSettings.ts";
import { COLOR_PALETTE } from "./types";

export interface IndicatorStyleTabProps {
  type: IndicatorType;
  draft: IndicatorSettings;
  setDraft: React.Dispatch<React.SetStateAction<IndicatorSettings>>;
}

export function IndicatorStyleTab({ type, draft, setDraft }: IndicatorStyleTabProps) {
  return (
    <div className="space-y-4">
      {/* Primary Line Color */}
      <div>
        <label className="text-neutral-300 font-medium block mb-2">
          {type === "MACD" ? "MACD Line Color" : type === "STOCH" ? "%K Line Color" : "Main Line Color"}
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {COLOR_PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setDraft((d) => ({ ...d, color: c }))}
              className="w-6 h-6 rounded-full border border-black/40 flex items-center justify-center transition-transform hover:scale-110"
              style={{ backgroundColor: c }}
            >
              {draft.color?.toLowerCase() === c.toLowerCase() && (
                <Check className="w-3.5 h-3.5 text-white drop-shadow" />
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={draft.color || "#2962ff"}
            onChange={(e) => setDraft((d) => ({ ...d, color: e.target.value }))}
            className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0"
          />
          <input
            type="text"
            value={draft.color || ""}
            onChange={(e) => setDraft((d) => ({ ...d, color: e.target.value }))}
            className="w-28 px-2.5 py-1 rounded bg-[#131722] border border-[#2a2e39] text-white font-mono text-xs"
            placeholder="#2962ff"
          />
        </div>
      </div>

      {/* MACD / STOCH Signal Line Color */}
      {(type === "MACD" || type === "STOCH") && (
        <div className="pt-2 border-t border-[#2a2e39]/60">
          <label className="text-neutral-300 font-medium block mb-2">
            {type === "MACD" ? "Signal Line Color" : "%D Line Color"}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={draft.signalColor || "#ff6d00"}
              onChange={(e) => setDraft((d) => ({ ...d, signalColor: e.target.value }))}
              className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0"
            />
            <input
              type="text"
              value={draft.signalColor || ""}
              onChange={(e) => setDraft((d) => ({ ...d, signalColor: e.target.value }))}
              className="w-28 px-2.5 py-1 rounded bg-[#131722] border border-[#2a2e39] text-white font-mono text-xs"
              placeholder="#ff6d00"
            />
          </div>
        </div>
      )}

      {/* Line Thickness */}
      <div className="pt-2 border-t border-[#2a2e39]/60">
        <label className="text-neutral-300 font-medium block mb-2">Line Thickness</label>
        <div className="flex items-center gap-2">
          {[1, 1.5, 2, 3].map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setDraft((d) => ({ ...d, lineWidth: w }))}
              className={cn(
                "px-3 py-1.5 rounded-lg border text-xs font-mono font-medium transition-colors",
                (draft.lineWidth ?? 1.5) === w
                  ? "bg-[#2962ff]/20 text-[#2962ff] border-[#2962ff]"
                  : "bg-[#131722] text-neutral-400 border-[#2a2e39] hover:text-white",
              )}
            >
              {w}px
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

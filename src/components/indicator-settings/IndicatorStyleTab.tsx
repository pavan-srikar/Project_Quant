import React from "react";
import { cn } from "@/lib/utils";
import type { IndicatorType } from "../../lib/indicators.ts";
import type { IndicatorSettings } from "../../hooks/useIndicatorSettings.ts";
import { ColorPicker } from "../color-picker/ColorPicker";

export interface IndicatorStyleTabProps {
  type: IndicatorType;
  draft: IndicatorSettings;
  setDraft: React.Dispatch<React.SetStateAction<IndicatorSettings>>;
}

export function IndicatorStyleTab({ type, draft, setDraft }: IndicatorStyleTabProps) {
  // 1. Volume Indicator: Bullish & Bearish Colors with Opacity
  if (type === "VOL") {
    return (
      <div className="space-y-4">
        <ColorPicker
          label="Bullish / Up Volume Color"
          value={draft.histUpColor || draft.color || "#26a69a"}
          onChange={(val) => setDraft((d) => ({ ...d, histUpColor: val, color: val }))}
        />
        <div className="pt-3 border-t border-[#2a2e39]/60">
          <ColorPicker
            label="Bearish / Down Volume Color"
            value={draft.histDownColor || "#ef5350"}
            onChange={(val) => setDraft((d) => ({ ...d, histDownColor: val }))}
          />
        </div>
      </div>
    );
  }

  // 2. EMA Indicator: Colors for up to 5 slots with Opacity
  if (type === "EMA" && draft.emaSlots && draft.emaSlots.length > 0) {
    const slots = draft.emaSlots;
    return (
      <div className="space-y-4">
        <div>
          <label className="text-neutral-300 font-medium block mb-2 text-xs">EMA Colors & Opacity</label>
          <div className="space-y-2 bg-[#131722] p-2.5 rounded-xl border border-[#2a2e39]">
            {slots.map((slot, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-1 border-b border-[#2a2e39]/50 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: slot.color, opacity: slot.enabled ? 1 : 0.4 }}
                  />
                  <span className={`text-xs font-medium ${slot.enabled ? "text-white" : "text-neutral-500"}`}>
                    EMA {idx + 1} ({slot.period})
                  </span>
                  {!slot.enabled && (
                    <span className="text-[10px] text-neutral-500 italic">(Disabled)</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <ColorPicker
                    compact
                    value={slot.color}
                    label={`EMA ${idx + 1} Color`}
                    onChange={(val) => {
                      const next = [...slots];
                      next[idx] = { ...slot, color: val };
                      setDraft((d) => ({
                        ...d,
                        emaSlots: next,
                        color: idx === 0 ? val : d.color,
                      }));
                    }}
                  />
                  <span className="font-mono text-[11px] text-neutral-400 w-24 truncate">{slot.color}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Line Thickness */}
        <div className="pt-2 border-t border-[#2a2e39]/60">
          <label className="text-neutral-300 font-medium block mb-2 text-xs">Line Thickness</label>
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

  // 3. General Indicators (RSI, MACD, STOCH, BOLL, SMA, etc.)
  return (
    <div className="space-y-4">
      {/* Primary Line Color with Opacity */}
      <ColorPicker
        label={type === "MACD" ? "MACD Line Color" : type === "STOCH" ? "%K Line Color" : "Main Line Color"}
        value={draft.color || "#2962ff"}
        onChange={(val) => setDraft((d) => ({ ...d, color: val }))}
      />

      {/* MACD / STOCH Signal Line Color */}
      {(type === "MACD" || type === "STOCH") && (
        <div className="pt-3 border-t border-[#2a2e39]/60">
          <ColorPicker
            label={type === "MACD" ? "Signal Line Color" : "%D Line Color"}
            value={draft.signalColor || "#ff6d00"}
            onChange={(val) => setDraft((d) => ({ ...d, signalColor: val }))}
          />
        </div>
      )}

      {/* Bollinger Bands Upper / Lower Lines */}
      {type === "BOLL" && (
        <>
          <div className="pt-3 border-t border-[#2a2e39]/60">
            <ColorPicker
              label="Upper Band Color"
              value={draft.upperColor || "rgba(41, 98, 255, 0.5)"}
              onChange={(val) => setDraft((d) => ({ ...d, upperColor: val }))}
            />
          </div>
          <div className="pt-3 border-t border-[#2a2e39]/60">
            <ColorPicker
              label="Lower Band Color"
              value={draft.lowerColor || "rgba(41, 98, 255, 0.5)"}
              onChange={(val) => setDraft((d) => ({ ...d, lowerColor: val }))}
            />
          </div>
        </>
      )}

      {/* Line Thickness */}
      <div className="pt-2 border-t border-[#2a2e39]/60">
        <label className="text-neutral-300 font-medium block mb-2 text-xs">Line Thickness</label>
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

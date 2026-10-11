import { useState, useEffect } from "react";
import { X, RotateCcw, Sliders, Palette, Check } from "lucide-react";
import {
  INDICATOR_REGISTRY,
  type IndicatorType,
} from "../lib/indicators.ts";
import {
  type IndicatorSettings,
  DEFAULT_INDICATOR_SETTINGS,
} from "../hooks/useIndicatorSettings.ts";
import { cn } from "../lib/utils.ts";

export interface IndicatorSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: IndicatorType | null;
  settings: IndicatorSettings;
  onSave: (type: IndicatorType, updates: Partial<IndicatorSettings>) => void;
  onReset: (type: IndicatorType) => void;
}

const COLOR_PALETTE = [
  "#2962ff", // TV Blue
  "#7e57c2", // Purple
  "#26a69a", // Mint Green
  "#00bcd4", // Cyan
  "#f0b90b", // Yellow / Gold
  "#ff9800", // Amber
  "#ff7043", // Orange
  "#ef5350", // Red
  "#e91e63", // Magenta
  "#d1d4dc", // Silver
];

export function IndicatorSettingsModal({
  isOpen,
  onClose,
  type,
  settings,
  onSave,
  onReset,
}: IndicatorSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"inputs" | "style">("inputs");

  // Local draft state
  const [draft, setDraft] = useState<IndicatorSettings>(settings);

  useEffect(() => {
    if (isOpen) {
      setDraft(settings);
      setActiveTab("inputs");
    }
  }, [isOpen, settings, type]);

  if (!isOpen || !type) return null;

  const registry = INDICATOR_REGISTRY.find((r) => r.type === type);
  const title = registry ? `${registry.label} (${type})` : type;

  const handleApply = () => {
    onSave(type, draft);
    onClose();
  };

  const handleReset = () => {
    const defaultVal = DEFAULT_INDICATOR_SETTINGS[type];
    if (defaultVal) {
      setDraft({ ...defaultVal });
      onReset(type);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-md rounded-2xl bg-[#1e222d] border border-[#2a2e39] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2e39] bg-[#1a1e29]">
          <div className="flex items-center gap-2.5">
            <span
              className="w-3 h-3 rounded-full shrink-0 shadow-sm"
              style={{ backgroundColor: draft.color || registry?.color || "#2962ff" }}
            />
            <h3 className="text-sm font-bold text-neutral-100">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 px-5 pt-3 pb-2 border-b border-[#2a2e39]/60 bg-[#161a25]">
          <button
            type="button"
            onClick={() => setActiveTab("inputs")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
              activeTab === "inputs"
                ? "bg-[#2962ff] text-white shadow-sm"
                : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40",
            )}
          >
            <Sliders className="w-3.5 h-3.5" />
            Inputs
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("style")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
              activeTab === "style"
                ? "bg-[#2962ff] text-white shadow-sm"
                : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40",
            )}
          >
            <Palette className="w-3.5 h-3.5" />
            Style
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {activeTab === "inputs" && (
            <div className="space-y-4">
              {/* RSI Inputs */}
              {type === "RSI" && (
                <>
                  <div className="flex items-center justify-between">
                    <label className="text-neutral-300 font-medium">Period / Length</label>
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={draft.period ?? 14}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, period: Math.max(1, parseInt(e.target.value, 10) || 1) }))
                      }
                      className="w-24 px-2.5 py-1.5 rounded-lg bg-[#131722] border border-[#2a2e39] text-white font-mono text-xs focus:outline-none focus:border-[#2962ff]"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-neutral-300 font-medium">Overbought Level</label>
                    <input
                      type="number"
                      min={50}
                      max={100}
                      value={draft.overbought ?? 70}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, overbought: parseInt(e.target.value, 10) || 70 }))
                      }
                      className="w-24 px-2.5 py-1.5 rounded-lg bg-[#131722] border border-[#2a2e39] text-white font-mono text-xs focus:outline-none focus:border-[#2962ff]"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-neutral-300 font-medium">Oversold Level</label>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={draft.oversold ?? 30}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, oversold: parseInt(e.target.value, 10) || 30 }))
                      }
                      className="w-24 px-2.5 py-1.5 rounded-lg bg-[#131722] border border-[#2a2e39] text-white font-mono text-xs focus:outline-none focus:border-[#2962ff]"
                    />
                  </div>
                </>
              )}

              {/* MACD Inputs */}
              {type === "MACD" && (
                <>
                  <div className="flex items-center justify-between">
                    <label className="text-neutral-300 font-medium">Fast Length</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={draft.fast ?? 12}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, fast: Math.max(1, parseInt(e.target.value, 10) || 1) }))
                      }
                      className="w-24 px-2.5 py-1.5 rounded-lg bg-[#131722] border border-[#2a2e39] text-white font-mono text-xs focus:outline-none focus:border-[#2962ff]"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-neutral-300 font-medium">Slow Length</label>
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={draft.slow ?? 26}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, slow: Math.max(1, parseInt(e.target.value, 10) || 1) }))
                      }
                      className="w-24 px-2.5 py-1.5 rounded-lg bg-[#131722] border border-[#2a2e39] text-white font-mono text-xs focus:outline-none focus:border-[#2962ff]"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-neutral-300 font-medium">Signal Smoothing</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={draft.signal ?? 9}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, signal: Math.max(1, parseInt(e.target.value, 10) || 1) }))
                      }
                      className="w-24 px-2.5 py-1.5 rounded-lg bg-[#131722] border border-[#2a2e39] text-white font-mono text-xs focus:outline-none focus:border-[#2962ff]"
                    />
                  </div>
                </>
              )}

              {/* SMA, EMA, ATR, CCI, WR Inputs */}
              {(type === "SMA" || type === "EMA" || type === "ATR" || type === "CCI" || type === "WR") && (
                <div className="flex items-center justify-between">
                  <label className="text-neutral-300 font-medium">Period / Length</label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={draft.period ?? (type === "ATR" || type === "WR" ? 14 : 20)}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, period: Math.max(1, parseInt(e.target.value, 10) || 1) }))
                    }
                    className="w-24 px-2.5 py-1.5 rounded-lg bg-[#131722] border border-[#2a2e39] text-white font-mono text-xs focus:outline-none focus:border-[#2962ff]"
                  />
                </div>
              )}

              {/* Bollinger Bands Inputs */}
              {type === "BOLL" && (
                <>
                  <div className="flex items-center justify-between">
                    <label className="text-neutral-300 font-medium">Period / Length</label>
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={draft.period ?? 20}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, period: Math.max(1, parseInt(e.target.value, 10) || 1) }))
                      }
                      className="w-24 px-2.5 py-1.5 rounded-lg bg-[#131722] border border-[#2a2e39] text-white font-mono text-xs focus:outline-none focus:border-[#2962ff]"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-neutral-300 font-medium">StdDev Multiplier</label>
                    <input
                      type="number"
                      step={0.1}
                      min={0.5}
                      max={5}
                      value={draft.stdDev ?? 2}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, stdDev: parseFloat(e.target.value) || 2 }))
                      }
                      className="w-24 px-2.5 py-1.5 rounded-lg bg-[#131722] border border-[#2a2e39] text-white font-mono text-xs focus:outline-none focus:border-[#2962ff]"
                    />
                  </div>
                </>
              )}

              {/* Stochastic Inputs */}
              {type === "STOCH" && (
                <>
                  <div className="flex items-center justify-between">
                    <label className="text-neutral-300 font-medium">%K Period</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={draft.kPeriod ?? 14}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, kPeriod: Math.max(1, parseInt(e.target.value, 10) || 1) }))
                      }
                      className="w-24 px-2.5 py-1.5 rounded-lg bg-[#131722] border border-[#2a2e39] text-white font-mono text-xs focus:outline-none focus:border-[#2962ff]"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-neutral-300 font-medium">%D Smoothing</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={draft.dPeriod ?? 3}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, dPeriod: Math.max(1, parseInt(e.target.value, 10) || 1) }))
                      }
                      className="w-24 px-2.5 py-1.5 rounded-lg bg-[#131722] border border-[#2a2e39] text-white font-mono text-xs focus:outline-none focus:border-[#2962ff]"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-neutral-300 font-medium">Overbought Level</label>
                    <input
                      type="number"
                      min={50}
                      max={100}
                      value={draft.overbought ?? 80}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, overbought: parseInt(e.target.value, 10) || 80 }))
                      }
                      className="w-24 px-2.5 py-1.5 rounded-lg bg-[#131722] border border-[#2a2e39] text-white font-mono text-xs focus:outline-none focus:border-[#2962ff]"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-neutral-300 font-medium">Oversold Level</label>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={draft.oversold ?? 20}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, oversold: parseInt(e.target.value, 10) || 20 }))
                      }
                      className="w-24 px-2.5 py-1.5 rounded-lg bg-[#131722] border border-[#2a2e39] text-white font-mono text-xs focus:outline-none focus:border-[#2962ff]"
                    />
                  </div>
                </>
              )}

              {/* VWAP Inputs */}
              {type === "VWAP" && (
                <div className="p-3 rounded-lg bg-[#131722] text-neutral-400 leading-relaxed">
                  Volume Weighted Average Price is dynamically calculated based on continuous intraday price and volume distributions.
                </div>
              )}
            </div>
          )}

          {activeTab === "style" && (
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
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#2a2e39] bg-[#1a1e29]">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Defaults
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-neutral-300 hover:bg-neutral-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#2962ff] hover:bg-[#1e54e4] text-white shadow transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import React from "react";
import type { IndicatorType } from "../../lib/indicators.ts";
import type { IndicatorSettings } from "../../hooks/useIndicatorSettings.ts";

export interface IndicatorInputsTabProps {
  type: IndicatorType;
  draft: IndicatorSettings;
  setDraft: React.Dispatch<React.SetStateAction<IndicatorSettings>>;
}

export function IndicatorInputsTab({ type, draft, setDraft }: IndicatorInputsTabProps) {
  return (
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

      {/* Volume Inputs */}
      {type === "VOL" && (
        <div className="p-3 rounded-lg bg-[#131722] text-neutral-400 leading-relaxed">
          Displays real-time and historical bar trading volume as color-coded histograms at the bottom of the chart.
        </div>
      )}

      {/* Pine Script Inputs */}
      {type.startsWith("pine_") && (
        <div className="p-3 rounded-lg bg-[#131722] text-neutral-400 leading-relaxed">
          Custom Pine Script indicator. Inputs and parameters are evaluated directly from the script definition.
        </div>
      )}
    </div>
  );
}

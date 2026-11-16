import React from "react";
import type { IndicatorType } from "../../lib/indicators.ts";
import type { IndicatorSettings } from "../../hooks/useIndicatorSettings.ts";
import { EmaSlotsSection } from "./EmaSlotsSection";
import { PineScriptInputsSection } from "./PineScriptInputsSection";
import { NumberStepper } from "./NumberStepper";

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
            <NumberStepper
              value={draft.period ?? 14}
              min={1}
              max={200}
              step={1}
              onChange={(val) => setDraft((d) => ({ ...d, period: val }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-neutral-300 font-medium">Overbought Level</label>
            <NumberStepper
              value={draft.overbought ?? 70}
              min={50}
              max={100}
              step={1}
              onChange={(val) => setDraft((d) => ({ ...d, overbought: val }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-neutral-300 font-medium">Oversold Level</label>
            <NumberStepper
              value={draft.oversold ?? 30}
              min={0}
              max={50}
              step={1}
              onChange={(val) => setDraft((d) => ({ ...d, oversold: val }))}
            />
          </div>
        </>
      )}

      {/* MACD Inputs */}
      {type === "MACD" && (
        <>
          <div className="flex items-center justify-between">
            <label className="text-neutral-300 font-medium">Fast Length</label>
            <NumberStepper
              value={draft.fast ?? 12}
              min={1}
              max={100}
              step={1}
              onChange={(val) => setDraft((d) => ({ ...d, fast: val }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-neutral-300 font-medium">Slow Length</label>
            <NumberStepper
              value={draft.slow ?? 26}
              min={1}
              max={200}
              step={1}
              onChange={(val) => setDraft((d) => ({ ...d, slow: val }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-neutral-300 font-medium">Signal Smoothing</label>
            <NumberStepper
              value={draft.signal ?? 9}
              min={1}
              max={50}
              step={1}
              onChange={(val) => setDraft((d) => ({ ...d, signal: val }))}
            />
          </div>
        </>
      )}

      {/* EMA Multiple Inputs (up to 5) */}
      {type === "EMA" && <EmaSlotsSection draft={draft} setDraft={setDraft} />}

      {/* SMA, ATR, CCI, WR Inputs */}
      {(type === "SMA" || type === "ATR" || type === "CCI" || type === "WR") && (
        <div className="flex items-center justify-between">
          <label className="text-neutral-300 font-medium">Period / Length</label>
          <NumberStepper
            value={draft.period ?? (type === "ATR" || type === "WR" ? 14 : 20)}
            min={1}
            max={500}
            step={1}
            onChange={(val) => setDraft((d) => ({ ...d, period: val }))}
          />
        </div>
      )}

      {/* Bollinger Bands Inputs */}
      {type === "BOLL" && (
        <>
          <div className="flex items-center justify-between">
            <label className="text-neutral-300 font-medium">Period / Length</label>
            <NumberStepper
              value={draft.period ?? 20}
              min={1}
              max={200}
              step={1}
              onChange={(val) => setDraft((d) => ({ ...d, period: val }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-neutral-300 font-medium">StdDev Multiplier</label>
            <NumberStepper
              value={draft.stdDev ?? 2}
              min={0.5}
              max={5}
              step={0.1}
              onChange={(val) => setDraft((d) => ({ ...d, stdDev: val }))}
            />
          </div>
        </>
      )}

      {/* Stochastic Inputs */}
      {type === "STOCH" && (
        <>
          <div className="flex items-center justify-between">
            <label className="text-neutral-300 font-medium">%K Period</label>
            <NumberStepper
              value={draft.kPeriod ?? 14}
              min={1}
              max={100}
              step={1}
              onChange={(val) => setDraft((d) => ({ ...d, kPeriod: val }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-neutral-300 font-medium">%D Smoothing</label>
            <NumberStepper
              value={draft.dPeriod ?? 3}
              min={1}
              max={50}
              step={1}
              onChange={(val) => setDraft((d) => ({ ...d, dPeriod: val }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-neutral-300 font-medium">Overbought Level</label>
            <NumberStepper
              value={draft.overbought ?? 80}
              min={50}
              max={100}
              step={1}
              onChange={(val) => setDraft((d) => ({ ...d, overbought: val }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-neutral-300 font-medium">Oversold Level</label>
            <NumberStepper
              value={draft.oversold ?? 20}
              min={0}
              max={50}
              step={1}
              onChange={(val) => setDraft((d) => ({ ...d, oversold: val }))}
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
        <PineScriptInputsSection type={type} draft={draft} setDraft={setDraft} />
      )}
    </div>
  );
}

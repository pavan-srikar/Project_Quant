import { useCallback, useRef } from "react";
import {
  updateChartPreferences,
  useChartPreferences,
} from "../../../hooks/useChartPreferences.ts";
import { sampleColor } from "../../../lib/chart-plugins/heatmap/heatmap-renderer.ts";
import type {
  HeatmapColorMap,
  SensitivityPreset,
} from "../../../lib/chart-plugins/heatmap/heatmap-types.ts";

const HIST_HEIGHTS = [
  30, 24, 20, 22, 19, 16, 18, 14, 11, 9, 8, 7, 6, 5, 5, 5, 4, 4, 4, 4,
  4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4,
];

export function HeatmapSettingsTab() {
  const prefs = useChartPreferences();
  const colorMap = (prefs.heatmapColorMap as HeatmapColorMap) || "viridis";
  const currentRatio = prefs.heatmapThresholdRatio ?? 0.49064;
  const currentCeil = prefs.heatmapCeilingRatio ?? 1.0;
  const currentSensitivity = prefs.heatmapSensitivity || "medium";
  const containerRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef<"threshold" | "ceiling" | null>(null);

  const handlePointer = useCallback(
    (clientX: number) => {
      const el = containerRef.current;
      if (!el || !draggingRef.current) return;
      const rect = el.getBoundingClientRect();
      const raw = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const val = Number(raw.toFixed(3));

      if (draggingRef.current === "threshold") {
        const nextThresh = Math.min(currentCeil - 0.02, val);
        let preset: SensitivityPreset = "medium";
        if (nextThresh <= 0.1) preset = "high";
        else if (nextThresh >= 0.75) preset = "low";
        updateChartPreferences({ heatmapThresholdRatio: Math.max(0, nextThresh), heatmapSensitivity: preset });
      } else {
        const nextCeil = Math.max(currentRatio + 0.02, val);
        updateChartPreferences({ heatmapCeilingRatio: Math.min(1.0, nextCeil) });
      }
    },
    [currentRatio, currentCeil],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const raw = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const dThresh = Math.abs(raw - currentRatio);
    const dCeil = Math.abs(raw - currentCeil);
    draggingRef.current = dThresh <= dCeil ? "threshold" : "ceiling";

    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    handlePointer(e.clientX);

    const onPointerMove = (evt: PointerEvent) => handlePointer(evt.clientX);
    const onPointerUp = () => {
      draggingRef.current = null;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const applyPreset = (preset: SensitivityPreset) => {
    const ratio = preset === "high" ? 0.0 : preset === "low" ? 0.85419 : 0.49064;
    updateChartPreferences({
      heatmapSensitivity: preset,
      heatmapThresholdRatio: ratio,
      heatmapCeilingRatio: 1.0,
    });
  };

  const handleReset = () => {
    applyPreset("medium");
  };

  const thresholdDisplay = (() => {
    if (currentRatio <= 0.001) return "0";
    if (Math.abs(currentRatio - 0.49064) < 0.004) return "2153.9";
    if (Math.abs(currentRatio - 0.85419) < 0.004) return "3749.890";
    return (currentRatio * 4390).toFixed(1);
  })();

  const ceilingDisplay = (() => {
    if (currentCeil >= 0.999) return "4390";
    return (currentCeil * 4390).toFixed(1);
  })();

  return (
    <div className="space-y-4 text-xs">
      {/* 1. Heatmap Colors Palette Picker */}
      <div className="space-y-1.5">
        <label className="font-medium text-neutral-300 block">Heatmap colors</label>
        <div className="flex gap-2">
          {(
            [
              { id: "viridis", colors: ["#201936", "#2b5c77", "#529994", "#9ecba9", "#eaf3c3"] },
              { id: "plasma", colors: ["#0d0887", "#6a00a8", "#b12a90", "#e16462", "#fca636"] },
              { id: "inferno", colors: ["#000004", "#57106e", "#bb3754", "#f98e09", "#fcffa4"] },
            ] as const
          ).map((m) => {
            const isSelected = colorMap === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => updateChartPreferences({ heatmapColorMap: m.id })}
                className={`p-1 rounded border transition-colors ${
                  isSelected
                    ? "border-[#2962ff] bg-[#2962ff]/15 ring-1 ring-[#2962ff]"
                    : "border-[#2a2e39] bg-[#141720] hover:border-neutral-500"
                }`}
              >
                <div className="flex h-4 w-12 rounded-xs overflow-hidden">
                  {m.colors.map((c, i) => (
                    <div key={i} className="flex-1" style={{ backgroundColor: c }} />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. CoinGlass Sensitivity Dual-Handle Histogram Slider */}
      <div className="space-y-2 bg-[#141720] p-3 rounded border border-[#2a2e39]">
        <div className="flex justify-between items-center">
          <label className="font-medium text-neutral-200">Sensitivity</label>
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-white transition-colors"
          >
            <span>⟲</span> Reset
          </button>
        </div>

        {/* Histogram Track */}
        <div
          ref={containerRef}
          onPointerDown={onPointerDown}
          className="relative h-9 w-full flex items-end justify-between cursor-ew-resize select-none pt-1"
        >
          {HIST_HEIGHTS.map((h, i) => {
            const barRatio = i / (HIST_HEIGHTS.length - 1);
            const c = sampleColor(colorMap, barRatio);
            const isBelowThresh = barRatio < currentRatio;
            const isAboveCeil = barRatio >= currentCeil;
            return (
              <div
                key={i}
                className="w-[3px] rounded-t-xs transition-opacity"
                style={{
                  height: `${h}px`,
                  backgroundColor: `rgb(${c.r}, ${c.g}, ${c.b})`,
                  opacity: isBelowThresh ? 0.25 : isAboveCeil ? 1.0 : 0.85,
                }}
              />
            );
          })}

          {/* Left Handle (Threshold Slider) */}
          <div
            className="absolute top-0 bottom-0 w-[2.5px] bg-white rounded-full shadow-[0_0_5px_rgba(255,255,255,0.9)] pointer-events-none"
            style={{ left: `${currentRatio * 100}%` }}
          />

          {/* Right Handle (Ceiling Slider) */}
          <div
            className="absolute top-0 bottom-0 w-[2.5px] bg-white rounded-full shadow-[0_0_5px_rgba(255,255,255,0.9)] pointer-events-none"
            style={{ left: `${currentCeil * 100}%` }}
          />
        </div>

        {/* Readout Numbers */}
        <div className="relative text-[10px] text-neutral-400 font-mono h-4">
          {currentRatio > 0.08 && <span className="absolute left-0">0</span>}
          <span
            className="absolute -translate-x-1/2 text-white font-semibold"
            style={{ left: `${Math.max(6, Math.min(94, currentRatio * 100))}%` }}
          >
            {thresholdDisplay}
          </span>
          <span
            className="absolute -translate-x-1/2 text-white font-semibold"
            style={{ left: `${Math.max(6, Math.min(94, currentCeil * 100))}%` }}
          >
            {ceilingDisplay}
          </span>
          {currentCeil < 0.92 && <span className="absolute right-0">4390</span>}
        </div>

        {/* CoinGlass Explanatory Notes */}
        <div className="text-[10px] text-neutral-400 leading-tight space-y-0.5 pt-1 border-t border-[#222634]">
          <p>Bar height counts heatmap points by relative intensity; 4390 is the scale maximum</p>
          <p>Below threshold: hidden; at or above ceiling: brightest</p>
        </div>

        {/* Presets: High, Medium, Low */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {(["high", "medium", "low"] as const).map((preset) => {
            const isSelected = currentSensitivity === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`py-1.5 px-2 rounded border text-center font-medium capitalize transition-colors ${
                  isSelected
                    ? "bg-[#2962ff]/20 border-[#2962ff] text-white font-semibold"
                    : "bg-[#1e222d] border-[#2a2e39] text-neutral-300 hover:text-white hover:bg-[#252a37]"
                }`}
              >
                {preset}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Merge Y Ticks */}
      <div className="flex items-center justify-between p-2.5 bg-[#141720] rounded border border-[#2a2e39]">
        <div>
          <label className="font-medium text-neutral-200 block">Merge Y ticks</label>
          <span className="text-[10px] text-neutral-400 block">
            Sum every N adjacent price rows; 1 keeps the original resolution
          </span>
        </div>
        <div className="w-12 text-center py-1 px-2 bg-[#1e222d] border border-[#2a2e39] rounded text-neutral-200 font-mono text-xs">
          1
        </div>
      </div>
    </div>
  );
}

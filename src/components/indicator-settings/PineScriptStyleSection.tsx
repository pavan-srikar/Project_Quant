import React, { useMemo } from "react";
import type { IndicatorType } from "../../lib/indicators.ts";
import type { IndicatorSettings } from "../../hooks/useIndicatorSettings.ts";
import { getCustomPineIndicators, parsePineScript } from "../../lib/pinescript";
import { useColorPickerContext } from "../color-picker/ColorPickerContext";
import { cn } from "@/lib/utils";

export interface PineScriptStyleSectionProps {
  type: IndicatorType;
  draft: IndicatorSettings;
  setDraft: React.Dispatch<React.SetStateAction<IndicatorSettings>>;
}

function TvCheckbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer text-xs select-none group">
      <span
        onClick={(e) => {
          e.preventDefault();
          onChange(!checked);
        }}
        className={cn(
          "w-4 h-4 rounded-[3px] border flex items-center justify-center transition-colors shrink-0",
          checked
            ? "bg-[#2962ff] border-[#2962ff] text-white"
            : "bg-[#131722] border-[#434651] group-hover:border-[#787b86]",
        )}
      >
        {checked && (
          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2}>
            <polyline points="2.5 6 4.5 8.5 9.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className="text-[#d1d4dc] font-medium group-hover:text-white transition-colors truncate">
        {label}
      </span>
    </label>
  );
}

export function PineScriptStyleSection({
  type,
  draft,
  setDraft,
}: PineScriptStyleSectionProps) {
  const colorContext = useColorPickerContext();

  const customScript = useMemo(() => {
    return getCustomPineIndicators().find((c) => c.id === type);
  }, [type]);

  const parsed = useMemo(() => {
    if (!customScript?.code) return null;
    return parsePineScript(customScript.code);
  }, [customScript?.code]);

  const plots = useMemo(() => {
    return parsed?.plots.filter((p) => !p.displayNone) || [];
  }, [parsed]);

  const hasPolylines = parsed?.hasForecastPolyline || false;
  const hasBoxes = parsed?.hasBoxesOrLines || false;
  const hasLines = parsed?.hasBoxesOrLines || false;

  const handlePlotToggle = (plotKey: string, checked: boolean) => {
    setDraft((d) => ({
      ...d,
      plotVisibility: {
        ...(d.plotVisibility || {}),
        [plotKey]: checked,
      },
    }));
  };

  const handlePlotColorChange = (plotKey: string, color: string) => {
    setDraft((d) => ({
      ...d,
      plotColors: {
        ...(d.plotColors || {}),
        [plotKey]: color,
      },
    }));
  };

  const handlePlotWidthCycle = (plotKey: string, currentWidth: number) => {
    const widths = [1, 1.5, 2, 3];
    const nextIdx = (widths.indexOf(currentWidth) + 1) % widths.length;
    const nextWidth = widths[nextIdx] ?? 1.5;
    setDraft((d) => ({
      ...d,
      plotLineWidths: {
        ...(d.plotLineWidths || {}),
        [plotKey]: nextWidth,
      },
    }));
  };

  const handlePlotStyleCycle = (plotKey: string, currentStyle: string) => {
    const styles: Array<"solid" | "dashed" | "dotted"> = ["solid", "dashed", "dotted"];
    const nextIdx = (styles.indexOf(currentStyle as any) + 1) % styles.length;
    const nextStyle = styles[nextIdx] ?? "solid";
    setDraft((d) => ({
      ...d,
      plotStyles: {
        ...(d.plotStyles || {}),
        [plotKey]: nextStyle,
      },
    }));
  };

  return (
    <div className="space-y-6 select-none text-xs">
      {/* 1. Plots Section */}
      {plots.length > 0 && (
        <div className="space-y-3">
          {plots.map((p, idx) => {
            const plotKey = p.title || `plot_${idx}`;
            const isVisible = draft.plotVisibility?.[plotKey] ?? true;
            const isRef = p.title === "Reference Price" || /init_value/i.test(plotKey);
            const plotColor =
              draft.plotColors?.[plotKey] || (isRef ? "#787b86" : p.color || "#2962ff");
            const plotWidth = draft.plotLineWidths?.[plotKey] || (isRef ? 1 : p.lineWidth || 1.5);
            const plotLineStyle = draft.plotStyles?.[plotKey] || (isRef ? "dashed" : "solid");
            const isSelected = colorContext?.activeTarget?.label === plotKey;

            return (
              <div key={plotKey} className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <TvCheckbox
                    checked={isVisible}
                    onChange={(checked) => handlePlotToggle(plotKey, checked)}
                    label={p.title || plotKey}
                  />
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Button 1: Line preview & Color button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        colorContext?.closePicker();
                      } else {
                        colorContext?.openPicker({
                          label: plotKey,
                          value: plotColor,
                          onChange: (c) => handlePlotColorChange(plotKey, c),
                        });
                      }
                    }}
                    className={cn(
                      "w-12 h-7 rounded bg-[#1e222d] border flex items-center justify-center transition-all hover:border-[#2962ff]",
                      isSelected ? "border-[#2962ff] ring-2 ring-[#2962ff]/40" : "border-[#363a45]",
                    )}
                    title={`Change color: ${p.title || plotKey}`}
                  >
                    <span
                      className="w-8 rounded-full"
                      style={{
                        height: Math.max(1.5, Math.min(4, plotWidth * 1.5)),
                        backgroundColor: plotLineStyle === "solid" ? plotColor : "transparent",
                        backgroundImage:
                          plotLineStyle === "dashed"
                            ? `repeating-linear-gradient(to right, ${plotColor} 0, ${plotColor} 4px, transparent 4px, transparent 7px)`
                            : plotLineStyle === "dotted"
                            ? `repeating-linear-gradient(to right, ${plotColor} 0, ${plotColor} 2px, transparent 2px, transparent 4px)`
                            : undefined,
                      }}
                    />
                  </button>

                  {/* Button 2: Line thickness */}
                  <button
                    type="button"
                    onClick={() => handlePlotWidthCycle(plotKey, plotWidth)}
                    className="w-7 h-7 rounded bg-[#1e222d] border border-[#363a45] flex items-center justify-center hover:border-neutral-400 hover:text-white transition-colors"
                    title={`Line width: ${plotWidth}px (click to cycle)`}
                  >
                    <span
                      className="w-3.5 bg-neutral-300 rounded-full"
                      style={{ height: Math.max(1, Math.min(4, plotWidth)) }}
                    />
                  </button>

                  {/* Button 3: Line style curve */}
                  <button
                    type="button"
                    onClick={() => handlePlotStyleCycle(plotKey, plotLineStyle)}
                    className="w-7 h-7 rounded bg-[#1e222d] border border-[#363a45] flex items-center justify-center hover:border-neutral-400 text-neutral-300 hover:text-white transition-colors"
                    title={`Line style: ${plotLineStyle} (click to cycle)`}
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path
                        d="M2 11 C 4 5, 6 5, 8 8.5 C 10 12, 12 12, 14 5"
                        strokeLinecap="round"
                        strokeDasharray={plotLineStyle === "dashed" ? "3 2" : plotLineStyle === "dotted" ? "1 2" : undefined}
                      />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. Graphic Objects (Polylines / Boxes / Lines) */}
      {(hasPolylines || hasBoxes || hasLines) && (
        <div className="space-y-3">
          <div className="text-[11px] font-semibold tracking-wider text-[#787b86] uppercase">
            GRAPHIC OBJECTS
          </div>
          {hasPolylines && (
            <TvCheckbox
              checked={draft.showPolylines !== false}
              onChange={(checked) => setDraft((d) => ({ ...d, showPolylines: checked }))}
              label="Polylines"
            />
          )}
          {hasBoxes && (
            <TvCheckbox
              checked={draft.showBoxes !== false}
              onChange={(checked) => setDraft((d) => ({ ...d, showBoxes: checked }))}
              label="Boxes"
            />
          )}
          {hasLines && (
            <TvCheckbox
              checked={draft.showLines !== false}
              onChange={(checked) => setDraft((d) => ({ ...d, showLines: checked }))}
              label="Lines"
            />
          )}
        </div>
      )}

      {/* 3. Output Values */}
      <div className="space-y-3">
        <div className="text-[11px] font-semibold tracking-wider text-[#787b86] uppercase">
          OUTPUT VALUES
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#d1d4dc] font-medium">Precision</span>
          <div className="relative">
            <select
              value={draft.precision || "Default"}
              onChange={(e) => setDraft((d) => ({ ...d, precision: e.target.value }))}
              className="appearance-none w-28 px-3 py-1.5 pr-7 rounded bg-[#131722] border border-[#434651] text-[#d1d4dc] text-xs font-medium focus:outline-none focus:border-[#2962ff] cursor-pointer"
            >
              <option value="Default">Default</option>
              {["0", "1", "2", "3", "4", "5", "6", "7", "8"].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400 text-[10px]">
              ▼
            </span>
          </div>
        </div>

        <TvCheckbox
          checked={Boolean(draft.labelsOnPriceScale)}
          onChange={(checked) => setDraft((d) => ({ ...d, labelsOnPriceScale: checked }))}
          label="Labels on price scale"
        />

        <TvCheckbox
          checked={Boolean(draft.valuesInStatusLine)}
          onChange={(checked) => setDraft((d) => ({ ...d, valuesInStatusLine: checked }))}
          label="Values in status line"
        />
      </div>

      {/* 4. Input Values */}
      <div className="space-y-3">
        <div className="text-[11px] font-semibold tracking-wider text-[#787b86] uppercase">
          INPUT VALUES
        </div>
        <TvCheckbox
          checked={Boolean(draft.inputsInStatusLine)}
          onChange={(checked) => setDraft((d) => ({ ...d, inputsInStatusLine: checked }))}
          label="Inputs in status line"
        />
      </div>
    </div>
  );
}

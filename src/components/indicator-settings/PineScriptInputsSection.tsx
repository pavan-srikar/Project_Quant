import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { IndicatorType } from "../../lib/indicators.ts";
import type { IndicatorSettings } from "../../hooks/useIndicatorSettings.ts";
import { getCustomPineIndicators, parsePineScript } from "../../lib/pinescript";
import type { PineInputDef } from "../../lib/pinescript/types";
import { useColorPickerContext } from "../color-picker/ColorPickerContext";
import { NumberStepper } from "./NumberStepper";

export interface PineScriptInputsSectionProps {
  type: IndicatorType;
  draft: IndicatorSettings;
  setDraft: React.Dispatch<React.SetStateAction<IndicatorSettings>>;
}

type InputRowItem =
  | { kind: "single"; input: PineInputDef }
  | { kind: "inline"; inlineKey: string; label: string; inputs: PineInputDef[] };

function ColorSwatchButton({
  label,
  value,
  isSelected,
  onClick,
}: {
  label: string;
  value: string;
  isSelected?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative w-7 h-7 rounded-lg border shadow-sm overflow-hidden flex items-center justify-center transition-all hover:scale-105 cursor-pointer shrink-0",
        isSelected
          ? "border-[#2962ff] ring-2 ring-[#2962ff]/50"
          : "border-[#3a3e4b] hover:border-[#2962ff]",
      )}
      title={`Change color: ${label}`}
    >
      <span className="absolute inset-0 bg-[radial-gradient(#3a3e4b_1px,transparent_1px)] [background-size:6px_6px] opacity-40 pointer-events-none" />
      <span className="absolute inset-0" style={{ backgroundColor: value }} />
    </button>
  );
}

export function PineScriptInputsSection({
  type,
  draft,
  setDraft,
}: PineScriptInputsSectionProps) {
  const colorContext = useColorPickerContext();

  const customScript = useMemo(() => {
    return getCustomPineIndicators().find((c) => c.id === type);
  }, [type]);

  const parsed = useMemo(() => {
    if (!customScript?.code) return null;
    return parsePineScript(customScript.code);
  }, [customScript?.code]);

  const currentInputs = useMemo(() => {
    return {
      ...(customScript?.inputs || {}),
      ...(draft.pineInputs || {}),
    };
  }, [customScript?.inputs, draft.pineInputs]);

  const groups = useMemo(() => {
    if (!parsed || parsed.inputs.length === 0) return [];
    const map = new Map<string, PineInputDef[]>();
    for (const inp of parsed.inputs) {
      const g = inp.group ? inp.group.toUpperCase() : "GENERAL";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(inp);
    }

    return Array.from(map.entries()).map(([name, inputs]) => {
      const rows: InputRowItem[] = [];
      let i = 0;
      while (i < inputs.length) {
        const cur = inputs[i]!;
        if (cur.inline) {
          const inlineKey = cur.inline;
          const inlineGroup: PineInputDef[] = [];
          while (i < inputs.length && inputs[i]!.inline === inlineKey) {
            inlineGroup.push(inputs[i]!);
            i++;
          }
          const rowLabel =
            inlineGroup.find((inp) => inp.title && inp.title !== inp.id)?.title ||
            inlineGroup[0]?.title ||
            inlineKey;
          rows.push({ kind: "inline", inlineKey, label: rowLabel, inputs: inlineGroup });
        } else {
          rows.push({ kind: "single", input: cur });
          i++;
        }
      }
      return { name, rows };
    });
  }, [parsed]);

  const handleInputChange = (id: string, val: any) => {
    setDraft((d) => ({
      ...d,
      pineInputs: {
        ...(d.pineInputs || {}),
        [id]: val,
      },
    }));
  };

  const renderSingleControl = (inp: PineInputDef) => {
    const val = currentInputs[inp.id] ?? inp.defval;

    if (inp.options && inp.options.length > 0) {
      return (
        <select
          value={String(val)}
          onChange={(e) => handleInputChange(inp.id, e.target.value)}
          className="px-2.5 py-1.5 rounded-lg bg-[#131722] border border-[#2a2e39] text-white font-mono text-xs focus:outline-none focus:border-[#2962ff]"
        >
          {inp.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }

    if (inp.type === "bool") {
      return (
        <input
          type="checkbox"
          checked={Boolean(val)}
          onChange={(e) => handleInputChange(inp.id, e.target.checked)}
          className="w-4 h-4 rounded bg-[#131722] border border-[#2a2e39] text-[#2962ff] focus:ring-0 cursor-pointer"
        />
      );
    }

    if (inp.type === "color") {
      const isSelected = colorContext?.activeTarget?.label === (inp.title || inp.id);
      return (
        <ColorSwatchButton
          label={inp.title || inp.id}
          value={String(val)}
          isSelected={isSelected}
          onClick={() => {
            if (isSelected) {
              colorContext?.closePicker();
            } else {
              colorContext?.openPicker({
                label: inp.title || inp.id,
                value: String(val),
                onChange: (newColor) => handleInputChange(inp.id, newColor),
              });
            }
          }}
        />
      );
    }

    if (inp.type === "string") {
      return (
        <input
          type="text"
          value={String(val)}
          onChange={(e) => handleInputChange(inp.id, e.target.value)}
          className="w-32 px-2.5 py-1.5 rounded-lg bg-[#131722] border border-[#2a2e39] text-white font-mono text-xs focus:outline-none focus:border-[#2962ff]"
        />
      );
    }

    // int or float numeric stepper
    const numVal = Number(val);
    return (
      <NumberStepper
        value={isNaN(numVal) ? 0 : numVal}
        min={inp.min}
        max={inp.max}
        step={inp.type === "float" ? 0.05 : 1}
        onChange={(v) => handleInputChange(inp.id, v)}
      />
    );
  };

  if (!customScript || !parsed || parsed.inputs.length === 0) {
    return (
      <div className="p-3 rounded-lg bg-[#131722] text-neutral-400 leading-relaxed text-xs">
        No configurable inputs detected for this Pine Script.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map(({ name, rows }) => (
        <div key={name} className="space-y-3">
          <div className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase border-b border-[#2a2e39]/60 pb-1.5">
            {name}
          </div>
          <div className="space-y-3">
            {rows.map((row, idx) => {
              if (row.kind === "single") {
                const inp = row.input;
                return (
                  <div key={inp.id} className="flex items-center justify-between gap-3 text-xs">
                    <label className="text-neutral-300 font-medium truncate flex-1" title={inp.title}>
                      {inp.title || inp.id}
                    </label>
                    <div>{renderSingleControl(inp)}</div>
                  </div>
                );
              }

              // Inline row (e.g. upLine + dnLine or signalArea + signalBull + signalBear)
              return (
                <div key={row.inlineKey + idx} className="flex items-center justify-between gap-3 text-xs">
                  <label className="text-neutral-300 font-medium truncate flex-1" title={row.label}>
                    {row.label}
                  </label>
                  <div className="flex items-center gap-2">
                    {row.inputs.map((inp) => {
                      const hasDistinctSublabel =
                        inp.title &&
                        inp.title !== row.label &&
                        inp.title !== inp.id &&
                        inp.type !== "color";

                      return (
                        <div key={inp.id} className="flex items-center gap-1.5">
                          {hasDistinctSublabel && (
                            <span className="text-[11px] text-neutral-400 font-mono">
                              {inp.title}
                            </span>
                          )}
                          {renderSingleControl(inp)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

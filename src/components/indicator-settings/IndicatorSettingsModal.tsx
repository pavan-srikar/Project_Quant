import { useState, useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";

import { INDICATOR_REGISTRY, type IndicatorType } from "../../lib/indicators.ts";
import {
  type IndicatorSettings,
  DEFAULT_INDICATOR_SETTINGS,
} from "../../hooks/useIndicatorSettings.ts";
import { cn } from "@/lib/utils";
import type { IndicatorSettingsModalProps } from "./types";
import { IndicatorInputsTab } from "./IndicatorInputsTab";
import { IndicatorStyleTab } from "./IndicatorStyleTab";
import { IndicatorVisibilityTab } from "./IndicatorVisibilityTab";
import { ColorPickerOverlay } from "./ColorPickerOverlay";
import {
  getCustomPineIndicators,
  openPineScriptEditor,
  parsePineScript,
  updateCustomPineIndicatorInputs,
} from "../../lib/pinescript";
import {
  ColorPickerProvider,
  useColorPickerContext,
} from "../color-picker/ColorPickerContext";

function IndicatorSettingsModalInner({
  isOpen,
  onClose,
  type,
  settings,
  onSave,
  onReset,
  onPreview,
}: IndicatorSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"inputs" | "style" | "visibility">("inputs");
  const modalRef = useRef<HTMLDivElement>(null);
  const colorContext = useColorPickerContext();
  const activeTarget = colorContext?.activeTarget;
  const closePicker = colorContext?.closePicker ?? (() => {});

  const initialSettingsRef = useRef<IndicatorSettings>(settings);
  const appliedRef = useRef(false);
  const prevOpenRef = useRef(false);
  const prevTypeRef = useRef<IndicatorType | null>(null);

  // Local draft state
  const [draft, setDraft] = useState<IndicatorSettings>(
    settings ?? { color: "#2962ff", visible: true },
  );

  // Initialize draft ONLY on modal open or type switch
  useEffect(() => {
    if (isOpen && (!prevOpenRef.current || prevTypeRef.current !== type)) {
      prevOpenRef.current = true;
      prevTypeRef.current = type;
      appliedRef.current = false;
      initialSettingsRef.current = settings;

      const custom = type?.startsWith("pine_")
        ? getCustomPineIndicators().find((c) => c.id === type)
        : null;

      const mergedInputs = {
        ...(custom?.inputs || {}),
        ...(settings?.pineInputs || {}),
      };

      setDraft({
        ...(settings ?? { color: "#2962ff", visible: true }),
        pineInputs: mergedInputs,
      });
      setActiveTab("inputs");
      closePicker();
    } else if (!isOpen && prevOpenRef.current) {
      prevOpenRef.current = false;
      prevTypeRef.current = null;
    }
  }, [isOpen, type, settings]);

  // Real-time immediate auto-apply on ANY draft update
  const handleDraftUpdate = useCallback(
    (action: React.SetStateAction<IndicatorSettings>) => {
      setDraft((prev) => {
        const next = typeof action === "function" ? action(prev) : action;
        if (type) {
          if (type.startsWith("pine_") && next.pineInputs) {
            updateCustomPineIndicatorInputs(type, next.pineInputs);
          }
          onPreview?.(type, next);
        }
        return next;
      });
    },
    [type, onPreview],
  );

  if (!isOpen || !type) return null;

  const registry = INDICATOR_REGISTRY.find((r) => r.type === type);
  const customIndicator = type.startsWith("pine_")
    ? getCustomPineIndicators().find((c) => c.id === type)
    : null;
  const title = registry
    ? `${registry.label} (${type})`
    : customIndicator
      ? customIndicator.name
      : type;

  const handleApply = () => {
    appliedRef.current = true;
    if (type.startsWith("pine_") && draft.pineInputs) {
      updateCustomPineIndicatorInputs(type, draft.pineInputs);
    }
    onSave(type, draft);
    closePicker();
    onClose();
  };

  const handleCancel = () => {
    if (type && initialSettingsRef.current) {
      if (type.startsWith("pine_") && initialSettingsRef.current.pineInputs) {
        updateCustomPineIndicatorInputs(type, initialSettingsRef.current.pineInputs);
      }
      onPreview?.(type, initialSettingsRef.current);
    }
    closePicker();
    onClose();
  };

  const handleReset = () => {
    if (type.startsWith("pine_")) {
      const custom = getCustomPineIndicators().find((c) => c.id === type);
      if (custom) {
        const parsed = parsePineScript(custom.code);
        const pineInputs: Record<string, any> = {};
        for (const inp of parsed.inputs) pineInputs[inp.id] = inp.defval;
        const resetPine: IndicatorSettings = {
          ...draft,
          color: custom.color || "#2962ff",
          pineInputs,
          showPolylines: true,
          showBoxes: true,
          showLines: true,
          plotVisibility: {},
          plotColors: {},
          plotLineWidths: {},
          plotStyles: {},
          precision: "Default",
          labelsOnPriceScale: false,
          valuesInStatusLine: false,
          inputsInStatusLine: false,
        };
        handleDraftUpdate(resetPine);
        return;
      }
    }
    const defaultVal = DEFAULT_INDICATOR_SETTINGS[type];
    if (defaultVal) {
      handleDraftUpdate({ ...defaultVal });
      onReset(type);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={() => {
        if (activeTarget) closePicker();
        else handleApply();
      }}
    >
      <div className="relative">
        <div
          ref={modalRef}
          className="w-full max-w-md rounded-2xl bg-[#1e222d] border border-[#2a2e39] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#2a2e39] bg-[#171b26]">
            <h3 className="text-sm font-bold text-white truncate max-w-[280px]" title={title}>
              {title}
            </h3>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  handleApply();
                  openPineScriptEditor(type);
                }}
                className="px-2 py-1 rounded text-neutral-400 hover:text-[#2962ff] hover:bg-[#2962ff]/15 transition-colors font-mono text-xs font-bold"
                title="Edit Pine Script ({/})"
              >
                {"{/}"}
              </button>

              <button
                onClick={handleApply}
                className="p-1 rounded text-neutral-400 hover:text-white hover:bg-[#2a2e39] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tab Navigation (TradingView Layout with our Project Quant Blue Accent) */}
          <div className="flex items-center gap-6 px-5 border-b border-[#2a2e39] bg-[#171b26]">
            {(["inputs", "style", "visibility"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "py-2.5 text-xs tracking-wide transition-all border-b-2 -mb-[1px] capitalize",
                  activeTab === tab
                    ? "border-[#2962ff] text-[#2962ff] font-bold"
                    : "border-transparent text-neutral-400 hover:text-neutral-200 font-medium",
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
            {activeTab === "inputs" && (
              <IndicatorInputsTab type={type} draft={draft} setDraft={handleDraftUpdate} />
            )}

            {activeTab === "style" && (
              <IndicatorStyleTab type={type} draft={draft} setDraft={handleDraftUpdate} />
            )}

            {activeTab === "visibility" && (
              <IndicatorVisibilityTab draft={draft} setDraft={handleDraftUpdate} />
            )}
          </div>

          {/* Footer (TradingView Layout with our Project Quant UI Color Scheme) */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-[#2a2e39] bg-[#171b26]">
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-300 hover:text-white hover:bg-[#2a2e39] transition-colors border border-[#2a2e39]"
            >
              Defaults ▾
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-1.5 rounded-lg text-xs font-medium text-neutral-300 hover:text-white hover:bg-[#2a2e39] border border-[#2a2e39] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="px-5 py-1.5 rounded-lg text-xs font-semibold bg-[#2962ff] text-white hover:bg-[#1e53e5] shadow-md shadow-[#2962ff]/20 transition-all"
              >
                Ok
              </button>
            </div>
          </div>
        </div>

        {/* Color Picker Popout Overlay */}
        <ColorPickerOverlay modalRef={modalRef} />
      </div>
    </div>
  );
}

export function IndicatorSettingsModal(props: IndicatorSettingsModalProps) {
  return (
    <ColorPickerProvider>
      <IndicatorSettingsModalInner {...props} />
    </ColorPickerProvider>
  );
}

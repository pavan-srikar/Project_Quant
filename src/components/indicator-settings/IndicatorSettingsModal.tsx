import { useState, useEffect, useRef } from "react";
import { X, RotateCcw, Sliders, Palette } from "lucide-react";
import { INDICATOR_REGISTRY } from "../../lib/indicators.ts";
import {
  type IndicatorSettings,
  DEFAULT_INDICATOR_SETTINGS,
} from "../../hooks/useIndicatorSettings.ts";
import { cn } from "@/lib/utils";
import type { IndicatorSettingsModalProps } from "./types";
import { IndicatorInputsTab } from "./IndicatorInputsTab";
import { IndicatorStyleTab } from "./IndicatorStyleTab";
import { getCustomPineIndicators } from "../../lib/pinescript";
import {
  ColorPickerProvider,
  useColorPickerContext,
} from "../color-picker/ColorPickerContext";
import { RgbPickerPanel } from "../color-picker/RgbPickerPanel";

function IndicatorSettingsModalInner({
  isOpen,
  onClose,
  type,
  settings,
  onSave,
  onReset,
}: IndicatorSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"inputs" | "style">("inputs");
  const modalRef = useRef<HTMLDivElement>(null);
  const colorContext = useColorPickerContext();
  const activeTarget = colorContext?.activeTarget;
  const closePicker = colorContext?.closePicker ?? (() => {});

  const [sidePosition, setSidePosition] = useState<"right" | "left">("right");

  // Local draft state
  const [draft, setDraft] = useState<IndicatorSettings>(
    settings ?? { color: "#2962ff", visible: true },
  );

  useEffect(() => {
    if (isOpen) {
      setDraft(settings ?? { color: "#2962ff", visible: true });
      setActiveTab("inputs");
      closePicker();
    }
  }, [isOpen, settings, type]);

  // Dynamically place side panel on left if modal is too close to right edge
  useEffect(() => {
    if (!activeTarget || !modalRef.current) return;
    const checkSpace = () => {
      if (modalRef.current) {
        const rect = modalRef.current.getBoundingClientRect();
        if (rect.right + 300 > window.innerWidth && rect.left > 300) {
          setSidePosition("left");
        } else {
          setSidePosition("right");
        }
      }
    };
    checkSpace();
    window.addEventListener("resize", checkSpace);
    return () => window.removeEventListener("resize", checkSpace);
  }, [activeTarget]);

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
    onSave(type, draft);
    closePicker();
    onClose();
  };

  const handleReset = () => {
    const defaultVal = DEFAULT_INDICATOR_SETTINGS[type];
    if (defaultVal) {
      setDraft({ ...defaultVal });
      onReset(type);
    }
  };

  const handleModalClose = () => {
    closePicker();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={() => {
        if (activeTarget) {
          closePicker();
        } else {
          handleModalClose();
        }
      }}
    >
      <div className="relative">
        <div
          ref={modalRef}
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
              onClick={handleModalClose}
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
              <IndicatorInputsTab type={type} draft={draft} setDraft={setDraft} />
            )}

            {activeTab === "style" && (
              <IndicatorStyleTab type={type} draft={draft} setDraft={setDraft} />
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
                onClick={handleModalClose}
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

        {/* Side Panel for screens >= 768px (Desktop/Tablet) */}
        {activeTarget && (
          <div
            className={cn(
              "hidden md:block absolute top-0 z-50 animate-in fade-in duration-150",
              sidePosition === "right" ? "left-[calc(100%+14px)]" : "right-[calc(100%+14px)]",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <RgbPickerPanel
              label={activeTarget.label}
              value={activeTarget.value}
              onChange={(val) => {
                activeTarget.onChange(val);
                colorContext?.updateValue(val);
              }}
              onClose={closePicker}
            />
          </div>
        )}
      </div>

      {/* Floating Center Overlay for screens < 768px (Mobile) */}
      {activeTarget && (
        <div
          className="md:hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-in fade-in"
          onClick={(e) => {
            e.stopPropagation();
            closePicker();
          }}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <RgbPickerPanel
              label={activeTarget.label}
              value={activeTarget.value}
              onChange={(val) => {
                activeTarget.onChange(val);
                colorContext?.updateValue(val);
              }}
              onClose={closePicker}
            />
          </div>
        </div>
      )}
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

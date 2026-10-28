import React, { useRef, useState, useEffect } from "react";
import { Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { COLOR_PALETTE } from "../indicator-settings/types";
import { parseColor, applyHexToColor } from "../../lib/colorUtils.ts";
import { RgbPickerPanel } from "./RgbPickerPanel";
import { useColorPickerContext } from "./ColorPickerContext";

export interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  compact?: boolean;
  className?: string;
  align?: "left" | "right";
  side?: "top" | "bottom";
}

export function ColorPicker({
  value,
  onChange,
  label,
  compact = false,
  className,
  align = "left",
  side = "bottom",
}: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sideContext = useColorPickerContext();

  const parsed = parseColor(value);

  // Close fallback popover on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleSelectHex = (hex: string) => {
    onChange(applyHexToColor(value || "#2962ff", hex));
  };

  const handleOpenPicker = () => {
    if (sideContext) {
      if (sideContext.activeTarget?.label === label && sideContext.activeTarget?.value === value) {
        sideContext.closePicker();
      } else {
        sideContext.openPicker({ label, value, onChange });
      }
    } else {
      setIsOpen((prev) => !prev);
    }
  };

  const checkerboardStyle: React.CSSProperties = {
    backgroundImage: `repeating-conic-gradient(#363a45 0% 25%, #1e222d 0% 50%)`,
    backgroundSize: "8px 8px",
    backgroundPosition: "0 0",
  };

  const isCurrentActiveInContext =
    sideContext?.activeTarget?.label === label && sideContext?.activeTarget?.value === value;

  // Compact Mode (for table rows, toolbars, settings dialogs)
  if (compact) {
    return (
      <div ref={containerRef} className={cn("relative inline-block", className)}>
        <button
          type="button"
          onClick={handleOpenPicker}
          className={cn(
            "w-6 h-6 rounded border overflow-hidden relative shadow-sm hover:scale-105 transition-transform",
            isCurrentActiveInContext || isOpen
              ? "border-[#2962ff] ring-2 ring-[#2962ff]/40"
              : "border-[#2a2e39]",
          )}
          style={checkerboardStyle}
          title={label || "Select color"}
        >
          <div className="w-full h-full" style={{ backgroundColor: value || "#2962ff" }} />
        </button>

        {/* Fallback popover when not inside side-picker context */}
        {!sideContext && isOpen && (
          <div
            className={cn(
              "absolute z-50 animate-in fade-in duration-150 shadow-2xl",
              side === "top" ? "bottom-full mb-2" : "top-full mt-2",
              align === "right" ? "right-0" : "left-0",
            )}
          >
            <div className="w-64 bg-[#0c0e14] border border-[#363a45] ring-1 ring-white/10 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] p-3 text-xs select-none space-y-3">
              {label && <div className="font-bold text-white text-[11px] mb-1">{label}</div>}
              {/* Quick palette at top */}
              <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-[#2a2e39]/50">
                {COLOR_PALETTE.map((c) => {
                  const isSelected = parsed.hex.toLowerCase() === c.toLowerCase();
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleSelectHex(c)}
                      className="w-5 h-5 rounded-full border border-black/40 flex items-center justify-center transition-transform hover:scale-110 shrink-0"
                      style={{ backgroundColor: c }}
                      title={c}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white drop-shadow" />}
                    </button>
                  );
                })}
              </div>
              <RgbPickerPanel
                value={value || "#2962ff"}
                onChange={onChange}
                label={label}
                onClose={() => setIsOpen(false)}
                className="!p-0 !border-0 !shadow-none !w-full !bg-transparent"
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full Inline Mode (for indicator settings tabs)
  return (
    <div ref={containerRef} className={cn("space-y-2 relative", className)}>
      {label && <label className="text-neutral-300 font-medium block text-xs">{label}</label>}

      {/* Row 1: Quick palette circles + '+' button */}
      <div className="flex flex-wrap items-center gap-2">
        {COLOR_PALETTE.map((c) => {
          const isSelected = parsed.hex.toLowerCase() === c.toLowerCase();
          return (
            <button
              key={c}
              type="button"
              onClick={() => handleSelectHex(c)}
              className="w-6 h-6 rounded-full border border-black/40 flex items-center justify-center transition-transform hover:scale-110 shrink-0"
              style={{ backgroundColor: c }}
              title={c}
            >
              {isSelected && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
            </button>
          );
        })}

        {/* Plus button to open RGB & Opacity picker */}
        <button
          type="button"
          onClick={handleOpenPicker}
          className={cn(
            "w-6 h-6 rounded-full border border-dashed flex items-center justify-center transition-all hover:scale-110 shrink-0",
            isCurrentActiveInContext || isOpen
              ? "border-[#2962ff] text-[#2962ff] bg-[#2962ff]/10 ring-2 ring-[#2962ff]/30"
              : "border-neutral-400 hover:border-white bg-[#131722] hover:bg-[#2a2e39] text-neutral-300 hover:text-white",
          )}
          title="Pick custom color / Opacity"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Row 2: Square color box + text input */}
      <div className="relative inline-flex items-center gap-2.5">
        <div
          className={cn(
            "w-8 h-8 rounded-lg overflow-hidden border relative cursor-pointer shadow-inner shrink-0 transition-all",
            isCurrentActiveInContext || isOpen
              ? "border-[#2962ff] ring-2 ring-[#2962ff]/40"
              : "border-[#2a2e39] hover:border-neutral-400",
          )}
          style={checkerboardStyle}
          onClick={handleOpenPicker}
          title="Click to open RGB & opacity picker"
        >
          <div className="w-full h-full" style={{ backgroundColor: value || "#2962ff" }} />
        </div>

        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-36 px-2.5 py-1.5 rounded-lg bg-[#131722] border border-[#2a2e39] text-white font-mono text-xs focus:outline-none focus:border-[#2962ff]"
          placeholder="#2962ff or rgba(...)"
        />

        {/* Fallback popover when not inside side-picker context */}
        {!sideContext && isOpen && (
          <div
            className={cn(
              "absolute z-50 top-full mt-2 animate-in fade-in duration-150 shadow-2xl",
              align === "right" ? "right-0" : "left-0",
            )}
          >
            <RgbPickerPanel
              value={value || "#2962ff"}
              onChange={onChange}
              label={label}
              onClose={() => setIsOpen(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

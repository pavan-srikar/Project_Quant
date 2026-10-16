import { RotateCcw, Sliders, X } from "lucide-react";
import { useEffect } from "react";
import type { IndicatorType } from "../../../lib/indicators.ts";
import type { ContextMenuState } from "./types.ts";

export interface IndicatorContextMenuProps {
  contextMenu: ContextMenuState | null;
  onClose: () => void;
  onOpenSettings: (type: IndicatorType) => void;
  onResetSettings: (type: IndicatorType) => void;
  onRemoveIndicator: (type: IndicatorType) => void;
}

export function IndicatorContextMenu({
  contextMenu,
  onClose,
  onOpenSettings,
  onResetSettings,
  onRemoveIndicator,
}: IndicatorContextMenuProps) {
  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = () => onClose();
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [contextMenu, onClose]);

  if (!contextMenu) return null;

  return (
    <div
      className="fixed z-50 min-w-[170px] bg-[#1a1e29] border border-[#2a2e39] rounded-lg shadow-2xl py-1 text-xs backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
      style={{ top: contextMenu.y, left: contextMenu.x }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-3 py-1.5 font-semibold text-neutral-400 border-b border-[#2a2e39] mb-1 flex items-center justify-between">
        <span>{contextMenu.type} Indicator</span>
      </div>
      <button
        type="button"
        className="w-full px-3 py-1.5 text-left text-neutral-200 hover:bg-[#252a38] hover:text-white flex items-center gap-2 transition-colors"
        onClick={() => {
          onOpenSettings(contextMenu.type);
          onClose();
        }}
      >
        <Sliders className="h-3.5 w-3.5 text-[#2962ff]" />
        <span>Settings...</span>
      </button>
      <button
        type="button"
        className="w-full px-3 py-1.5 text-left text-neutral-200 hover:bg-[#252a38] hover:text-white flex items-center gap-2 transition-colors"
        onClick={() => {
          onResetSettings(contextMenu.type);
          onClose();
        }}
      >
        <RotateCcw className="h-3.5 w-3.5 text-neutral-400" />
        <span>Reset Settings</span>
      </button>
      <div className="my-1 border-t border-[#2a2e39]" />
      <button
        type="button"
        className="w-full px-3 py-1.5 text-left text-[#f6465d] hover:bg-[#f6465d]/10 flex items-center gap-2 transition-colors"
        onClick={() => {
          onRemoveIndicator(contextMenu.type);
          onClose();
        }}
      >
        <X className="h-3.5 w-3.5 text-[#f6465d]" />
        <span>Remove Indicator</span>
      </button>
    </div>
  );
}

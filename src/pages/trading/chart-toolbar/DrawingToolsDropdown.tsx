import {
  ChevronDown,
  Heart,
  type LucideIcon,
  Magnet,
  Pencil,
  Repeat,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useFavoriteDrawingTools } from "../../../hooks/useFavoriteDrawingTools.ts";
import { cn } from "../../../lib/utils.ts";
import type { DrawingLine, DrawingTool, MagnetMode } from "../constants.ts";
import { DRAWING_TOOLS_LIST } from "../drawingToolMeta.ts";

export interface DrawingOptionToggleProps {
  icon: LucideIcon;
  label: string;
  enabled: boolean;
  onToggle?: () => void;
}

export function DrawingOptionToggle({
  icon: Icon,
  label,
  enabled,
  onToggle,
}: DrawingOptionToggleProps) {
  if (!onToggle) return null;
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium hover:bg-[#2a2e39] text-left text-neutral-200 transition-colors",
        enabled && "text-[#2962ff]",
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="flex-1">{label}</span>
      {enabled && <span className="text-[10px] text-[#2962ff] font-bold">ON</span>}
    </button>
  );
}

export interface DrawingToolsDropdownProps {
  drawingTool: DrawingTool;
  onDrawingTool: (t: DrawingTool) => void;
  drawings: DrawingLine[];
  onClearDrawings: () => void;
  magnetMode: MagnetMode;
  onCycleMagnet?: () => void;
  stayInDrawingMode: boolean;
  onToggleStayInDrawingMode?: () => void;
}

export function DrawingToolsDropdown({
  drawingTool,
  onDrawingTool,
  drawings,
  onClearDrawings,
  magnetMode,
  onCycleMagnet,
  stayInDrawingMode,
  onToggleStayInDrawingMode,
}: DrawingToolsDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { isFavorite, toggleFavorite } = useFavoriteDrawingTools();

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const isActive = drawingTool !== "none";

  const handleSelect = (t: DrawingTool) => {
    onDrawingTool(drawingTool === t ? "none" : t);
    setOpen(false);
  };

  const handleClear = () => {
    onClearDrawings();
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title="Drawing Tools"
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
          isActive || open
            ? "bg-[#2962ff]/15 text-[#2962ff]"
            : "hover:bg-[#1e222d] text-neutral-400 hover:text-neutral-200",
        )}
      >
        <Pencil className="h-3.5 w-3.5" />
        <span>Drawing Tools</span>
        <ChevronDown className={cn("h-3 w-3 opacity-60 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 bg-[#1e222d] border border-[#2a2e39] rounded-xl shadow-2xl py-1.5 min-w-[240px] max-h-[75vh] overflow-y-auto no-scrollbar backdrop-blur-md">
          {DRAWING_TOOLS_LIST.map(({ tool, icon: Icon, label, shortcut }) => {
            const favorited = isFavorite(tool);
            const isArmed = drawingTool === tool;
            return (
              <div
                key={tool}
                className={cn(
                  "group w-full flex items-center px-1.5 py-0.5 rounded-lg text-xs font-medium hover:bg-[#2a2e39] text-left transition-colors select-none",
                  isArmed && "bg-[#2a2e39]",
                )}
              >
                <button
                  type="button"
                  title={favorited ? `Remove ${label} from favorites` : `Add ${label} to favorites`}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleFavorite(tool);
                  }}
                  className="p-1 rounded-md hover:bg-[#363a45] text-neutral-400 hover:text-rose-400 transition-colors focus:outline-none shrink-0"
                >
                  <Heart
                    className={cn(
                      "h-3.5 w-3.5 transition-colors",
                      favorited
                        ? "fill-rose-500 text-rose-500"
                        : "text-neutral-500 hover:text-rose-400 opacity-60 group-hover:opacity-100",
                    )}
                  />
                </button>

                <button
                  type="button"
                  onClick={() => handleSelect(tool)}
                  className="flex-1 flex items-center gap-2 py-1 pl-1 pr-1.5 text-left rounded-md transition-colors"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-neutral-400 group-hover:text-white" />
                  <span
                    className={cn(
                      "flex-1",
                      isArmed
                        ? "text-[#2962ff] font-semibold"
                        : "text-neutral-200 group-hover:text-white",
                    )}
                  >
                    {label}
                  </span>
                  {shortcut && (
                    <span className="text-[10px] text-neutral-500 font-mono">{shortcut}</span>
                  )}
                </button>
              </div>
            );
          })}

          <div className="my-1 border-t border-[#2a2e39]" />
          <DrawingOptionToggle
            icon={Magnet}
            label={
              magnetMode === "strong"
                ? "Magnet: strong"
                : magnetMode === "weak"
                  ? "Magnet: weak"
                  : "Magnet: off"
            }
            enabled={magnetMode !== "none"}
            onToggle={onCycleMagnet}
          />
          <DrawingOptionToggle
            icon={Repeat}
            label="Stay in drawing mode"
            enabled={stayInDrawingMode}
            onToggle={onToggleStayInDrawingMode}
          />

          {drawings.length > 0 && (
            <>
              <div className="my-1 border-t border-[#2a2e39]" />
              <button
                onClick={handleClear}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium hover:bg-[#2a2e39] text-neutral-400 hover:text-[#f6465d] text-left transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5 shrink-0" />
                Clear All
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

import React from "react";
import {
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronUp,
  GripVertical,
  RotateCcw,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DrawingTool } from "../constants.ts";
import { getDrawingToolMeta } from "../drawingToolMeta.ts";

export interface ReorganizePanelProps {
  panelRef: React.RefObject<HTMLDivElement | null>;
  dragStyle?: React.CSSProperties;
  onClose: () => void;
  onResetPosition: () => void;
  favorites: DrawingTool[];
  moveFavorite: (fromIndex: number, toIndex: number) => void;
  removeFavorite: (tool: DrawingTool) => void;
  draggedIndex: number | null;
  dropTargetIndex: number | null;
  handleDragStart: (e: React.DragEvent, index: number) => void;
  handleDragOver: (e: React.DragEvent, index: number) => void;
  handleDrop: (e: React.DragEvent, index: number) => void;
  handleDragEnd: () => void;
}

export function ReorganizePanel({
  panelRef,
  dragStyle,
  onClose,
  onResetPosition,
  favorites,
  moveFavorite,
  removeFavorite,
  draggedIndex,
  dropTargetIndex,
  handleDragStart,
  handleDragOver,
  handleDrop,
  handleDragEnd,
}: ReorganizePanelProps) {
  return (
    <div
      ref={panelRef}
      style={dragStyle}
      onDoubleClick={onClose}
      className="absolute left-2 top-1/2 z-20 flex flex-col items-center gap-1.5 rounded-xl bg-[#1e222d]/95 border border-[#2a2e39] p-2 shadow-2xl backdrop-blur-md min-w-[170px]"
    >
      {/* Header */}
      <div className="flex items-center justify-between w-full px-1 pb-1 border-b border-[#2a2e39] text-xs font-semibold text-neutral-200">
        <span className="flex items-center gap-1 text-[11px] text-neutral-400 uppercase tracking-wider">
          <ArrowUpDown className="h-3 w-3 text-[#2962ff]" />
          Reorganize
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Reset position to center"
            onClick={onResetPosition}
            className="p-1 rounded text-neutral-500 hover:text-neutral-200 hover:bg-[#2a2e39] transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
          </button>
          <button
            type="button"
            title="Done reorganizing"
            onClick={onClose}
            className="p-1 rounded bg-[#2962ff]/20 text-[#2962ff] hover:bg-[#2962ff]/30 transition-colors"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Favorite tools list with up/down arrows and removal */}
      <div className="flex flex-col gap-1 w-full max-h-[60vh] overflow-y-auto no-scrollbar py-0.5">
        {favorites.map((tool, index) => {
          const meta = getDrawingToolMeta(tool);
          if (!meta) return null;
          const Icon = meta.icon;

          return (
            <div
              key={tool}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={cn(
                "flex items-center gap-1 px-1.5 py-1 rounded-lg bg-[#131722]/80 border border-[#2a2e39] text-xs transition-colors",
                dropTargetIndex === index && "border-[#2962ff] bg-[#2962ff]/10",
                draggedIndex === index && "opacity-50",
              )}
            >
              <div className="cursor-grab text-neutral-500 hover:text-neutral-300">
                <GripVertical className="h-3 w-3" />
              </div>
              <Icon className="h-3.5 w-3.5 text-neutral-300 shrink-0" />
              <span className="flex-1 text-[11px] truncate text-neutral-200 font-medium">
                {meta.label}
              </span>

              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  title="Move up"
                  disabled={index === 0}
                  onClick={() => moveFavorite(index, index - 1)}
                  className="p-0.5 rounded text-neutral-400 hover:text-white disabled:opacity-30 disabled:hover:text-neutral-400 hover:bg-[#2a2e39]"
                >
                  <ChevronUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  title="Move down"
                  disabled={index === favorites.length - 1}
                  onClick={() => moveFavorite(index, index + 1)}
                  className="p-0.5 rounded text-neutral-400 hover:text-white disabled:opacity-30 disabled:hover:text-neutral-400 hover:bg-[#2a2e39]"
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  title="Remove from favorites"
                  onClick={() => removeFavorite(tool)}
                  className="p-0.5 rounded text-neutral-500 hover:text-[#f6465d] hover:bg-[#2a2e39]"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-[10px] text-neutral-500 text-center w-full pt-0.5">
        Drag or click arrows to reorder
      </div>
    </div>
  );
}

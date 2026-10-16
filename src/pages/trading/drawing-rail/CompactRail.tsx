import React from "react";
import {
  ArrowUpDown,
  EyeOff,
  GripVertical,
  Heart,
  MousePointer2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DrawingTool } from "../constants.ts";
import { getDrawingToolMeta } from "../drawingToolMeta.ts";

export interface CompactRailProps {
  panelRef: React.RefObject<HTMLDivElement | null>;
  dragStyle?: React.CSSProperties;
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
  onDoubleClick: () => void;
  onOpenReorganize: () => void;
  onHide: () => void;
  drawingTool: DrawingTool;
  onSelectTool: (t: DrawingTool) => void;
  favorites: DrawingTool[];
  draggedIndex: number | null;
  dropTargetIndex: number | null;
  handleDragStart: (e: React.DragEvent, index: number) => void;
  handleDragOver: (e: React.DragEvent, index: number) => void;
  handleDrop: (e: React.DragEvent, index: number) => void;
  handleDragEnd: () => void;
}

export function CompactRail({
  panelRef,
  dragStyle,
  onPointerDown,
  onDoubleClick,
  onOpenReorganize,
  onHide,
  drawingTool,
  onSelectTool,
  favorites,
  draggedIndex,
  dropTargetIndex,
  handleDragStart,
  handleDragOver,
  handleDrop,
  handleDragEnd,
}: CompactRailProps) {
  return (
    <div
      ref={panelRef}
      style={dragStyle}
      onDoubleClick={onDoubleClick}
      className="absolute left-2 top-1/2 z-20 flex flex-col items-center gap-1 rounded-xl bg-[#1e222d]/90 border border-[#2a2e39] p-1 shadow-2xl backdrop-blur-md"
    >
      {/* Top drag handle */}
      <div
        onPointerDown={onPointerDown}
        title="Drag to move • Double-click to reorganize tools"
        className="flex w-full cursor-move justify-center py-0.5 text-neutral-500 hover:text-neutral-300 transition-colors"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </div>

      {/* Default Cursor button */}
      <button
        type="button"
        title="Cursor / Selection"
        onClick={() => onSelectTool("none")}
        className={cn(
          "p-1.5 rounded-lg transition-colors",
          drawingTool === "none"
            ? "bg-[#2962ff]/20 text-[#2962ff]"
            : "text-neutral-400 hover:text-neutral-200 hover:bg-[#2a2e39]",
        )}
      >
        <MousePointer2 className="h-4 w-4" />
      </button>

      {/* Separator */}
      <div className="my-0.5 w-full border-t border-[#2a2e39]" />

      {/* Hearted (Favorite) Tools */}
      {favorites.length === 0 ? (
        <div
          title="No favorite drawing tools. Heart tools in the top Drawing Tools menu to pin them here."
          className="p-1.5 text-neutral-500"
        >
          <Heart className="h-4 w-4 opacity-40" />
        </div>
      ) : (
        favorites.map((tool, index) => {
          const meta = getDrawingToolMeta(tool);
          if (!meta) return null;
          const Icon = meta.icon;
          const title = `${meta.label}${meta.shortcut ? ` (${meta.shortcut})` : ""}`;
          const active = drawingTool === tool;

          return (
            <div
              key={tool}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={cn(
                "relative rounded-lg transition-all",
                dropTargetIndex === index && "ring-1 ring-[#2962ff]",
                draggedIndex === index && "opacity-40",
              )}
            >
              <button
                type="button"
                title={title}
                onClick={() => onSelectTool(tool)}
                className={cn(
                  "p-1.5 rounded-lg transition-colors flex items-center justify-center",
                  active
                    ? "bg-[#2962ff]/20 text-[#2962ff]"
                    : "text-neutral-400 hover:text-neutral-200 hover:bg-[#2a2e39]",
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            </div>
          );
        })
      )}

      {/* Bottom tools divider */}
      <div className="my-0.5 w-full border-t border-[#2a2e39]" />

      {/* Reorganize toggle button */}
      <button
        type="button"
        title="Reorganize favorite tools (or double-click bar)"
        onClick={onOpenReorganize}
        className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-300 hover:bg-[#2a2e39] transition-colors"
      >
        <ArrowUpDown className="h-3.5 w-3.5" />
      </button>

      {/* Hide toolbar button */}
      <button
        type="button"
        title="Hide toolbar"
        onClick={onHide}
        className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-300 hover:bg-[#2a2e39] transition-colors"
      >
        <EyeOff className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

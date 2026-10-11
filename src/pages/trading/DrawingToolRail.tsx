import {
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronUp,
  EyeOff,
  GripVertical,
  Heart,
  MousePointer2,
  PenTool,
  RotateCcw,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useDragOffset } from "../../hooks/useDragOffset.ts";
import { useFavoriteDrawingTools } from "../../hooks/useFavoriteDrawingTools.ts";
import { cn } from "../../lib/utils.ts";
import type { DrawingTool } from "./constants.ts";
import { getDrawingToolMeta } from "./drawingToolMeta.ts";

export function DrawingToolRail({
  drawingTool,
  onDrawingTool,
}: {
  drawingTool: DrawingTool;
  onDrawingTool: (t: DrawingTool) => void;
}) {
  const [hidden, setHidden] = useState(false);
  const [isReorganizing, setIsReorganizing] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  const {
    favorites,
    removeFavorite,
    moveFavorite,
  } = useFavoriteDrawingTools();

  const ref = useRef<HTMLDivElement>(null);
  const drag = useDragOffset({
    storageKey: "project_quant:drawing-rail-offset",
    defaultCenterY: true,
  });

  // Close reorganize mode when clicking outside the panel
  useEffect(() => {
    if (!isReorganizing) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsReorganizing(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isReorganizing]);

  const select = (t: DrawingTool) => {
    if (isReorganizing) return;
    onDrawingTool(drawingTool === t ? "none" : t);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData("text/plain", String(index));
    e.dataTransfer.effectAllowed = "move";
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dropTargetIndex !== index) {
      setDropTargetIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      moveFavorite(draggedIndex, targetIndex);
    }
    setDraggedIndex(null);
    setDropTargetIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDropTargetIndex(null);
  };

  // Collapsed: a small restorable button where the rail was last positioned.
  if (hidden) {
    return (
      <button
        type="button"
        title="Show favorite drawing tools"
        onClick={() => setHidden(false)}
        style={drag.style}
        className="absolute left-2 top-1/2 z-20 rounded-xl border border-[#2a2e39] bg-[#1e222d]/90 p-2 text-neutral-400 shadow-xl backdrop-blur-md hover:text-[#2962ff] transition-colors"
      >
        <PenTool className="h-4 w-4" />
      </button>
    );
  }

  // ── Reorganize Mode ────────────────────────────────────────────────────────
  if (isReorganizing) {
    return (
      <div
        ref={ref}
        style={drag.style}
        onDoubleClick={() => setIsReorganizing(false)}
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
              onClick={drag.reset}
              className="p-1 rounded text-neutral-500 hover:text-neutral-200 hover:bg-[#2a2e39] transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
            <button
              type="button"
              title="Done reorganizing"
              onClick={() => setIsReorganizing(false)}
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

  // ── Standard Compact Toolbar ───────────────────────────────────────────────
  return (
    <div
      ref={ref}
      style={drag.style}
      onDoubleClick={() => setIsReorganizing(true)}
      className="absolute left-2 top-1/2 z-20 flex flex-col items-center gap-1 rounded-xl bg-[#1e222d]/90 border border-[#2a2e39] p-1 shadow-2xl backdrop-blur-md"
    >
      {/* Top drag handle */}
      <div
        onPointerDown={drag.onPointerDown}
        title="Drag to move • Double-click to reorganize tools"
        className="flex w-full cursor-move justify-center py-0.5 text-neutral-500 hover:text-neutral-300 transition-colors"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </div>

      {/* Default Cursor button */}
      <button
        type="button"
        title="Cursor / Selection"
        onClick={() => onDrawingTool("none")}
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
                onClick={() => select(tool)}
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
        onClick={() => setIsReorganizing(true)}
        className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-300 hover:bg-[#2a2e39] transition-colors"
      >
        <ArrowUpDown className="h-3.5 w-3.5" />
      </button>

      {/* Hide toolbar button */}
      <button
        type="button"
        title="Hide toolbar"
        onClick={() => setHidden(true)}
        className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-300 hover:bg-[#2a2e39] transition-colors"
      >
        <EyeOff className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

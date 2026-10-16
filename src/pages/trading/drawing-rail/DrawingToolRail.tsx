import { PenTool } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useDragOffset } from "../../../hooks/useDragOffset.ts";
import { useFavoriteDrawingTools } from "../../../hooks/useFavoriteDrawingTools.ts";
import type { DrawingTool } from "../constants.ts";
import type { DrawingToolRailProps } from "./types";
import { useRailReorder } from "./useRailReorder";
import { ReorganizePanel } from "./ReorganizePanel";
import { CompactRail } from "./CompactRail";

export function DrawingToolRail({
  drawingTool,
  onDrawingTool,
}: DrawingToolRailProps) {
  const [hidden, setHidden] = useState(false);
  const [isReorganizing, setIsReorganizing] = useState(false);

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

  const reorder = useRailReorder(moveFavorite);

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

  // Reorganize Mode
  if (isReorganizing) {
    return (
      <ReorganizePanel
        panelRef={ref}
        dragStyle={drag.style}
        onClose={() => setIsReorganizing(false)}
        onResetPosition={drag.reset}
        favorites={favorites}
        moveFavorite={moveFavorite}
        removeFavorite={removeFavorite}
        draggedIndex={reorder.draggedIndex}
        dropTargetIndex={reorder.dropTargetIndex}
        handleDragStart={reorder.handleDragStart}
        handleDragOver={reorder.handleDragOver}
        handleDrop={reorder.handleDrop}
        handleDragEnd={reorder.handleDragEnd}
      />
    );
  }

  // Standard Compact Toolbar
  return (
    <CompactRail
      panelRef={ref}
      dragStyle={drag.style}
      onPointerDown={drag.onPointerDown}
      onDoubleClick={() => setIsReorganizing(true)}
      onOpenReorganize={() => setIsReorganizing(true)}
      onHide={() => setHidden(true)}
      drawingTool={drawingTool}
      onSelectTool={select}
      favorites={favorites}
      draggedIndex={reorder.draggedIndex}
      dropTargetIndex={reorder.dropTargetIndex}
      handleDragStart={reorder.handleDragStart}
      handleDragOver={reorder.handleDragOver}
      handleDrop={reorder.handleDrop}
      handleDragEnd={reorder.handleDragEnd}
    />
  );
}

import { useMemo, useRef, useState } from "react";
import type { DrawingLine, Timeframe } from "../constants.ts";

export function useDrawingSelectionState(drawings: DrawingLine[], timeframe: Timeframe) {
  const [selectedDrawingIds, setSelectedDrawingIds] = useState<string[]>([]);
  const [showDrawingSettings, setShowDrawingSettings] = useState(false);
  const [showObjectTree, setShowObjectTree] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);

  const drawingMenuOpenedRef = useRef(false);
  const [chartMenu, setChartMenu] = useState<{ x: number; y: number; price: number | null } | null>(null);
  const [showChartSettings, setShowChartSettings] = useState(false);

  const visibleDrawings = useMemo(
    () => drawings.filter((d) => !d.hidden && (d.visibility !== "tf" || d.createdTf === timeframe)),
    [drawings, timeframe],
  );

  const selectedDrawing = useMemo(
    () =>
      selectedDrawingIds.length === 1
        ? (drawings.find((d) => d.id === selectedDrawingIds[0]) ?? null)
        : null,
    [drawings, selectedDrawingIds],
  );

  return {
    selectedDrawingIds,
    setSelectedDrawingIds,
    showDrawingSettings,
    setShowDrawingSettings,
    showObjectTree,
    setShowObjectTree,
    contextMenu,
    setContextMenu,
    drawingMenuOpenedRef,
    chartMenu,
    setChartMenu,
    showChartSettings,
    setShowChartSettings,
    visibleDrawings,
    selectedDrawing,
  };
}

import { useEffect, useRef, type RefObject } from "react";
import type { DrawingToolsManager } from "../../../lib/chart-plugins/drawing-tools/manager.ts";
import type { DrawingLine, DrawingTool, MagnetMode } from "../constants.ts";
import { DRAWING_STYLES_EVENT, getStyleDefaults } from "../drawingStyles.ts";

export interface DrawingManagerRefsParams {
  drawingTool: DrawingTool;
  visibleDrawings: DrawingLine[];
  magnetMode: MagnetMode;
  accountEquity: number;
  stayInDrawingMode: boolean;
  drawingManagerRef: RefObject<DrawingToolsManager | null>;
  onAddDrawing: (d: DrawingLine) => void;
  onUpdateDrawing?: (d: DrawingLine) => void;
  onRemoveDrawing?: (id: string) => void;
  onDrawingComplete?: () => void;
  onDrawingToolSelect?: (t: DrawingTool) => void;
  onUndoDrawing?: () => void;
  onRedoDrawing?: () => void;
}

export function useDrawingManagerRefs(params: DrawingManagerRefsParams) {
  const {
    drawingTool,
    visibleDrawings,
    magnetMode,
    accountEquity,
    stayInDrawingMode,
    drawingManagerRef,
    onAddDrawing,
    onUpdateDrawing,
    onRemoveDrawing,
    onDrawingComplete,
    onDrawingToolSelect,
    onUndoDrawing,
    onRedoDrawing,
  } = params;

  const drawingToolRef = useRef(drawingTool);
  const drawingsRef = useRef(visibleDrawings);
  const magnetRef = useRef(magnetMode);
  const stayInModeRef = useRef(stayInDrawingMode);
  const accountEquityRef = useRef(accountEquity);
  const styleDefaultsRef = useRef(getStyleDefaults());
  const onAddDrawingRef = useRef(onAddDrawing);
  const onUpdateDrawingRef = useRef(onUpdateDrawing);
  const onRemoveDrawingRef = useRef(onRemoveDrawing);
  const onDrawingCompleteRef = useRef(onDrawingComplete);
  const onDrawingToolSelectRef = useRef(onDrawingToolSelect);
  const onUndoDrawingRef = useRef(onUndoDrawing);
  const onRedoDrawingRef = useRef(onRedoDrawing);

  useEffect(() => {
    drawingToolRef.current = drawingTool;
    drawingManagerRef.current?.setTool(drawingTool);
  }, [drawingTool, drawingManagerRef]);

  useEffect(() => {
    drawingsRef.current = visibleDrawings;
    drawingManagerRef.current?.setDrawings(visibleDrawings);
  }, [visibleDrawings, drawingManagerRef]);

  useEffect(() => {
    magnetRef.current = magnetMode;
    drawingManagerRef.current?.setMagnetMode(magnetMode);
  }, [magnetMode, drawingManagerRef]);

  useEffect(() => {
    accountEquityRef.current = accountEquity;
    drawingManagerRef.current?.setAccountEquity(accountEquity);
  }, [accountEquity, drawingManagerRef]);

  useEffect(() => {
    const refresh = () => {
      styleDefaultsRef.current = getStyleDefaults();
      drawingManagerRef.current?.setStyleDefaults(styleDefaultsRef.current);
    };
    window.addEventListener(DRAWING_STYLES_EVENT, refresh);
    return () => window.removeEventListener(DRAWING_STYLES_EVENT, refresh);
  }, [drawingManagerRef]);

  useEffect(() => {
    stayInModeRef.current = stayInDrawingMode;
    drawingManagerRef.current?.setStayInDrawingMode(stayInDrawingMode);
  }, [stayInDrawingMode, drawingManagerRef]);

  useEffect(() => {
    onAddDrawingRef.current = onAddDrawing;
    onUpdateDrawingRef.current = onUpdateDrawing;
    onRemoveDrawingRef.current = onRemoveDrawing;
    onDrawingCompleteRef.current = onDrawingComplete;
    onDrawingToolSelectRef.current = onDrawingToolSelect;
    onUndoDrawingRef.current = onUndoDrawing;
    onRedoDrawingRef.current = onRedoDrawing;
  });

  return {
    drawingToolRef,
    drawingsRef,
    magnetRef,
    stayInModeRef,
    accountEquityRef,
    styleDefaultsRef,
    onAddDrawingRef,
    onUpdateDrawingRef,
    onRemoveDrawingRef,
    onDrawingCompleteRef,
    onDrawingToolSelectRef,
    onUndoDrawingRef,
    onRedoDrawingRef,
  };
}

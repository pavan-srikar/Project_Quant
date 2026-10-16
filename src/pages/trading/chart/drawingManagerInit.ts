import type { IChartApi, ISeriesApi } from "lightweight-charts";
import type { Dispatch, RefObject, SetStateAction } from "react";
import { DrawingToolsManager } from "../../../lib/chart-plugins/drawing-tools/manager.ts";
import type { Candle } from "../../../services/schemas.ts";
import {
  TF_INTERVAL_MS,
  type DrawingLine,
  type DrawingTool,
  type MagnetMode,
  type Timeframe,
} from "../constants.ts";

export interface DrawingManagerInitParams {
  chart: IChartApi;
  candleSeries: ISeriesApi<"Candlestick">;
  container: HTMLDivElement;
  timeframeRef: RefObject<Timeframe>;
  accountEquityRef: RefObject<number>;
  allCandlesRef: RefObject<Candle[]>;
  drawingToolRef: RefObject<DrawingTool>;
  drawingsRef: RefObject<DrawingLine[]>;
  magnetRef: RefObject<MagnetMode>;
  stayInModeRef: RefObject<boolean>;
  styleDefaultsRef: RefObject<any>;
  onAddDrawingRef: RefObject<(d: DrawingLine) => void>;
  onUpdateDrawingRef: RefObject<((d: DrawingLine) => void) | undefined>;
  onRemoveDrawingRef: RefObject<((id: string) => void) | undefined>;
  onDrawingCompleteRef: RefObject<(() => void) | undefined>;
  onDrawingToolSelectRef: RefObject<((t: DrawingTool) => void) | undefined>;
  onUndoDrawingRef: RefObject<(() => void) | undefined>;
  onRedoDrawingRef: RefObject<(() => void) | undefined>;
  setSelectedDrawingIds: Dispatch<SetStateAction<string[]>>;
  setShowDrawingSettings: Dispatch<SetStateAction<boolean>>;
  setContextMenu: Dispatch<SetStateAction<{ id: string; x: number; y: number } | null>>;
  drawingMenuOpenedRef: RefObject<boolean>;
}

export function initDrawingToolsManager(params: DrawingManagerInitParams): DrawingToolsManager {
  const {
    chart,
    candleSeries,
    container,
    timeframeRef,
    accountEquityRef,
    allCandlesRef,
    drawingToolRef,
    drawingsRef,
    magnetRef,
    stayInModeRef,
    styleDefaultsRef,
    onAddDrawingRef,
    onUpdateDrawingRef,
    onRemoveDrawingRef,
    onDrawingCompleteRef,
    onDrawingToolSelectRef,
    onUndoDrawingRef,
    onRedoDrawingRef,
    setSelectedDrawingIds,
    setShowDrawingSettings,
    setContextMenu,
    drawingMenuOpenedRef,
  } = params;

  const drawingManager = new DrawingToolsManager({
    chart,
    series: candleSeries,
    container,
    intervalSec: (TF_INTERVAL_MS[timeframeRef.current] ?? 60_000) / 1000,
    timeframe: timeframeRef.current,
    accountEquity: accountEquityRef.current,
    getCandles: () => allCandlesRef.current,
    callbacks: {
      onAdd: (d) => onAddDrawingRef.current(d),
      onUpdate: (d) => onUpdateDrawingRef.current?.(d),
      onRemove: (id) => onRemoveDrawingRef.current?.(id),
      onToolFinished: () => onDrawingCompleteRef.current?.(),
      onSelectionChange: (ids) => {
        setSelectedDrawingIds(ids);
        setShowDrawingSettings(false);
      },
      onRequestSettings: (id) => {
        setSelectedDrawingIds([id]);
        setShowDrawingSettings(true);
      },
      onContextMenu: (id, clientX, clientY) => {
        drawingMenuOpenedRef.current = true;
        setSelectedDrawingIds([id]);
        setContextMenu({ id, x: clientX, y: clientY });
      },
      onSelectTool: (t) => onDrawingToolSelectRef.current?.(t),
      onUndo: () => onUndoDrawingRef.current?.(),
      onRedo: () => onRedoDrawingRef.current?.(),
    },
  });

  drawingManager.setDrawings(drawingsRef.current);
  drawingManager.setTool(drawingToolRef.current);
  drawingManager.setMagnetMode(magnetRef.current);
  drawingManager.setStyleDefaults(styleDefaultsRef.current);
  drawingManager.setStayInDrawingMode(stayInModeRef.current);

  return drawingManager;
}

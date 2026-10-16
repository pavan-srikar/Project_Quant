import { useCallback, useEffect, useState } from "react";
import { useChartDrawings } from "../../hooks/useChartDrawings.ts";
import {
  getChartPreferencesFromStorage,
  updateChartPreferences,
  type useChartPreferences,
} from "../../hooks/useChartPreferences.ts";
import { INDICATOR_REGISTRY, type IndicatorType } from "../../lib/indicators.ts";
import type { DrawingTool, MagnetMode, Timeframe } from "../trading/constants.ts";

export interface UseTradingChartControlsParams {
  selectedSymbol: string;
  timeframe: Timeframe;
  chartPrefs: ReturnType<typeof useChartPreferences>;
  onBottomTabToIndicators: () => void;
}

export function useTradingChartControls({
  selectedSymbol,
  timeframe,
  chartPrefs,
  onBottomTabToIndicators,
}: UseTradingChartControlsParams) {
  // Indicators
  const [activeIndicators, setActiveIndicators] = useState<IndicatorType[]>(() => {
    const fromStorage = getChartPreferencesFromStorage().activeIndicators;
    return (fromStorage ?? []).filter((type) =>
      INDICATOR_REGISTRY.some((r) => r.type === type),
    );
  });
  const [showIndicatorMenu, setShowIndicatorMenu] = useState(false);

  // Synchronize if chartPrefs.activeIndicators changes externally
  useEffect(() => {
    if (chartPrefs.activeIndicators) {
      setActiveIndicators((prev) => {
        const isDifferent =
          prev.length !== chartPrefs.activeIndicators.length ||
          prev.some((ind, i) => ind !== chartPrefs.activeIndicators[i]);
        return isDifferent ? chartPrefs.activeIndicators : prev;
      });
    }
  }, [chartPrefs.activeIndicators]);

  const handleToggleIndicator = useCallback(
    (type: IndicatorType) => {
      setActiveIndicators((prev) => {
        const isAdding = !prev.includes(type);
        const next = isAdding ? [...prev, type] : prev.filter((t) => t !== type);
        updateChartPreferences({ activeIndicators: next });
        if (isAdding) {
          const cfg = INDICATOR_REGISTRY.find((r) => r.type === type);
          if (cfg && cfg.pane === "below") {
            onBottomTabToIndicators();
          }
        }
        return next;
      });
    },
    [onBottomTabToIndicators],
  );

  const handleSetIndicators = useCallback((indicators: IndicatorType[]) => {
    const valid = indicators.filter((type) =>
      INDICATOR_REGISTRY.some((r) => r.type === type),
    );
    setActiveIndicators(valid);
    updateChartPreferences({ activeIndicators: valid });
  }, []);

  const handleClearIndicators = useCallback(() => {
    setActiveIndicators([]);
    updateChartPreferences({ activeIndicators: [] });
  }, []);

  // Drawing tools
  const [drawingTool, setDrawingTool] = useState<DrawingTool>("none");
  const {
    drawings,
    addDrawing,
    updateDrawing,
    removeDrawing,
    clearDrawings,
    undo: undoDrawing,
    redo: redoDrawing,
  } = useChartDrawings(selectedSymbol, timeframe);

  // Plugins
  const [activePlugins, setActivePlugins] = useState<string[]>(
    () => getChartPreferencesFromStorage().activePlugins,
  );
  const handleTogglePlugin = useCallback((id: string) => {
    setActivePlugins((prev) => {
      const next = prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id];
      updateChartPreferences({ activePlugins: next });
      return next;
    });
  }, []);
  const handleSetPlugins = useCallback((ids: string[]) => {
    setActivePlugins(ids);
    updateChartPreferences({ activePlugins: ids });
  }, []);

  // Magnet mode
  const cycleMagnetMode = useCallback(() => {
    const order: MagnetMode[] = ["none", "weak", "strong"];
    const next = order[(order.indexOf(chartPrefs.magnetMode) + 1) % order.length] ?? "none";
    updateChartPreferences({ magnetMode: next });
  }, [chartPrefs.magnetMode]);

  return {
    activeIndicators,
    setActiveIndicators: handleSetIndicators,
    showIndicatorMenu,
    setShowIndicatorMenu,
    handleToggleIndicator,
    handleClearIndicators,
    drawingTool,
    setDrawingTool,
    drawings,
    addDrawing,
    updateDrawing,
    removeDrawing,
    clearDrawings,
    undoDrawing,
    redoDrawing,
    activePlugins,
    handleTogglePlugin,
    handleSetPlugins,
    cycleMagnetMode,
  };
}

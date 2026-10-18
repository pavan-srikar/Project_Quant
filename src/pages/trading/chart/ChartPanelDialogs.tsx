import type { IndicatorType } from "../../../lib/indicators.ts";
import type { useChartPreferences } from "../../../hooks/useChartPreferences.ts";
import type { DrawingLine, Timeframe } from "../constants.ts";
import { ChartDialogs } from "./ChartDialogs.tsx";
import type { TickData } from "./types.ts";
import type { useChartContextMenuActions } from "./useChartContextMenuActions.ts";
import type { useChartIndicatorSettingsState } from "./useChartIndicatorSettingsState.ts";
import type { useDrawingSelectionState } from "./useDrawingSelectionState.ts";

export interface ChartPanelDialogsProps {
  selection: ReturnType<typeof useDrawingSelectionState>;
  indicators: ReturnType<typeof useChartIndicatorSettingsState>;
  menuActions: ReturnType<typeof useChartContextMenuActions>;
  timeframe: Timeframe;
  pipDigits: number;
  selectedSymbol: string;
  tick?: TickData;
  activeIndicators: IndicatorType[];
  chartPrefs: ReturnType<typeof useChartPreferences>;
  isDark: boolean;
  activePlugins: string[];
  accountId?: string | null;
  onUpdateDrawing?: (d: DrawingLine) => void;
  onRemoveDrawing?: (id: string) => void;
  onQuickOrder?: (side: "BUY" | "SELL", type: "LIMIT" | "STOP", price: number) => void;
  onClearDrawings?: () => void;
  onClearIndicators?: () => void;
  onTogglePlugin?: (id: string) => void;
  drawings: DrawingLine[];
}

export function ChartPanelDialogs({
  selection,
  indicators,
  menuActions,
  timeframe,
  pipDigits,
  selectedSymbol,
  tick,
  activeIndicators,
  chartPrefs,
  isDark,
  activePlugins,
  accountId,
  onUpdateDrawing,
  onRemoveDrawing,
  onQuickOrder,
  onClearDrawings,
  onClearIndicators,
  onTogglePlugin,
  drawings,
}: ChartPanelDialogsProps) {
  return (
    <ChartDialogs
      selectedDrawing={selection.selectedDrawing}
      showDrawingSettings={selection.showDrawingSettings}
      timeframe={timeframe}
      onUpdateDrawing={onUpdateDrawing}
      onRemoveDrawing={onRemoveDrawing}
      onCloneDrawing={menuActions.handleCloneDrawing}
      onReorderDrawing={menuActions.handleReorderDrawing}
      setShowDrawingSettings={selection.setShowDrawingSettings}
      contextMenu={selection.contextMenu}
      setContextMenu={selection.setContextMenu}
      drawings={drawings}
      visibleDrawings={selection.visibleDrawings}
      selectedDrawingIds={selection.selectedDrawingIds}
      pipDigits={pipDigits}
      showObjectTree={selection.showObjectTree}
      setShowObjectTree={selection.setShowObjectTree}
      onObjectTreeSelect={menuActions.handleObjectTreeSelect}
      chartMenu={selection.chartMenu}
      setChartMenu={selection.setChartMenu}
      selectedSymbol={selectedSymbol}
      tick={tick}
      activeIndicators={activeIndicators}
      onSelectIndicatorSettings={(type) => indicators.setIndicatorSettingsModalType(type)}
      onResetView={menuActions.handleResetView}
      onToggleAutoScale={menuActions.handleToggleAutoScale}
      onCopyPrice={menuActions.handleCopyPrice}
      onAddAlert={menuActions.handleAddAlert}
      onQuickOrder={onQuickOrder}
      onClearDrawings={onClearDrawings}
      onClearIndicators={onClearIndicators}
      showChartSettings={selection.showChartSettings}
      setShowChartSettings={selection.setShowChartSettings}
      chartPrefs={chartPrefs}
      isDark={isDark}
      activePlugins={activePlugins}
      onTogglePlugin={onTogglePlugin}
      accountId={accountId}
      indicatorSettingsModalType={indicators.indicatorSettingsModalType}
      setIndicatorSettingsModalType={indicators.setIndicatorSettingsModalType}
      indicatorSettings={indicators.indicatorSettings}
      updateIndicatorSettings={indicators.updateIndicatorSettings}
      resetIndicatorSettings={indicators.resetIndicatorSettings}
    />
  );
}

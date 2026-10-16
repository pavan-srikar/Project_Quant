import type { Dispatch, SetStateAction } from "react";
import { IndicatorSettingsModal } from "../../../components/IndicatorSettingsModal.tsx";
import type { useChartPreferences } from "../../../hooks/useChartPreferences.ts";
import type { IndicatorSettings } from "../../../hooks/useIndicatorSettings.ts";
import type { IndicatorType } from "../../../lib/indicators.ts";
import type { DrawingLine } from "../constants.ts";
import { ChartContextMenu } from "../ChartContextMenu.tsx";
import { ChartSettingsDialog } from "../ChartSettingsDialog.tsx";
import { DrawingContextMenu } from "../DrawingToolsOverlay.tsx";
import {
  DrawingOverlays,
  ObjectTreeOverlay,
} from "./ChartOverlaysContainer.tsx";
import type { TickData } from "./types.ts";

export interface ChartDialogsProps {
  selectedDrawing: DrawingLine | null;
  showDrawingSettings: boolean;
  timeframe: string;
  onUpdateDrawing?: (d: DrawingLine) => void;
  onRemoveDrawing?: (id: string) => void;
  onCloneDrawing: () => void;
  onReorderDrawing: (d: DrawingLine, dir: "front" | "back") => void;
  setShowDrawingSettings: Dispatch<SetStateAction<boolean>>;
  contextMenu: { id: string; x: number; y: number } | null;
  setContextMenu: Dispatch<SetStateAction<{ id: string; x: number; y: number } | null>>;
  drawings: DrawingLine[];
  visibleDrawings: DrawingLine[];
  selectedDrawingIds: string[];
  pipDigits: number;
  showObjectTree: boolean;
  setShowObjectTree: Dispatch<SetStateAction<boolean>>;
  onObjectTreeSelect: (d: DrawingLine) => void;
  chartMenu: { x: number; y: number; price: number | null } | null;
  setChartMenu: Dispatch<SetStateAction<{ x: number; y: number; price: number | null } | null>>;
  selectedSymbol: string;
  tick?: TickData;
  activeIndicators: IndicatorType[];
  onSelectIndicatorSettings: (type: IndicatorType) => void;
  onResetView: () => void;
  onCopyPrice: (price: number) => void;
  onAddAlert: (price: number) => void;
  onQuickOrder?: (side: "BUY" | "SELL", type: "LIMIT" | "STOP", price: number) => void;
  onClearDrawings?: () => void;
  onClearIndicators?: () => void;
  showChartSettings: boolean;
  setShowChartSettings: Dispatch<SetStateAction<boolean>>;
  chartPrefs: ReturnType<typeof useChartPreferences>;
  isDark: boolean;
  activePlugins: string[];
  onTogglePlugin?: (id: string) => void;
  accountId?: string | null;
  indicatorSettingsModalType: IndicatorType | null;
  setIndicatorSettingsModalType: Dispatch<SetStateAction<IndicatorType | null>>;
  indicatorSettings: Record<string, IndicatorSettings>;
  updateIndicatorSettings: (type: IndicatorType, settings: Partial<IndicatorSettings>) => void;
  resetIndicatorSettings: (type: IndicatorType) => void;
}

export function ChartDialogs({
  selectedDrawing,
  showDrawingSettings,
  timeframe,
  onUpdateDrawing,
  onRemoveDrawing,
  onCloneDrawing,
  onReorderDrawing,
  setShowDrawingSettings,
  contextMenu,
  setContextMenu,
  drawings,
  visibleDrawings,
  selectedDrawingIds,
  pipDigits,
  showObjectTree,
  setShowObjectTree,
  onObjectTreeSelect,
  chartMenu,
  setChartMenu,
  selectedSymbol,
  tick,
  activeIndicators,
  onSelectIndicatorSettings,
  onResetView,
  onCopyPrice,
  onAddAlert,
  onQuickOrder,
  onClearDrawings,
  onClearIndicators,
  showChartSettings,
  setShowChartSettings,
  chartPrefs,
  isDark,
  activePlugins,
  onTogglePlugin,
  accountId,
  indicatorSettingsModalType,
  setIndicatorSettingsModalType,
  indicatorSettings,
  updateIndicatorSettings,
  resetIndicatorSettings,
}: ChartDialogsProps) {
  return (
    <>
      <DrawingOverlays
        drawing={selectedDrawing}
        showSettings={showDrawingSettings}
        currentTf={timeframe}
        onUpdate={(d) => onUpdateDrawing?.(d)}
        onClone={onCloneDrawing}
        onRemove={() => selectedDrawing && onRemoveDrawing?.(selectedDrawing.id)}
        onOpenSettings={() => setShowDrawingSettings(true)}
        onCloseSettings={() => setShowDrawingSettings(false)}
      />

      {contextMenu && selectedDrawing && (
        <DrawingContextMenu
          drawing={selectedDrawing}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onSettings={() => setShowDrawingSettings(true)}
          onDuplicate={onCloneDrawing}
          onReorder={(dir) => onReorderDrawing(selectedDrawing, dir)}
          onToggleLock={() =>
            onUpdateDrawing?.({ ...selectedDrawing, locked: !selectedDrawing.locked })
          }
          onToggleAlert={() =>
            onUpdateDrawing?.({ ...selectedDrawing, alertEnabled: !selectedDrawing.alertEnabled })
          }
          onRemove={() => onRemoveDrawing?.(selectedDrawing.id)}
        />
      )}

      <ObjectTreeOverlay
        drawings={drawings}
        selectedIds={selectedDrawingIds}
        pipDigits={pipDigits}
        currentTf={timeframe}
        open={showObjectTree}
        onToggle={() => setShowObjectTree((v) => !v)}
        onSelect={onObjectTreeSelect}
        onUpdate={(d) => onUpdateDrawing?.(d)}
        onRemove={(id) => onRemoveDrawing?.(id)}
        onReorder={onReorderDrawing}
      />

      {chartMenu && (
        <ChartContextMenu
          x={chartMenu.x}
          y={chartMenu.y}
          price={chartMenu.price}
          pipDigits={pipDigits}
          symbol={selectedSymbol}
          tick={tick}
          drawingsCount={visibleDrawings.length}
          indicatorsCount={activeIndicators.length}
          activeIndicatorsList={activeIndicators}
          onSelectIndicatorSettings={onSelectIndicatorSettings}
          onClose={() => setChartMenu(null)}
          onResetView={onResetView}
          onCopyPrice={onCopyPrice}
          onAddAlert={onAddAlert}
          onQuickOrder={onQuickOrder}
          onOpenObjectTree={() => setShowObjectTree(true)}
          onRemoveAllDrawings={onClearDrawings}
          onClearIndicators={onClearIndicators}
          onOpenSettings={() => setShowChartSettings(true)}
        />
      )}

      <ChartSettingsDialog
        open={showChartSettings}
        onClose={() => setShowChartSettings(false)}
        prefs={chartPrefs}
        isDark={isDark}
        activePlugins={activePlugins}
        onTogglePlugin={onTogglePlugin}
        hasAccount={!!accountId}
      />

      {indicatorSettingsModalType && indicatorSettings[indicatorSettingsModalType] && (
        <IndicatorSettingsModal
          isOpen={true}
          type={indicatorSettingsModalType}
          settings={indicatorSettings[indicatorSettingsModalType]}
          onSave={(type, updates) => {
            updateIndicatorSettings(type, updates);
            setIndicatorSettingsModalType(null);
          }}
          onReset={(type) => {
            resetIndicatorSettings(type);
          }}
          onClose={() => setIndicatorSettingsModalType(null)}
        />
      )}
    </>
  );
}

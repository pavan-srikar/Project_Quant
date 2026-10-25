import { useMemo, useState } from "react";
import { IndicatorSettingsModal } from "../../../components/IndicatorSettingsModal.tsx";
import { useIndicatorSettings } from "../../../hooks/useIndicatorSettings.ts";
import { INDICATOR_REGISTRY, type IndicatorType } from "../../../lib/indicators.ts";
import { getCustomPineIndicators } from "../../../lib/pinescript";
import { IndicatorContextMenu } from "./IndicatorContextMenu.tsx";
import { IndicatorPane } from "./IndicatorPane.tsx";
import type {
  BottomIndicatorsPanelProps,
  ContextMenuState,
} from "./types.ts";

export function BottomIndicatorsPanel({
  candles,
  activeIndicators,
  onToggleIndicator,
  isDark = true,
  timeframe = "15m",
  mainChart,
}: BottomIndicatorsPanelProps) {
  const {
    settings: allSettings,
    updateIndicatorSettings,
    resetIndicatorSettings,
  } = useIndicatorSettings();

  const [settingsModalType, setSettingsModalType] = useState<IndicatorType | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  // Filter active indicators to only those designated for below / sub-chart
  const activeBelow = useMemo(() => {
    const customScripts = getCustomPineIndicators();
    return activeIndicators.filter((t) => {
      if (t.startsWith("pine_")) {
        const s = customScripts.find((cs) => cs.id === t);
        return s ? !s.overlay : false;
      }
      const config = INDICATOR_REGISTRY.find((r) => r.type === t);
      return config && config.pane === "below";
    });
  }, [activeIndicators]);

  const fallbackSettings = { color: "#2962ff", visible: true };

  return (
    <div className="h-full w-full flex flex-col bg-[#131722] relative overflow-hidden">
      {activeBelow.length === 0 ? (
        <div className="flex-1 min-h-[90px] w-full flex items-center justify-center p-6 text-center select-none">
          <p className="text-xs text-neutral-400 font-medium">
            No indicators active. Add indicators from the Indicators menu on the top toolbar.
          </p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 w-full flex flex-col divide-y divide-[#2962ff] overflow-hidden">
          {activeBelow.map((type, index) => (
            <IndicatorPane
              key={type}
              type={type}
              candles={candles}
              settings={allSettings[type] ?? fallbackSettings}
              isDark={isDark}
              timeframe={timeframe}
              mainChart={mainChart}
              showTimeScale={index === activeBelow.length - 1}
              onOpenSettings={setSettingsModalType}
              onRemoveIndicator={onToggleIndicator}
              onContextMenu={setContextMenu}
            />
          ))}
        </div>
      )}

      {/* Context Menu */}
      <IndicatorContextMenu
        contextMenu={contextMenu}
        onClose={() => setContextMenu(null)}
        onOpenSettings={setSettingsModalType}
        onResetSettings={resetIndicatorSettings}
        onRemoveIndicator={onToggleIndicator}
      />

      {/* Settings Modal */}
      {settingsModalType && (
        <IndicatorSettingsModal
          isOpen={true}
          type={settingsModalType}
          settings={allSettings[settingsModalType] ?? fallbackSettings}
          onSave={(type, updates) => {
            updateIndicatorSettings(type, updates);
            setSettingsModalType(null);
          }}
          onReset={(type) => {
            resetIndicatorSettings(type);
          }}
          onClose={() => setSettingsModalType(null)}
        />
      )}
    </div>
  );
}

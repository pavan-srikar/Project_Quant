import { useCallback, useMemo, useState } from "react";
import { useIndicatorSettings } from "../../../hooks/useIndicatorSettings.ts";
import { INDICATOR_REGISTRY, type IndicatorType } from "../../../lib/indicators.ts";

export function useChartIndicatorSettingsState(activeIndicators: IndicatorType[]) {
  const {
    settings: indicatorSettings,
    updateIndicatorSettings,
    resetIndicatorSettings,
  } = useIndicatorSettings();
  const [indicatorSettingsModalType, setIndicatorSettingsModalType] = useState<IndicatorType | null>(null);

  const overlayIndicators = useMemo(() => {
    return activeIndicators.filter((t) => {
      const cfg = INDICATOR_REGISTRY.find((r) => r.type === t);
      return cfg && cfg.pane === "overlay";
    });
  }, [activeIndicators]);

  const handleToggleIndicatorVisibility = useCallback(
    (type: IndicatorType) => {
      const cur = indicatorSettings[type]?.visible !== false;
      updateIndicatorSettings(type, { visible: !cur });
    },
    [indicatorSettings, updateIndicatorSettings],
  );

  return {
    indicatorSettings,
    updateIndicatorSettings,
    resetIndicatorSettings,
    indicatorSettingsModalType,
    setIndicatorSettingsModalType,
    overlayIndicators,
    handleToggleIndicatorVisibility,
  };
}

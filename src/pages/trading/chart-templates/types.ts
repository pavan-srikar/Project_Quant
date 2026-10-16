import type { IndicatorType } from "../../../lib/indicators.ts";

export interface ChartTemplatesMenuProps {
  activeIndicators: IndicatorType[];
  onSetIndicators: (indicators: IndicatorType[]) => void;
  activePlugins: string[];
  onSetPlugins: (ids: string[]) => void;
}

export const AUTOSAVE_DEBOUNCE_MS = 1_500;

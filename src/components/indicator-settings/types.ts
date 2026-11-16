import type { IndicatorType } from "../../lib/indicators.ts";
import type { IndicatorSettings } from "../../hooks/useIndicatorSettings.ts";

export interface IndicatorSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: IndicatorType | null;
  settings: IndicatorSettings;
  onSave: (type: IndicatorType, updates: Partial<IndicatorSettings>) => void;
  onReset: (type: IndicatorType) => void;
  onPreview?: (type: IndicatorType, updates: Partial<IndicatorSettings>) => void;
}

export const COLOR_PALETTE = [
  "#2962ff", // TV Blue
  "#7e57c2", // Purple
  "#26a69a", // Mint Green
  "#00bcd4", // Cyan
  "#f0b90b", // Yellow / Gold
  "#ff9800", // Amber
  "#ff7043", // Orange
  "#ef5350", // Red
  "#e91e63", // Magenta
  "#d1d4dc", // Silver
];

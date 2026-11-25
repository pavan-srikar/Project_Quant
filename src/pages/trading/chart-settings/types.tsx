import { type ReactNode } from "react";
import { CandlestickChart, Clock, Crosshair, Palette } from "lucide-react";
import type { ChartPreferences } from "../../../hooks/useChartPreferences.ts";

export interface ChartSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  prefs: ChartPreferences;
  isDark: boolean;
  activePlugins: string[];
  onTogglePlugin?: (id: string) => void;
  hasAccount?: boolean;
}

export type TabId = "appearance" | "colors" | "trading" | "events";

export const TABS: Array<{ id: TabId; label: string; icon: ReactNode }> = [
  { id: "appearance", label: "Appearance", icon: <CandlestickChart className="h-3.5 w-3.5" /> },
  { id: "colors", label: "Colors", icon: <Palette className="h-3.5 w-3.5" /> },
  { id: "trading", label: "Trading", icon: <Crosshair className="h-3.5 w-3.5" /> },
  { id: "events", label: "Sessions", icon: <Clock className="h-3.5 w-3.5" /> },
];

/** Per-tab "Reset to defaults" payloads. Events tab has none (plugin-driven). */
export const RESET_BY_TAB: Partial<Record<TabId, Partial<ChartPreferences>>> = {
  appearance: {
    showWicks: true,
    showCandleBorders: true,
    showVolume: true,
    showGrid: false,
    showWatermark: false,
    showCountdown: true,
    showOhlcLegend: true,
  },
  colors: {
    candleUpColor: "",
    candleDownColor: "",
    colorBackground: "",
    colorGrid: "",
    colorScaleText: "",
    colorCrosshair: "",
    colorBidLine: "",
    colorAskLine: "",
    colorPositionLong: "",
    colorPositionShort: "",
    colorOrderLine: "",
    colorTpLine: "",
    colorSlLine: "",
  },
  trading: { showBidLine: false, showAskLine: false, overlayPositionsOnChart: true },
};

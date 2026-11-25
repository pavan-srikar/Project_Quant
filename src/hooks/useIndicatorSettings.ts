import { useState, useEffect, useCallback } from "react";
import type { IndicatorType } from "../lib/indicators.ts";
import { getCustomPineIndicators, parsePineScript } from "../lib/pinescript";

export interface EmaSlotConfig {
  enabled: boolean;
  period: number;
  color: string;
}

export interface IndicatorSettings {
  period?: number;
  fast?: number;
  slow?: number;
  signal?: number;
  stdDev?: number;
  kPeriod?: number;
  dPeriod?: number;
  overbought?: number;
  oversold?: number;
  color: string;
  signalColor?: string;
  histUpColor?: string;
  histDownColor?: string;
  upperColor?: string;
  lowerColor?: string;
  lineWidth?: number;
  visible?: boolean;
  emaSlots?: EmaSlotConfig[];
  pineInputs?: Record<string, any>;
  plotVisibility?: Record<string, boolean>;
  plotColors?: Record<string, string>;
  plotLineWidths?: Record<string, number>;
  plotStyles?: Record<string, "solid" | "dashed" | "dotted">;
  showPolylines?: boolean;
  showBoxes?: boolean;
  showLines?: boolean;
  precision?: string;
  labelsOnPriceScale?: boolean;
  valuesInStatusLine?: boolean;
  inputsInStatusLine?: boolean;
  visibilityTimeframes?: Record<string, boolean>;
}

export const DEFAULT_INDICATOR_SETTINGS: Record<IndicatorType, IndicatorSettings> = {
  SMA: {
    period: 20,
    color: "#f0b90b",
    lineWidth: 1.5,
    visible: true,
  },
  EMA: {
    period: 20,
    color: "#e377c2",
    lineWidth: 1.5,
    visible: true,
    emaSlots: [
      { enabled: true, period: 20, color: "#e377c2" },
      { enabled: false, period: 50, color: "#2962ff" },
      { enabled: false, period: 100, color: "#ff9800" },
      { enabled: false, period: 200, color: "#00bcd4" },
      { enabled: false, period: 9, color: "#9c27b0" },
    ],
  },
  RSI: {
    period: 14,
    overbought: 70,
    oversold: 30,
    color: "#7e57c2",
    lineWidth: 2,
    visible: true,
  },
  MACD: {
    fast: 12,
    slow: 26,
    signal: 9,
    color: "#2962ff",
    signalColor: "#ff6d00",
    histUpColor: "#26a69a",
    histDownColor: "#ef5350",
    lineWidth: 1.5,
    visible: true,
  },
  BOLL: {
    period: 20,
    stdDev: 2,
    color: "#2962ff",
    upperColor: "rgba(41, 98, 255, 0.5)",
    lowerColor: "rgba(41, 98, 255, 0.5)",
    lineWidth: 1,
    visible: true,
  },
  ATR: {
    period: 14,
    color: "#ff7043",
    lineWidth: 1.5,
    visible: true,
  },
  STOCH: {
    kPeriod: 14,
    dPeriod: 3,
    overbought: 80,
    oversold: 20,
    color: "#2962ff",
    signalColor: "#ff6d00",
    lineWidth: 1.5,
    visible: true,
  },
  VWAP: {
    color: "#ff9800",
    lineWidth: 1.5,
    visible: true,
  },
  CCI: {
    period: 20,
    color: "#26c6da",
    lineWidth: 1.5,
    visible: true,
  },
  WR: {
    period: 14,
    color: "#ffca28",
    lineWidth: 1.5,
    visible: true,
  },
  VOL: {
    color: "#d1d4dc",
    histUpColor: "rgba(209, 212, 220, 0.4)",
    histDownColor: "rgba(93, 96, 107, 0.4)",
    lineWidth: 1,
    visible: true,
  },
};

const STORAGE_KEY = "project_quant_indicator_settings";
const LEGACY_STORAGE_KEY = "opencharts_indicator_settings";
const EVENT_NAME = "project_quant_indicator_settings_updated";

export function getStoredIndicatorSettings(): Record<IndicatorType, IndicatorSettings> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_INDICATOR_SETTINGS };
    const parsed = JSON.parse(raw);
    const result: Record<string, IndicatorSettings> = { ...DEFAULT_INDICATOR_SETTINGS };
    for (const key of Object.keys(DEFAULT_INDICATOR_SETTINGS) as IndicatorType[]) {
      const def = DEFAULT_INDICATOR_SETTINGS[key];
      if (def && parsed[key]) {
        result[key] = { ...def, ...parsed[key] };
      }
    }
    // Retain settings for custom Pine Script indicators
    for (const key of Object.keys(parsed)) {
      if (!(key in DEFAULT_INDICATOR_SETTINGS) && parsed[key]) {
        result[key] = parsed[key];
      }
    }
    if (result.VOL) {
      if (result.VOL.histUpColor === "#26a69a" || result.VOL.color === "#26a69a") {
        result.VOL.histUpColor = "rgba(209, 212, 220, 0.4)";
        result.VOL.color = "#d1d4dc";
      }
      if (result.VOL.histDownColor === "#ef5350") {
        result.VOL.histDownColor = "rgba(93, 96, 107, 0.4)";
      }
    }
    if (result.EMA && (!result.EMA.emaSlots || result.EMA.emaSlots.length === 0)) {
      result.EMA.emaSlots = [
        { enabled: true, period: result.EMA.period ?? 20, color: result.EMA.color || "#e377c2" },
        { enabled: false, period: 50, color: "#2962ff" },
        { enabled: false, period: 100, color: "#ff9800" },
        { enabled: false, period: 200, color: "#00bcd4" },
        { enabled: false, period: 9, color: "#9c27b0" },
      ];
    }
    return result as Record<IndicatorType, IndicatorSettings>;
  } catch {
    return { ...DEFAULT_INDICATOR_SETTINGS };
  }
}

export function saveIndicatorSettings(
  type: IndicatorType,
  updates: Partial<IndicatorSettings>,
): Record<IndicatorType, IndicatorSettings> {
  const current = getStoredIndicatorSettings();
  const cur = current[type] ?? { color: "#2962ff", visible: true };
  const updatedSetting: IndicatorSettings = {
    ...cur,
    ...updates,
  };
  const next: Record<IndicatorType, IndicatorSettings> = {
    ...current,
    [type]: updatedSetting,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { type, settings: updatedSetting } }));
  return next;
}

export function resetIndicatorSettings(type: IndicatorType): Record<IndicatorType, IndicatorSettings> {
  const current = getStoredIndicatorSettings();
  let def: IndicatorSettings | undefined = DEFAULT_INDICATOR_SETTINGS[type];
  if (!def && type.startsWith("pine_")) {
    const custom = getCustomPineIndicators().find((c) => c.id === type);
    if (custom) {
      const parsed = parsePineScript(custom.code);
      const defaultInputs: Record<string, any> = {};
      for (const inp of parsed.inputs) {
        defaultInputs[inp.id] = inp.defval;
      }
      def = {
        color: custom.color || "#2962ff",
        visible: true,
        pineInputs: defaultInputs,
      };
    }
  }
  if (!def) {
    def = { color: "#2962ff", visible: true };
  }
  const next: Record<IndicatorType, IndicatorSettings> = {
    ...current,
    [type]: { ...def },
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { type, settings: def } }));
  return next;
}

export function useIndicatorSettings() {
  const [settings, setSettings] = useState<Record<IndicatorType, IndicatorSettings>>(() =>
    getStoredIndicatorSettings(),
  );

  useEffect(() => {
    const handleUpdate = () => {
      setSettings(getStoredIndicatorSettings());
    };
    window.addEventListener(EVENT_NAME, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(EVENT_NAME, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const update = useCallback((type: IndicatorType, updates: Partial<IndicatorSettings>) => {
    const updated = saveIndicatorSettings(type, updates);
    setSettings(updated);
  }, []);

  const reset = useCallback((type: IndicatorType) => {
    const resetSettings = resetIndicatorSettings(type);
    setSettings(resetSettings);
  }, []);

  return { settings, updateIndicatorSettings: update, resetIndicatorSettings: reset };
}

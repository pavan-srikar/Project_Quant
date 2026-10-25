import { Sliders, X } from "lucide-react";
import type { IndicatorSettings } from "../../../hooks/useIndicatorSettings.ts";
import { INDICATOR_REGISTRY, type IndicatorType } from "../../../lib/indicators.ts";
import { cn } from "../../../lib/utils.ts";
import type { ContextMenuState, IndicatorCalculatedData } from "./types.ts";

import { getCustomPineIndicators } from "../../../lib/pinescript";

export interface IndicatorHeaderProps {
  type: IndicatorType;
  settings?: IndicatorSettings;
  indicatorData: IndicatorCalculatedData;
  crosshairTime?: number | null;
  onOpenSettings: (type: IndicatorType) => void;
  onRemoveIndicator: (type: IndicatorType) => void;
  onContextMenu: (state: ContextMenuState) => void;
}

function getIndicatorTitle(type: IndicatorType, settings?: IndicatorSettings): string {
  if (type === "RSI") return `RSI ${settings?.period ?? 14} close`;
  if (type === "MACD") return `MACD ${settings?.fast ?? 12} ${settings?.slow ?? 26} ${settings?.signal ?? 9}`;
  if (type === "ATR") return `ATR ${settings?.period ?? 14}`;
  if (type === "STOCH") return `Stoch ${settings?.kPeriod ?? 14} ${settings?.dPeriod ?? 3}`;
  if (type === "CCI") return `CCI ${settings?.period ?? 20}`;
  if (type === "WR") return `%R ${settings?.period ?? 14}`;
  if (type.startsWith("pine_")) {
    const custom = getCustomPineIndicators().find((c) => c.id === type);
    return custom?.name || "Pine Script";
  }
  return type;
}

function getIndicatorValues(
  indicatorData: IndicatorCalculatedData,
  time?: number | null,
): { label: string; value: string; color?: string }[] {
  if (!indicatorData) return [];

  const findVal = (pts: { time: number; value: number }[]) => {
    if (pts.length === 0) return null;
    if (time != null) {
      const match = pts.find((p) => p.time === time);
      if (match !== undefined) return match.value;
    }
    return pts[pts.length - 1]?.value ?? null;
  };

  switch (indicatorData.type) {
    case "RSI": {
      const v = findVal(indicatorData.data);
      return v != null ? [{ label: "", value: v.toFixed(2), color: "#7e57c2" }] : [];
    }
    case "MACD": {
      const m = findVal(indicatorData.data.macd);
      const s = findVal(indicatorData.data.signal);
      const h = findVal(indicatorData.data.histogram);
      const res: { label: string; value: string; color?: string }[] = [];
      if (m != null) res.push({ label: "", value: m.toFixed(2), color: "#2962ff" });
      if (s != null) res.push({ label: "", value: s.toFixed(2), color: "#ff9800" });
      if (h != null) {
        res.push({
          label: "",
          value: (h >= 0 ? "+" : "") + h.toFixed(2),
          color: h >= 0 ? "#26a69a" : "#ef5350",
        });
      }
      return res;
    }
    case "STOCH": {
      const k = findVal(indicatorData.data.k);
      const d = findVal(indicatorData.data.d);
      const res: { label: string; value: string; color?: string }[] = [];
      if (k != null) res.push({ label: "K", value: k.toFixed(2), color: "#2962ff" });
      if (d != null) res.push({ label: "D", value: d.toFixed(2), color: "#ff9800" });
      return res;
    }
    case "ATR": {
      const v = findVal(indicatorData.data);
      return v != null ? [{ label: "", value: v.toFixed(2), color: "#2962ff" }] : [];
    }
    case "CCI": {
      const v = findVal(indicatorData.data);
      return v != null ? [{ label: "", value: v.toFixed(2), color: "#2962ff" }] : [];
    }
    case "WR": {
      const v = findVal(indicatorData.data);
      return v != null ? [{ label: "", value: v.toFixed(2), color: "#2962ff" }] : [];
    }
    default: {
      if (indicatorData && Array.isArray((indicatorData as any).data)) {
        const v = findVal((indicatorData as any).data);
        return v != null ? [{ label: "", value: v.toFixed(2), color: "#2962ff" }] : [];
      }
      return [];
    }
  }
}

export function IndicatorHeader({
  type,
  settings,
  indicatorData,
  crosshairTime,
  onOpenSettings,
  onRemoveIndicator,
  onContextMenu,
}: IndicatorHeaderProps) {
  const values = getIndicatorValues(indicatorData, crosshairTime);
  const cfg = INDICATOR_REGISTRY.find((r) => r.type === type);
  const isVisible = settings?.visible !== false;
  const color = settings?.color || cfg?.color || "#2962ff";
  const title = getIndicatorTitle(type, settings);

  return (
    <div className="absolute top-2 left-3 z-20 pointer-events-auto select-none flex items-center gap-1.5 flex-wrap">
      <div
        onDoubleClick={(e) => {
          e.stopPropagation();
          onOpenSettings(type);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu({ x: e.clientX, y: e.clientY, type });
        }}
        className="group flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono transition-colors border cursor-pointer backdrop-blur-sm bg-[#1e222d]/90 border-[#2a2e39] text-neutral-100 shadow-sm hover:bg-[#1e222d]"
        title="Double-click for settings. Right-click for menu."
      >
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
        <span
          className={cn(
            "font-medium tracking-tight",
            !isVisible && "line-through opacity-50",
          )}
        >
          {title}
        </span>

        {/* Real-time / crosshair values */}
        {values.length > 0 && (
          <div className="flex items-center gap-1.5 ml-1">
            {values.map((v, idx) => (
              <span
                key={idx}
                className="font-medium"
                style={{ color: v.color || color }}
              >
                {v.label ? `${v.label} ${v.value}` : v.value}
              </span>
            ))}
          </div>
        )}

        {/* Quick hover actions (TradingView style) */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenSettings(type);
            }}
            className="p-0.5 rounded hover:bg-neutral-700/60 text-neutral-400 hover:text-neutral-100"
            title="Settings"
          >
            <Sliders className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemoveIndicator(type);
            }}
            className="p-0.5 rounded hover:bg-neutral-700/60 text-neutral-400 hover:text-red-400"
            title="Remove indicator"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

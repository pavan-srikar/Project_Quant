import { Clock, Eye, EyeOff, Sliders, X } from "lucide-react";
import type { IndicatorSettings } from "../../../hooks/useIndicatorSettings.ts";
import type { IndicatorType } from "../../../lib/indicators.ts";
import { formatDelta } from "../../../lib/orderFlowDelta.ts";
import { getCustomPineIndicators, openPineScriptEditor } from "../../../lib/pinescript";
import { cn } from "../../../lib/utils.ts";
import type { Timeframe } from "../constants.ts";
import type { OhlcvLegend, TickData } from "./types.ts";

export function OhlcvCell({
  label,
  value,
  digits,
  up,
  bold,
}: {
  label: string;
  value: number;
  digits: number;
  up: boolean;
  bold?: boolean;
}) {
  return (
    <>
      <span className="text-muted-foreground/70">{label}</span>
      <span
        className={cn(
          up ? "text-[#d1d4dc]" : "text-[#5d606b]",
          bold ? "font-semibold" : "font-medium",
        )}
      >
        {value.toFixed(digits)}
      </span>
    </>
  );
}

export function OhlcvLegendRow({
  legend,
  pipDigits,
}: {
  legend: OhlcvLegend;
  pipDigits: number;
}) {
  const up = legend.c >= legend.o;
  return (
    <>
      <OhlcvCell label="O" value={legend.o} digits={pipDigits} up={up} />
      <OhlcvCell label="H" value={legend.h} digits={pipDigits} up={up} />
      <OhlcvCell label="L" value={legend.l} digits={pipDigits} up={up} />
      <OhlcvCell label="C" value={legend.c} digits={pipDigits} up={up} bold />
      <span
        className={cn(
          "font-semibold",
          legend.change >= 0 ? "text-[#d1d4dc]" : "text-[#5d606b]",
        )}
      >
        {legend.change >= 0 ? "+" : ""}
        {legend.change.toFixed(2)}%
      </span>
      {legend.v > 0 && (
        <>
          <span className="text-muted-foreground/70">V</span>
          <span className="text-foreground/60">{legend.v.toLocaleString()}</span>
        </>
      )}
      {legend.delta !== undefined && (
        <>
          <span className="text-muted-foreground/70">Δ</span>
          <span
            className={cn(
              "font-semibold",
              legend.delta >= 0 ? "text-[#0ecb81]" : "text-[#f6465d]",
            )}
          >
            {formatDelta(legend.delta)}
          </span>
        </>
      )}
    </>
  );
}

export function BidAskRow({
  tick,
  pipDigits,
}: {
  tick: TickData;
  pipDigits: number;
}) {
  const spread = ((tick.ask - tick.bid) * 10 ** pipDigits).toFixed(1);
  return (
    <div className="flex items-center gap-2 text-[10px] font-mono">
      <span className="text-muted-foreground/50">Bid</span>
      <span className="text-[#0ecb81]/80">{tick.bid.toFixed(pipDigits)}</span>
      <span className="text-muted-foreground/50">Ask</span>
      <span className="text-[#f6465d]/80">{tick.ask.toFixed(pipDigits)}</span>
      <span className="text-muted-foreground/50">Spread</span>
      <span className="text-foreground/50">{spread}</span>
    </div>
  );
}
function getOverlayLabel(
  type: IndicatorType,
  settings?: IndicatorSettings,
): string {
  if (type === "SMA") return `SMA ${settings?.period ?? 20} close`;
  if (type === "EMA") {
    const activeSlots = settings?.emaSlots
      ? settings.emaSlots.filter((s) => s.enabled)
      : null;
    if (activeSlots && activeSlots.length > 0) {
      return `EMA ${activeSlots.map((s) => s.period).join(", ")} close`;
    }
    return `EMA ${settings?.period ?? 20} close`;
  }
  if (type === "BOLL")
    return `BB ${settings?.period ?? 20} ${settings?.stdDev ?? 2} close`;
  if (type === "VWAP") return `VWAP`;
  if (type === "VOL") return `Volume`;
  if (type.startsWith("pine_")) {
    const custom = getCustomPineIndicators().find((c) => c.id === type);
    if (!custom) return "Pine Script";
    const inputs = { ...(custom.inputs || {}), ...(settings?.pineInputs || {}) };
    const vals = Object.values(inputs).filter((v) => typeof v === "number" || (typeof v === "string" && !v.startsWith("#") && v.length < 20));
    return vals.length > 0 ? `${custom.name} ${vals.slice(0, 3).join(" ")}` : custom.name;
  }
  return type;
}

export interface ChartLegendHeaderProps {
  selectedSymbol: string;
  timeframe: Timeframe;
  legend: OhlcvLegend | null;
  countdown: string;
  tick?: TickData;
  pipDigits: number;
  showOhlcLegend: boolean;
  showCountdown: boolean;
  overlayIndicators?: IndicatorType[];
  indicatorSettings?: Record<IndicatorType, IndicatorSettings>;
  onOpenIndicatorSettings?: (type: IndicatorType) => void;
  onToggleIndicatorVisibility?: (type: IndicatorType) => void;
  onRemoveIndicator?: (type: IndicatorType) => void;
}

export function ChartLegendHeader({
  selectedSymbol,
  timeframe,
  legend,
  countdown,
  tick,
  pipDigits,
  showOhlcLegend,
  showCountdown,
  overlayIndicators = [],
  indicatorSettings,
  onOpenIndicatorSettings,
  onToggleIndicatorVisibility,
  onRemoveIndicator,
}: ChartLegendHeaderProps) {
  return (
    <div className="absolute top-2 left-3 z-10 pointer-events-none select-none">
      <div className="flex items-center gap-2 text-[11px] font-mono leading-none mb-1">
        <span className="text-foreground font-bold text-[13px] tracking-tight">
          {selectedSymbol}
        </span>
        <span className="text-muted-foreground font-medium">{timeframe}</span>
        {legend && showOhlcLegend && (
          <OhlcvLegendRow legend={legend} pipDigits={pipDigits} />
        )}
        {countdown && showCountdown && (
          <span className="text-muted-foreground/60 flex items-center gap-0.5">
            <Clock className="h-2.5 w-2.5 opacity-50" />
            {countdown}
          </span>
        )}
      </div>
      {/* Secondary info row: Bid / Ask / Spread */}
      {tick && <BidAskRow tick={tick} pipDigits={pipDigits} />}

      {/* Overlay Indicators Badges */}
      {overlayIndicators && overlayIndicators.length > 0 && (
        <div className="flex flex-col gap-0.5 mt-1 pointer-events-auto">
          {overlayIndicators.map((type) => {
            const stg = indicatorSettings?.[type];
            const isVisible = stg?.visible !== false;
            const color = stg?.color || "#2962ff";
            const label = getOverlayLabel(type, stg);

            return (
              <div
                key={type}
                className="group flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[11px] font-mono transition-colors hover:bg-[#1e222d]/90 bg-[#1e222d]/40 border border-[#2a2e39]/50 w-fit cursor-pointer select-none text-neutral-300 hover:text-white backdrop-blur-sm"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  onOpenIndicatorSettings?.(type);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onOpenIndicatorSettings?.(type);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                }}
                title="Double-click or right-click to edit indicator settings"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span
                  className={cn(
                    "font-medium",
                    !isVisible && "line-through opacity-50",
                  )}
                >
                  {label}
                </span>

                {/* Quick actions on hover */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                  {onToggleIndicatorVisibility && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleIndicatorVisibility(type);
                      }}
                      className="p-0.5 rounded hover:bg-white/10 text-neutral-400 hover:text-white"
                      title={isVisible ? "Hide indicator" : "Show indicator"}
                    >
                      {isVisible ? (
                        <Eye className="h-3 w-3" />
                      ) : (
                        <EyeOff className="h-3 w-3" />
                      )}
                    </button>
                  )}

                  {onOpenIndicatorSettings && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenIndicatorSettings(type);
                      }}
                      className="p-0.5 rounded hover:bg-white/10 text-neutral-400 hover:text-white"
                      title={`Settings for ${type}`}
                    >
                      <Sliders className="h-3 w-3" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openPineScriptEditor(type);
                    }}
                    className="px-1 py-0.5 rounded hover:bg-[#2962ff]/20 text-neutral-400 hover:text-[#2962ff] font-mono text-[10px] font-bold"
                    title={`Edit Pine Script ({/}) for ${type}`}
                  >
                    {"{/}"}
                  </button>

                  {onRemoveIndicator && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveIndicator(type);
                      }}
                      className="p-0.5 rounded hover:bg-white/10 text-neutral-400 hover:text-[#f6465d]"
                      title={`Remove ${type}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

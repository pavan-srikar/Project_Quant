import { LineStyle } from "lightweight-charts";
import {
  sma, ema, bollingerBands, vwap,
  INDICATOR_REGISTRY, type IndicatorType, type CandleData,
} from "../../lib/indicators.ts";
import type { IndicatorSettings } from "../../hooks/useIndicatorSettings.ts";

export interface RenderBuiltinsParams {
  builtinOverlayIndicators: IndicatorType[];
  settings: Record<string, Partial<IndicatorSettings>>;
  indCandles: CandleData[];
  candleKey: string;
  setOrAdd: (
    key: string,
    values: { time: number; value: number }[],
    opts: any,
    dataKey?: string,
  ) => void;
}

export function renderBuiltinOverlays({
  builtinOverlayIndicators,
  settings,
  indCandles,
  candleKey,
  setOrAdd,
}: RenderBuiltinsParams): void {
  for (const type of builtinOverlayIndicators) {
    const config = INDICATOR_REGISTRY.find((r) => r.type === type);
    if (!config) continue;
    const curSettings: Partial<IndicatorSettings> = settings[type] ?? {};
    if (curSettings.visible === false) continue;
    const lineColor = curSettings.color || config.color;
    const lineWidth = (curSettings.lineWidth as any) || 1.5;

    if (type === "SMA") {
      const period = curSettings.period ?? config.defaultParams.period ?? 20;
      setOrAdd(
        "SMA",
        sma(indCandles, period),
        { color: lineColor, lineWidth, priceScaleId: "right", priceLineVisible: false, lastValueVisible: true },
        `SMA_${period}_${candleKey}`,
      );
    } else if (type === "EMA") {
      const slots = curSettings.emaSlots?.length
        ? curSettings.emaSlots
        : [{ enabled: true, period: curSettings.period ?? 20, color: lineColor }];
      slots.forEach((slot, idx) => {
        if (!slot.enabled || slot.period <= 0) return;
        setOrAdd(
          `EMA_${idx + 1}`,
          ema(indCandles, slot.period),
          { color: slot.color || lineColor, lineWidth, priceScaleId: "right", priceLineVisible: false, lastValueVisible: true },
          `EMA_${idx + 1}_${slot.period}_${candleKey}`,
        );
      });
    } else if (type === "BOLL") {
      const period = curSettings.period ?? config.defaultParams.period ?? 20;
      const stdDev = curSettings.stdDev ?? config.defaultParams.stdDev ?? 2;
      const data = bollingerBands(indCandles, period, stdDev);
      setOrAdd(
        "BOLL-upper",
        data.upper,
        { color: curSettings.upperColor || lineColor + "80", lineWidth: 1, priceScaleId: "right", priceLineVisible: false, lastValueVisible: false },
        `BOLL_up_${period}_${stdDev}_${candleKey}`,
      );
      setOrAdd(
        "BOLL-mid",
        data.middle,
        { color: lineColor, lineWidth: 1, priceScaleId: "right", priceLineVisible: false, lastValueVisible: true },
        `BOLL_mid_${period}_${stdDev}_${candleKey}`,
      );
      setOrAdd(
        "BOLL-lower",
        data.lower,
        { color: curSettings.lowerColor || lineColor + "80", lineWidth: 1, priceScaleId: "right", priceLineVisible: false, lastValueVisible: false },
        `BOLL_low_${period}_${stdDev}_${candleKey}`,
      );
    } else if (type === "VWAP") {
      setOrAdd(
        "VWAP",
        vwap(indCandles),
        { color: lineColor, lineWidth, lineStyle: LineStyle.Dashed, priceScaleId: "right", priceLineVisible: false, lastValueVisible: true },
        `VWAP_${candleKey}`,
      );
    }
  }
}

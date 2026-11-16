import type { HistogramData, LineData, Time, WhitespaceData } from "lightweight-charts";
import type { IndicatorSettings } from "../../../hooks/useIndicatorSettings.ts";
import type { IndicatorType } from "../../../lib/indicators.ts";

export const BELOW_INDICATORS: IndicatorType[] = [
  "RSI",
  "MACD",
  "ATR",
  "STOCH",
  "CCI",
  "WR",
];

export const SHORT_NAMES: Record<string, string> = {
  RSI: "RSI",
  MACD: "MACD",
  ATR: "ATR",
  STOCH: "STO",
  CCI: "CCI",
  WR: "%R",
  EMA: "EMA",
  SMA: "SMA",
  BOLL: "BOLL",
  VWAP: "VWAP",
  VOL: "VOL",
};

export function getIndicatorTabLabel(
  type: IndicatorType,
  settings?: IndicatorSettings,
): string {
  if (type === "RSI") return `RSI (${settings?.period ?? 14})`;
  if (type === "MACD")
    return `MACD (${settings?.fast ?? 12}, ${settings?.slow ?? 26}, ${settings?.signal ?? 9})`;
  if (type === "ATR") return `ATR (${settings?.period ?? 14})`;
  if (type === "STOCH")
    return `STOCH (${settings?.kPeriod ?? 14}, ${settings?.dPeriod ?? 3})`;
  if (type === "CCI") return `CCI (${settings?.period ?? 20})`;
  if (type === "WR") return `%R (${settings?.period ?? 14})`;
  return type;
}

export function alignLineData(
  times: number[],
  points: { time: number; value: number }[],
): (LineData<Time> | WhitespaceData<Time>)[] {
  if (times.length === 0) {
    return points.map((p) => ({ time: p.time as Time, value: p.value }));
  }
  const map = new Map<number, number>();
  for (const p of points) {
    map.set(p.time, p.value);
  }
  return times.map((t) => {
    const v = map.get(t);
    if (v !== undefined) {
      return { time: t as Time, value: v };
    }
    return { time: t as Time };
  });
}

export function alignHistogramData(
  times: number[],
  points: { time: number; value: number; color?: string }[],
): (HistogramData<Time> | WhitespaceData<Time>)[] {
  if (times.length === 0) {
    return points.map((p) => ({
      time: p.time as Time,
      value: p.value,
      color: p.color || (p.value >= 0 ? "#0ecb81" : "#f6465d"),
    }));
  }
  const map = new Map<number, { value: number; color?: string }>();
  for (const p of points) {
    map.set(p.time, { value: p.value, color: p.color });
  }
  return times.map((t) => {
    const item = map.get(t);
    if (item !== undefined) {
      return {
        time: t as Time,
        value: item.value,
        color: item.color || (item.value >= 0 ? "#0ecb81" : "#f6465d"),
      };
    }
    return { time: t as Time };
  });
}

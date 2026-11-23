import type { CandleData } from "../indicators/types";
import type { PineFill, PinePolyline } from "./types";

export interface ForecastParams {
  maxMemory?: number;
  fcast?: number;
  upPer?: number;
  midPer?: number;
  dnPer?: number;
  upLine?: string;
  dnLine?: string;
  upArea?: string;
  dnArea?: string;
  signalBull?: string;
  signalBear?: string;
  signalArea?: boolean;
}

function toTranslucentColor(color: string, alpha = 0.35): string {
  if (color.startsWith("#")) {
    const hex = color.slice(1);
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16) || 0;
      const g = parseInt(hex.substring(2, 4), 16) || 0;
      const b = parseInt(hex.substring(4, 6), 16) || 0;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    if (hex.length === 8) {
      const r = parseInt(hex.substring(0, 2), 16) || 0;
      const g = parseInt(hex.substring(2, 4), 16) || 0;
      const b = parseInt(hex.substring(4, 6), 16) || 0;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }
  if (color.startsWith("rgba(")) {
    return color.replace(/[\d.]+\)$/, `${alpha})`);
  }
  if (color.startsWith("rgb(")) {
    return color.replace("rgb(", "rgba(").replace(")", `, ${alpha})`);
  }
  return color;
}

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0]!;
  const rank = (Math.max(0, Math.min(100, p)) / 100) * (sorted.length - 1);
  const low = Math.floor(rank);
  const high = Math.ceil(rank);
  const weight = rank - low;
  const vLow = sorted[low] ?? sorted[0]!;
  const vHigh = sorted[high] ?? sorted[sorted.length - 1]!;
  return vLow + weight * (vHigh - vLow);
}

export function computeForecastAndFills(
  candles: CandleData[],
  uptrend: boolean[],
  uptrendInitPrice: number[],
  downtrendInitPrice: number[],
  params: ForecastParams = {},
): { polylines: PinePolyline[]; fills: PineFill[] } {
  const n = candles.length;
  if (n === 0) return { polylines: [], fills: [] };

  const maxMemory = params.maxMemory ?? 50;
  const fcast = params.fcast ?? 100;
  const upPer = params.upPer ?? 80;
  const midPer = params.midPer ?? 50;
  const dnPer = params.dnPer ?? 20;
  const upLine = params.upLine ?? "#3179f5";
  const dnLine = params.dnLine ?? "#ff5d00";
  const upArea = params.upArea ?? "rgba(49, 121, 245, 0.20)";
  const dnArea = params.dnArea ?? "rgba(255, 93, 0, 0.20)";

  const upMemory: number[][] = [];
  const dnMemory: number[][] = [];

  let curUpIdx = 0;
  let curDnIdx = 0;

  for (let i = 0; i < n; i++) {
    const isUp = uptrend[i] ?? false;
    const c = candles[i]!;

    if (isUp) {
      if (i > 0 && !uptrend[i - 1]) curUpIdx = 0;
      else if (i > 0) curUpIdx++;

      while (upMemory.length <= curUpIdx) upMemory.push([]);
      const arr = upMemory[curUpIdx]!;
      arr.unshift(c.close - (uptrendInitPrice[i] ?? c.close));
      if (arr.length > maxMemory) arr.pop();
    } else {
      if (i > 0 && uptrend[i - 1]) curDnIdx = 0;
      else if (i > 0) curDnIdx++;

      while (dnMemory.length <= curDnIdx) dnMemory.push([]);
      const arr = dnMemory[curDnIdx]!;
      arr.unshift(c.close - (downtrendInitPrice[i] ?? c.close));
      if (arr.length > maxMemory) arr.pop();
    }
  }

  // Active trend at the latest bar
  const lastIsUp = uptrend[n - 1] ?? false;
  const activeMemory = lastIsUp ? upMemory : dnMemory;
  const activeIdx = lastIsUp ? curUpIdx : curDnIdx;
  const lastClose = candles[n - 1]!.close;

  // Average bar range for smooth extrapolation
  const sampleDeltas: number[] = [];
  for (let i = Math.max(0, n - 30); i < n; i++) {
    sampleDeltas.push(Math.abs(candles[i]!.close - candles[i]!.open));
  }
  const avgBarMove = sampleDeltas.length
    ? sampleDeltas.reduce((a, b) => a + b, 0) / sampleDeltas.length
    : lastClose * 0.005;

  const upperCoords: { index: number; price: number }[] = [];
  const midCoords: { index: number; price: number }[] = [];
  const lowerCoords: { index: number; price: number }[] = [];

  // Start directly at current candle close (x = 0) so the cone connects smoothly
  upperCoords.push({ index: n - 1, price: lastClose });
  midCoords.push({ index: n - 1, price: lastClose });
  lowerCoords.unshift({ index: n - 1, price: lastClose });

  const currentDeltas = activeMemory[activeIdx] ?? [];
  const currentMedian = currentDeltas.length >= 2 ? percentile(currentDeltas, 50) : 0;

  for (let x = 1; x <= fcast; x++) {
    const horizon = activeIdx + x;
    const deltas = activeMemory[horizon];

    let upperDelta: number;
    let midDelta: number;
    let lowerDelta: number;

    if (deltas && deltas.length >= 1) {
      midDelta = percentile(deltas, midPer) - currentMedian;
      upperDelta = percentile(deltas, upPer) - currentMedian;
      lowerDelta = percentile(deltas, dnPer) - currentMedian;
    } else {
      const spread = avgBarMove * Math.sqrt(x) * 1.5;
      const drift = (lastIsUp ? 1 : -1) * avgBarMove * 0.25 * x;
      midDelta = drift;
      upperDelta = drift + spread * (upPer / 50);
      lowerDelta = drift - spread * ((100 - dnPer) / 50);
    }

    const idx = (n - 1) + x;
    upperCoords.push({ index: idx, price: lastClose + upperDelta });
    midCoords.push({ index: idx, price: lastClose + midDelta });
    lowerCoords.unshift({ index: idx, price: lastClose + lowerDelta });
  }

  const primaryLine = lastIsUp ? upLine : dnLine;
  const boundLine = toTranslucentColor(primaryLine, 0.4);
  const polylines: PinePolyline[] = [
    {
      id: "forecast_mid",
      points: midCoords,
      lineColor: primaryLine,
      lineWidth: 2,
    },
    {
      id: "forecast_upper_bound",
      points: upperCoords,
      lineColor: boundLine,
      lineWidth: 1,
    },
    {
      id: "forecast_lower_bound",
      points: [...lowerCoords].reverse(),
      lineColor: boundLine,
      lineWidth: 1,
    },
    {
      id: "forecast_area",
      points: [...upperCoords, ...lowerCoords],
      fillColor: lastIsUp ? upArea : dnArea,
    },
  ];

  const fills: PineFill[] = [];
  if (params.signalArea !== false) {
    const pts: { time: number; top: number; bottom: number; color?: string }[] = [];
    for (let i = 0; i < n; i++) {
      const c = candles[i];
      if (!c) continue;
      const initVal = uptrend[i] ? uptrendInitPrice[i] : downtrendInitPrice[i];
      if (initVal === undefined || isNaN(initVal)) continue;
      const isUp = uptrend[i];
      const col = isUp ? (params.signalBull ?? "rgba(8, 153, 129, 0.25)") : (params.signalBear ?? "rgba(242, 54, 69, 0.25)");
      pts.push({
        time: c.time,
        top: Math.max(c.close, initVal),
        bottom: Math.min(c.close, initVal),
        color: col,
      });
    }
    if (pts.length > 1) {
      fills.push({
        id: "fill_price_ref",
        topColor: params.signalBull ?? "rgba(8, 153, 129, 0.25)",
        bottomColor: params.signalBear ?? "rgba(242, 54, 69, 0.25)",
        points: pts,
      });
    }
  }

  return { polylines, fills };
}

import type {
  CandlestickData,
  HistogramData,
  Time,
} from "lightweight-charts";
import { useMemo } from "react";
import type { Candle } from "../../../services/schemas.ts";
import type { OhlcvLegend } from "./types.ts";

export type CandleRow = CandlestickData<Time> & {
  volume: number;
  takerBuyVolume?: number;
  delta?: number;
};

export function candleToLegend(
  c: CandlestickData<Time>,
  volume: number,
  delta?: number,
): OhlcvLegend {
  const change = c.open ? ((c.close - c.open) / c.open) * 100 : 0;
  return { o: c.open, h: c.high, l: c.low, c: c.close, v: volume, change, delta };
}

export function legendFromSeries(
  chartData: CandlestickData<Time>[],
  volumeData: HistogramData<Time>[],
  deduped?: CandleRow[],
): OhlcvLegend | null {
  const last = chartData[chartData.length - 1];
  if (!last) return null;
  const vol =
    volumeData.length > 0 ? (volumeData[volumeData.length - 1]?.value ?? 0) : 0;
  const lastRow = deduped ? deduped[deduped.length - 1] : undefined;
  return candleToLegend(last, vol, lastRow?.delta);
}

// Treat values below 1e12 as seconds, at/above as milliseconds.
export function secOrMsToMs(v: number): number {
  return v < 1_000_000_000_000 ? v * 1000 : v;
}

// Normalise a raw candle's timestamp (seconds, ms, or ISO string) to unix seconds.
export function candleTimeSec(c: Candle): number {
  let tMs = NaN;
  if (typeof c.time === "number" && c.time > 0) tMs = secOrMsToMs(c.time);
  else if (typeof c.timestamp === "number" && c.timestamp > 0)
    tMs = secOrMsToMs(c.timestamp);
  else if (typeof c.timestamp === "string") tMs = Date.parse(c.timestamp);
  return Number.isNaN(tMs) ? NaN : Math.floor(tMs / 1000);
}

export function toCandleRow(c: Candle): CandleRow {
  const volume = Number(c.volume) || 0;
  const delta =
    c.delta !== undefined
      ? c.delta
      : c.takerBuyVolume !== undefined
        ? 2 * c.takerBuyVolume - volume
        : undefined;

  return {
    time: candleTimeSec(c) as Time,
    open: Number(c.open),
    high: Number(c.high),
    low: Number(c.low),
    close: Number(c.close),
    volume,
    takerBuyVolume: c.takerBuyVolume,
    delta,
  };
}

// Keep the last row for each timestamp (input must be time-sorted ascending).
export function dedupeByTime(sorted: CandleRow[]): CandleRow[] {
  const out: CandleRow[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i]!;
    const next = sorted[i + 1];
    if (!next || (cur.time as number) !== (next.time as number)) out.push(cur);
  }
  return out;
}

export function useChartData(
  candles: Candle[],
  colors: { volumeUp: string; volumeDown: string },
) {
  return useMemo(() => {
    const sorted = candles
      .map(toCandleRow)
      .filter((c) => !Number.isNaN(c.time as number) && (c.time as number) > 0)
      .sort((a, b) => (a.time as number) - (b.time as number));
    const deduped = dedupeByTime(sorted);

    const chartData: (CandlestickData<Time> & { volume: number })[] = deduped.map(
      ({ takerBuyVolume: _tb, delta: _d, ...rest }) => rest,
    );

    const volumeData: HistogramData<Time>[] = deduped.map((c) => ({
      time: c.time,
      value: c.volume,
      color: c.close >= c.open ? colors.volumeUp : colors.volumeDown,
    }));

    return { chartData, volumeData, deduped };
  }, [candles, colors.volumeUp, colors.volumeDown]);
}

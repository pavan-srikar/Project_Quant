import type { useQueryClient } from "@tanstack/react-query";
import type {
  CandlestickData,
  Time,
} from "lightweight-charts";
import type { Dispatch, SetStateAction } from "react";
import { queryKeys } from "../../../services/queries.ts";
import { TF_INTERVAL_MS, type Timeframe } from "../constants.ts";
import {
  getCandleBucketTime,
  toUnixMs,
  toUnixSeconds,
} from "../utils.ts";
import type {
  LiveCandleData,
  OhlcvLegend,
  Ref,
  RtCtx,
  TickData,
} from "./types.ts";
import { candleToLegend } from "./useChartDataPipeline.ts";

export {
  applyBidAskLines,
  removePriceLineSafe,
  upsertPriceLine,
} from "./bidAskLines.ts";

export function requestGapRefetch(
  refAtRef: { current: number },
  qc: ReturnType<typeof useQueryClient>,
  symbol: string,
  timeframe: string,
): void {
  const now = Date.now();
  if (now - refAtRef.current <= 3_000) return;
  refAtRef.current = now;
  qc.invalidateQueries({ queryKey: queryKeys.market.candles(symbol, timeframe) });
}

export function intervalSecOf(tf: Timeframe): number {
  return (TF_INTERVAL_MS[tf] ?? 60_000) / 1000;
}

export function isSeriesAtLiveEdge(lastBarTimeSec: number, timeframe: Timeframe): boolean {
  if (!lastBarTimeSec || lastBarTimeSec <= 0) return false;
  const nowSec = Math.floor(Date.now() / 1000);
  const intervalSec = intervalSecOf(timeframe);
  return (nowSec - lastBarTimeSec) <= Math.max(intervalSec * 3, 86400 * 4);
}

export function paintServerVolume(
  live: LiveCandleData,
  barTime: Time,
  ctx: RtCtx,
): void {
  if (!ctx.volume || live.volume == null) return;
  ctx.legendVol.current = live.volume;
  try {
    ctx.volume.update({
      time: barTime,
      value: live.volume,
      color:
        live.close >= live.open ? ctx.colors.volumeUp : ctx.colors.volumeDown,
    });
  } catch {
    /* safe to ignore */
  }
}

export function applyServerCandle(live: LiveCandleData, ctx: RtCtx): void {
  if (ctx.lastLoadKey.current !== `${ctx.symbol}:${ctx.timeframe}`) return;
  const lastBarSec = (ctx.lastCandle.current?.time as number) ?? 0;
  if (!isSeriesAtLiveEdge(lastBarSec, ctx.timeframe)) return;
  const ts = toUnixSeconds(live.timestamp);
  if (Number.isNaN(ts) || ts <= 0 || !ctx.lastCandle.current) return;
  if (
    ts - (ctx.lastCandle.current.time as number) >
    intervalSecOf(ctx.timeframe) * 1.5
  ) {
    requestGapRefetch(ctx.gapAt, ctx.qc, ctx.symbol, ctx.timeframe);
  }
  const bar: CandlestickData<Time> = {
    time: ts as Time,
    open: live.open,
    high: live.high,
    low: live.low,
    close: live.close,
  };
  ctx.lastCandle.current = bar;
  ctx.liveCandleTs.current = toUnixMs(live.timestamp);
  try {
    ctx.series.update(bar);
  } catch {
    /* timestamp older than series — safe to ignore */
  }
  paintServerVolume(live, ts as Time, ctx);
  ctx.setLegend(candleToLegend(bar, live.volume || 0));
}

export function buildTickBar(
  prev: CandlestickData<Time>,
  isContinuation: boolean,
  bucketTime: Time,
  mid: number,
  ctx: RtCtx,
): CandlestickData<Time> | null {
  if (isContinuation) {
    return {
      time: bucketTime,
      open: prev.open,
      high: Math.max(prev.high, mid),
      low: Math.min(prev.low, mid),
      close: mid,
    };
  }
  if ((bucketTime as number) <= (prev.time as number)) return null;
  if (
    (bucketTime as number) - (prev.time as number) >
    intervalSecOf(ctx.timeframe) * 1.5
  ) {
    requestGapRefetch(ctx.gapAt, ctx.qc, ctx.symbol, ctx.timeframe);
  }
  const seedOpen = prev.close;
  return {
    time: bucketTime,
    open: seedOpen,
    high: Math.max(seedOpen, mid),
    low: Math.min(seedOpen, mid),
    close: mid,
  };
}

export function paintTickVolume(
  bar: CandlestickData<Time>,
  isContinuation: boolean,
  bucketTime: Time,
  ctx: RtCtx,
): void {
  if (!ctx.volume) return;
  if (!isContinuation) ctx.legendVol.current = 0;
  try {
    ctx.volume.update({
      time: bucketTime,
      value: ctx.legendVol.current,
      color:
        bar.close >= bar.open ? ctx.colors.volumeUp : ctx.colors.volumeDown,
    });
  } catch {
    /* safe to ignore */
  }
}

export function applyTick(tick: TickData, ctx: RtCtx): void {
  if (!tick.timestamp) return;
  if (
    !Number.isFinite(tick.bid) ||
    !Number.isFinite(tick.ask) ||
    tick.bid <= 0 ||
    tick.ask <= 0
  ) {
    return;
  }

  if (ctx.lastLoadKey.current !== `${ctx.symbol}:${ctx.timeframe}`) return;

  const tickMs = toUnixMs(tick.timestamp);
  if (ctx.liveCandleTs.current && tickMs <= ctx.liveCandleTs.current) return;
  const prev = ctx.lastCandle.current;
  if (!prev) return;
  const lastBarSec = prev.time as number;
  if (!isSeriesAtLiveEdge(lastBarSec, ctx.timeframe)) return;
  const mid = (tick.bid + tick.ask) / 2;
  if (!Number.isFinite(mid) || mid <= 0) return;

  if (prev.close > 0 && (mid > prev.close * 1.5 || mid < prev.close * 0.65)) {
    return;
  }

  const bucketTime = getCandleBucketTime(tickMs, ctx.timeframe) as Time;
  const isContinuation = prev.time === bucketTime;
  const bar = buildTickBar(prev, isContinuation, bucketTime, mid, ctx);
  if (!bar) return;
  ctx.lastCandle.current = bar;
  try {
    ctx.series.update(bar);
  } catch {
    /* safe to ignore */
  }
  paintTickVolume(bar, isContinuation, bucketTime, ctx);
  ctx.setLegend((prevLegend) => ({
    ...candleToLegend(bar, 0),
    v: isContinuation ? (prevLegend?.v ?? 0) : 0,
  }));
}

export function liveBarFrom(
  live: LiveCandleData,
): CandlestickData<Time> | null {
  const ts = toUnixSeconds(live.timestamp);
  if (Number.isNaN(ts) || ts <= 0) return null;
  return {
    time: ts as Time,
    open: live.open,
    high: live.high,
    low: live.low,
    close: live.close,
  };
}

export function reapplyLive(
  live: LiveCandleData | undefined,
  ctx: RtCtx,
): void {
  if (!live) return;
  const bar = liveBarFrom(live);
  if (!bar) return;
  try {
    ctx.series.update(bar);
  } catch {
    /* safe to ignore */
  }
  ctx.lastCandle.current = bar;
}

export function replayBufferedLive(
  buffered: LiveCandleData | undefined,
  chartData: CandlestickData<Time>[],
  ctx: RtCtx,
): void {
  if (!buffered) return;
  const lastHistBarSec =
    (chartData[chartData.length - 1]?.time as number) ?? 0;
  if (!isSeriesAtLiveEdge(lastHistBarSec, ctx.timeframe)) return;
  const liveTs = toUnixSeconds(buffered.timestamp);
  if (Number.isNaN(liveTs) || liveTs <= 0 || liveTs < lastHistBarSec) return;
  const liveBar = liveBarFrom(buffered);
  if (!liveBar) return;
  try {
    ctx.series.update(liveBar);
    ctx.lastCandle.current = liveBar;
    ctx.liveCandleTs.current = toUnixMs(buffered.timestamp);
  } catch {
    /* safe to ignore — timestamp may be older than series */
  }
}

export function scheduleStaleRefetch(
  chartData: CandlestickData<Time>[],
  ctx: RtCtx,
): (() => void) | undefined {
  const lastBarSec = (chartData[chartData.length - 1]?.time as number) ?? 0;
  if (!isSeriesAtLiveEdge(lastBarSec, ctx.timeframe)) {
    return undefined;
  }
  const nowSec = Math.floor(Date.now() / 1000);
  if (
    lastBarSec <= 0 ||
    nowSec - lastBarSec <= intervalSecOf(ctx.timeframe) * 2
  ) {
    return undefined;
  }
  const now = Date.now();
  if (now - ctx.gapAt.current <= 3_000) return undefined;
  ctx.gapAt.current = now;
  const { symbol, timeframe, qc } = ctx;
  const timer = window.setTimeout(() => {
    qc.invalidateQueries({
      queryKey: queryKeys.market.candles(symbol, timeframe),
    });
  }, 1_500);
  return () => window.clearTimeout(timer);
}

export function restoreLegendOnLeave(
  restored: Ref<boolean>,
  lastCandle: Ref<CandlestickData<Time> | null>,
  legendVol: Ref<number>,
  setLegend: Dispatch<SetStateAction<OhlcvLegend | null>>,
): void {
  if (!restored.current && lastCandle.current) {
    setLegend(candleToLegend(lastCandle.current, legendVol.current));
  }
  restored.current = true;
}

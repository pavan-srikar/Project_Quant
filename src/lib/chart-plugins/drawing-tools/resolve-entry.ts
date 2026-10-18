import type { Time } from "lightweight-charts";
import type { DrawingLine } from "../../../pages/trading/constants";
import type { EntryState, ResolvedEntry } from "./types";
import { timeToX, type ResolveCtx } from "./coords";
import { resolveFibLevels } from "./resolve-fibonacci";
import { trendlineSegment, trendlineStats } from "./resolve-trendline";
import { resolveVolumeProfile } from "./resolve-volume-profile";

/** Convert a drawing's data-space anchors into pane pixel coordinates. */
export function resolveEntry(d: DrawingLine, ctx: ResolveCtx, state: EntryState): ResolvedEntry {
  const entry: ResolvedEntry = {
    d,
    x1: d.time != null ? timeToX(ctx, d.time) : null,
    y1: Number.isFinite(d.price) ? ctx.series.priceToCoordinate(d.price) : null,
    x2: d.time2 != null ? timeToX(ctx, d.time2) : null,
    y2: d.price2 != null ? ctx.series.priceToCoordinate(d.price2) : null,
    state,
  };
  if (d.type === "fibonacci" || d.type === "fibextension") {
    entry.fibLevels = resolveFibLevels(d, ctx.series);
  }
  if (d.type === "trendline") {
    const tsWidth = ctx.chart.timeScale().width();
    const paneWidth = tsWidth > 0 ? tsWidth : 2000;
    entry.seg = trendlineSegment(entry, paneWidth);
    if (state === "selected" || state === "preview") entry.stats = trendlineStats(d, ctx);
  }
  if (d.type === "position") {
    entry.yStop = d.stopPrice != null ? ctx.series.priceToCoordinate(d.stopPrice) : null;
    entry.yTarget = d.targetPrice != null ? ctx.series.priceToCoordinate(d.targetPrice) : null;

    if (ctx.data.length > 0 && d.time != null) {
      const tStart = Math.min(d.time, d.time2 ?? d.time);
      const tEnd = Math.max(d.time, d.time2 ?? d.time);
      const isLong = d.side !== "short";

      let hasTriggered = false;
      let entryHitTime: number | null = null;
      let trackingPrice: number | null = null;
      let trackingTime: number | null = null;
      let trackingStatus: "ACTIVE" | "CLOSED" = "ACTIVE";

      for (let i = 0; i < ctx.data.length; i++) {
        const bar = ctx.data[i] as { time: Time; open?: number; high?: number; low?: number; close?: number };
        const bTime = bar.time as number;
        if (bTime < tStart) continue;
        if (bTime > tEnd) break;

        const high = typeof bar.high === "number" ? bar.high : bar.close ?? d.price;
        const low = typeof bar.low === "number" ? bar.low : bar.close ?? d.price;
        const close = typeof bar.close === "number" ? bar.close : d.price;
        const open = typeof bar.open === "number" ? bar.open : close;

        // 1. If trade has not triggered yet, check if this bar touched or crossed the entry price
        if (!hasTriggered) {
          const prevClose = i > 0 ? (ctx.data[i - 1] as { close?: number })?.close ?? null : null;
          const touchesEntry =
            (low <= d.price && high >= d.price) ||
            (prevClose !== null && (
              (prevClose <= d.price && (high >= d.price || open >= d.price)) ||
              (prevClose >= d.price && (low <= d.price || open <= d.price))
            ));

          if (touchesEntry) {
            hasTriggered = true;
            entryHitTime = bTime;
          } else {
            // Price hasn't reached entry level yet; trade is not active
            continue;
          }
        }

        // 2. Once triggered, evaluate Take Profit / Stop Loss / Candle Close
        if (isLong) {
          const hitStop = d.stopPrice != null && low <= d.stopPrice;
          const hitTarget = d.targetPrice != null && high >= d.targetPrice;
          if (hitStop && hitTarget) {
            // In the rare event both are touched on the same candle, infer order from open
            if (open >= d.price) {
              trackingPrice = d.stopPrice ?? null;
              trackingTime = bTime;
              trackingStatus = "CLOSED";
              break;
            } else {
              trackingPrice = d.targetPrice ?? null;
              trackingTime = bTime;
              trackingStatus = "CLOSED";
              break;
            }
          } else if (hitStop) {
            trackingPrice = d.stopPrice ?? null;
            trackingTime = bTime;
            trackingStatus = "CLOSED";
            break;
          } else if (hitTarget) {
            trackingPrice = d.targetPrice ?? null;
            trackingTime = bTime;
            trackingStatus = "CLOSED";
            break;
          }
        } else {
          // Short position
          const hitStop = d.stopPrice != null && high >= d.stopPrice;
          const hitTarget = d.targetPrice != null && low <= d.targetPrice;
          if (hitStop && hitTarget) {
            if (open <= d.price) {
              trackingPrice = d.stopPrice ?? null;
              trackingTime = bTime;
              trackingStatus = "CLOSED";
              break;
            } else {
              trackingPrice = d.targetPrice ?? null;
              trackingTime = bTime;
              trackingStatus = "CLOSED";
              break;
            }
          } else if (hitStop) {
            trackingPrice = d.stopPrice ?? null;
            trackingTime = bTime;
            trackingStatus = "CLOSED";
            break;
          } else if (hitTarget) {
            trackingPrice = d.targetPrice ?? null;
            trackingTime = bTime;
            trackingStatus = "CLOSED";
            break;
          }
        }

        trackingPrice = close;
        trackingTime = bTime;
      }

      if (hasTriggered && trackingPrice !== null && trackingTime !== null && entryHitTime !== null) {
        const lastSeriesTime = ctx.data[ctx.data.length - 1]!.time as number;
        if (lastSeriesTime > tEnd || trackingTime >= tEnd) {
          trackingStatus = "CLOSED";
        }

        entry.hasTriggered = true;
        entry.entryHitTime = entryHitTime;
        entry.xHitEntry = timeToX(ctx, entryHitTime);
        entry.yHitEntry = ctx.series.priceToCoordinate(d.price);
        entry.currentPrice = trackingPrice;
        entry.yCurrent = ctx.series.priceToCoordinate(trackingPrice);
        entry.xCurrent = timeToX(ctx, trackingTime);
        entry.trackingStatus = trackingStatus;
      } else {
        entry.hasTriggered = false;
        entry.entryHitTime = null;
        entry.xHitEntry = null;
        entry.yHitEntry = null;
        entry.currentPrice = null;
        entry.yCurrent = null;
        entry.xCurrent = null;
      }
    }
  }
  if (d.type === "channel") {
    entry.x3 = d.time3 != null ? timeToX(ctx, d.time3) : null;
    entry.y3 = d.price3 != null ? ctx.series.priceToCoordinate(d.price3) : null;
  }
  if (d.type === "fixed-range-volume-profile") {
    entry.volumeProfile = resolveVolumeProfile(d, ctx);
  }
  return entry;
}

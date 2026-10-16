import {
  type IPriceLine,
  type ISeriesApi,
  LineStyle,
} from "lightweight-charts";
import type { Ref, RtCtx, TickData } from "./types.ts";

export function removePriceLineSafe(
  ref: Ref<IPriceLine | null>,
  series: ISeriesApi<"Candlestick">,
): void {
  if (!ref.current) return;
  try {
    series.removePriceLine(ref.current);
  } catch {
    /* ignore */
  }
  ref.current = null;
}

export function upsertPriceLine(
  ref: Ref<IPriceLine | null>,
  series: ISeriesApi<"Candlestick">,
  enabled: boolean,
  opts: Parameters<ISeriesApi<"Candlestick">["createPriceLine"]>[0],
): void {
  if (!enabled) {
    removePriceLineSafe(ref, series);
    return;
  }
  if (ref.current) {
    try {
      ref.current.applyOptions(opts);
      return;
    } catch {
      ref.current = null;
    }
  }
  ref.current = series.createPriceLine(opts);
}

export function applyBidAskLines(
  tick: TickData | undefined,
  prefs: { showBidLine: boolean; showAskLine: boolean },
  ctx: RtCtx,
): void {
  const series = ctx.series;
  if (!tick) {
    removePriceLineSafe(ctx.bidLine, series);
    removePriceLineSafe(ctx.askLine, series);
    removePriceLineSafe(ctx.midLine, series);
    return;
  }
  upsertPriceLine(ctx.bidLine, series, prefs.showBidLine, {
    price: tick.bid,
    color: ctx.colors.bidLine,
    lineWidth: 2,
    lineStyle: LineStyle.Dashed,
    axisLabelVisible: true,
    title: "Bid",
    axisLabelColor: ctx.colors.bidLabelBg,
    axisLabelTextColor: "#ffffff",
  });
  upsertPriceLine(ctx.askLine, series, prefs.showAskLine, {
    price: tick.ask,
    color: ctx.colors.askLine,
    lineWidth: 2,
    lineStyle: LineStyle.Dashed,
    axisLabelVisible: true,
    title: "Ask",
    axisLabelColor: ctx.colors.askLabelBg,
    axisLabelTextColor: "#ffffff",
  });
  // Mid line only when both bid+ask are hidden — otherwise it overlaps them.
  upsertPriceLine(
    ctx.midLine,
    series,
    !prefs.showBidLine && !prefs.showAskLine,
    {
      price: (tick.bid + tick.ask) / 2,
      color: "#7aa2ff99",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: "",
      axisLabelColor: "#3b5ab5",
      axisLabelTextColor: "#ffffff",
    },
  );
}

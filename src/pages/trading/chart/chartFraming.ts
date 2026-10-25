import type { IChartApi, ISeriesApi } from "lightweight-charts";
import { TF_INTERVAL_MS, type Timeframe } from "../constants.ts";

export function findClosestCandleIndex(
  data: readonly { time: any }[],
  targetTime: number,
): number {
  if (data.length === 0) return 0;
  let lo = 0;
  let hi = data.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const t = Number(data[mid]?.time);
    if (t < targetTime) lo = mid + 1;
    else if (t > targetTime) hi = mid - 1;
    else return mid;
  }
  if (lo >= data.length) return data.length - 1;
  if (hi < 0) return 0;
  const tLo = Number(data[lo]?.time);
  const tHi = Number(data[hi]?.time);
  return Math.abs(tLo - targetTime) < Math.abs(tHi - targetTime) ? lo : hi;
}

function getInternalPriceScale(chart: any) {
  const widget = chart?._private__chartWidget || chart?.aw;
  const model = widget?._internal_model?.() || widget?.$t?.() || widget?.$i;
  const panes = model?._internal_panes?.() || (typeof model?.qc === "function" ? model.qc() : model?.yc);
  const pane = panes?.[0];
  const ps = pane?._internal_rightPriceScale?.() || (typeof pane?.D_ === "function" ? pane.D_() : pane?.p_);
  return { model, pane, ps };
}

function applyPreservedScale(
  chart: IChartApi,
  range: { min: number; max: number } | null | undefined,
  keepAutoScale: boolean,
  series?: ISeriesApi<"Candlestick"> | null,
) {
  if (range && range.max > range.min) {
    setChartPriceRange(chart, range, series);
    return;
  }
  try {
    chart.priceScale("right").applyOptions({ autoScale: true });
    if (!keepAutoScale) {
      requestAnimationFrame(() => {
        try { chart.priceScale("right").applyOptions({ autoScale: false }); } catch {}
      });
    }
  } catch {}
}

export function getChartPriceRange(
  chart: IChartApi | null,
  candleSeries?: ISeriesApi<"Candlestick"> | null,
): { min: number; max: number } | null {
  if (!chart) return null;
  try {
    const { pane, ps } = getInternalPriceScale(chart);
    if (ps) {
      if (!ps._internal_priceRange?.() && typeof pane?._internal_momentaryAutoScale === "function") pane._internal_momentaryAutoScale();
      const currentPr = (typeof ps._internal_priceRange === "function" ? ps._internal_priceRange() : null) || (typeof ps.Lh === "function" ? ps.Lh() : ps.Ih);
      if (currentPr) {
        const isEmpty = typeof currentPr._internal_isEmpty === "function" ? currentPr._internal_isEmpty() : (typeof currentPr.Ni === "function" ? currentPr.Ni() : false);
        if (!isEmpty) {
          const min = typeof currentPr._internal_minValue === "function" ? currentPr._internal_minValue() : (typeof currentPr.Ph === "function" ? currentPr.Ph() : (currentPr._private__minValue ?? currentPr.kh));
          const max = typeof currentPr._internal_maxValue === "function" ? currentPr._internal_maxValue() : (typeof currentPr.Rh === "function" ? currentPr.Rh() : (currentPr._private__maxValue ?? currentPr.yh));
          if (typeof min === "number" && typeof max === "number" && !isNaN(min) && !isNaN(max) && max > min) return { min, max };
        }
      }
    }
  } catch {}

  const series = candleSeries ?? (chart as any)?.__candleSeries ?? (typeof window !== "undefined" ? (window as any).__candleSeries : null);
  if (series && typeof series.coordinateToPrice === "function") {
    try {
      const paneHeight = typeof (chart as any).paneSize === "function" ? (chart as any).paneSize().height : 500;
      if (paneHeight > 0) {
        const pTop = series.coordinateToPrice(0);
        const pBottom = series.coordinateToPrice(paneHeight);
        if (typeof pTop === "number" && typeof pBottom === "number" && !isNaN(pTop) && !isNaN(pBottom) && pTop > pBottom) {
          const visibleSpan = pTop - pBottom;
          const min = pBottom + visibleSpan * 0.1;
          const max = pTop - visibleSpan * 0.2;
          if (max > min) return { min, max };
        }
      }
    } catch {}
  }
  return null;
}

export function setChartPriceRange(
  chart: IChartApi | null,
  range: { min: number; max: number } | null,
  _candleSeries?: ISeriesApi<"Candlestick"> | null,
): boolean {
  if (!chart || !range || range.max <= range.min) return false;
  let success = false;
  try {
    const { model, pane, ps } = getInternalPriceScale(chart);
    if (ps) {
      if (!ps._internal_priceRange?.() && typeof pane?._internal_momentaryAutoScale === "function") pane._internal_momentaryAutoScale();
      const currentPr = (typeof ps._internal_priceRange === "function" ? ps._internal_priceRange() : null) || (typeof ps.Lh === "function" ? ps.Lh() : ps.Ih);
      if (currentPr) {
        if (typeof ps._internal_setMode === "function") ps._internal_setMode({ _internal_autoScale: false });
        else if (typeof ps.Ro === "function") ps.Ro({ Wn: false });
        const newPr = typeof currentPr._internal_clone === "function" ? currentPr._internal_clone() : typeof currentPr.Th === "function" ? currentPr.Th() : Object.assign(Object.create(Object.getPrototypeOf(currentPr)), currentPr);
        if (newPr) {
          newPr._private__minValue = range.min;
          newPr.kh = range.min;
          newPr._private__maxValue = range.max;
          newPr.yh = range.max;
          if (typeof ps._internal_setPriceRange === "function") ps._internal_setPriceRange(newPr);
          else if (typeof ps.Ao === "function") ps.Ao(newPr);
          if (typeof pane?._internal_updateAllSources === "function") pane._internal_updateAllSources();
          else if (typeof pane?.x_ === "function") pane.x_();
          if (typeof model?._internal_lightUpdate === "function") model._internal_lightUpdate();
          else if (typeof model?.Kl === "function") model.Kl();
          success = true;
        }
      }
    }
  } catch {}
  try {
    chart.priceScale("right").applyOptions({ autoScale: false });
    success = true;
  } catch {}
  return success;
}

export interface ChartTimeScaleState {
  barSpacing: number;
  rightOffset: number;
  visibleBars: number;
  scrollPosition: number;
  lastVisibleTime?: number;
  lastVisibleEndTime?: number;
  rightMarginBars?: number;
}

export function getChartTimeScaleState(
  chart: IChartApi | null,
  data?: readonly { time: any }[],
  timeframe?: Timeframe,
): ChartTimeScaleState | null {
  if (!chart) return null;
  try {
    const ts = chart.timeScale();
    const opt = ts.options();
    const barSpacing = opt.barSpacing;
    const rightOffset = opt.rightOffset ?? 0;
    const scrollPosition = ts.scrollPosition();
    const lr = ts.getVisibleLogicalRange();
    const vr = ts.getVisibleRange();
    const visibleBars = lr ? Math.max(5, Math.round(lr.to - lr.from)) : 80;
    let lastVisibleTime: number | undefined = undefined;
    let lastVisibleEndTime: number | undefined = undefined;
    let rightMarginBars = 0;
    const tfSec = timeframe && TF_INTERVAL_MS[timeframe] ? TF_INTERVAL_MS[timeframe] / 1000 : 0;
    if (data && data.length > 0 && lr) {
      const rightBarIdx = Math.min(data.length - 1, Math.floor(lr.to));
      if (rightBarIdx >= 0) {
        const bar = data[rightBarIdx];
        if (bar) {
          lastVisibleTime = Number(bar.time ?? (bar as any).timestamp);
          if (tfSec > 0) lastVisibleEndTime = lastVisibleTime + tfSec;
        }
        rightMarginBars = Math.max(0, Math.round(lr.to - rightBarIdx - 1));
      }
    }
    if (!lastVisibleTime && vr && typeof vr.to === "number") {
      lastVisibleTime = vr.to as number;
      if (tfSec > 0) lastVisibleEndTime = (vr.to as number) + tfSec;
    }
    if (!lastVisibleTime && data && data.length > 0) {
      const lastBar = data[data.length - 1];
      if (lastBar) {
        lastVisibleTime = Number(lastBar.time ?? (lastBar as any).timestamp);
        if (tfSec > 0) lastVisibleEndTime = lastVisibleTime + tfSec;
      }
    }
    if (typeof barSpacing === "number" && !isNaN(barSpacing) && barSpacing > 0) {
      const state: ChartTimeScaleState = { barSpacing, rightOffset, visibleBars, scrollPosition, lastVisibleTime };
      if (typeof lastVisibleEndTime === "number") state.lastVisibleEndTime = lastVisibleEndTime;
      if (rightMarginBars > 0) state.rightMarginBars = rightMarginBars;
      return state;
    }
  } catch {}
  return null;
}

/**
 * Frames a historical viewport centered on targetTime with consistent barCount.
 */
export function frameHistoricalViewport(
  chart: IChartApi | null,
  data: readonly { time: any }[],
  targetTime: number,
  targetBarCount: number,
  keepAutoScale: boolean = false,
  visibleTimeRange?: { from: number; to: number } | null,
  preservedPriceRange?: { min: number; max: number } | null,
  preservedTimeScale?: ChartTimeScaleState | null,
  series?: ISeriesApi<"Candlestick"> | null,
  currentTimeframe?: Timeframe,
): void {
  if (!chart || data.length === 0) return;
  const ts = chart.timeScale();
  if (!ts) return;

  if (preservedTimeScale && preservedTimeScale.barSpacing > 0) {
    try {
      const newTfSec = currentTimeframe && TF_INTERVAL_MS[currentTimeframe] ? TF_INTERVAL_MS[currentTimeframe] / 1000 : 3600;
      const targetTimeFromEnd = preservedTimeScale.lastVisibleEndTime ? preservedTimeScale.lastVisibleEndTime - newTfSec : undefined;
      const anchorTime = targetTimeFromEnd ?? preservedTimeScale.lastVisibleTime ?? visibleTimeRange?.to ?? targetTime;
      const rightIdx = findClosestCandleIndex(data, anchorTime);
      const visibleBars = preservedTimeScale.visibleBars > 0 ? preservedTimeScale.visibleBars : targetBarCount || 80;
      const rightMargin = preservedTimeScale.rightMarginBars ?? (preservedTimeScale.scrollPosition > 0 ? preservedTimeScale.scrollPosition : 0);
      const to = rightIdx + 1 + rightMargin;
      const from = Math.max(0, to - visibleBars);
      ts.applyOptions({ barSpacing: preservedTimeScale.barSpacing, rightOffset: preservedTimeScale.rightOffset ?? rightMargin });
      ts.setVisibleLogicalRange({ from, to });
      applyPreservedScale(chart, preservedPriceRange, keepAutoScale, series);
      return;
    } catch {}
  }

  if (visibleTimeRange && visibleTimeRange.from < visibleTimeRange.to) {
    const fromIdx = findClosestCandleIndex(data, visibleTimeRange.from);
    const toIdx = findClosestCandleIndex(data, visibleTimeRange.to);
    const span = toIdx - fromIdx;
    if (span >= 15 && span <= 350) {
      try {
        ts.setVisibleRange({ from: visibleTimeRange.from as any, to: visibleTimeRange.to as any });
        applyPreservedScale(chart, preservedPriceRange, keepAutoScale, series);
        return;
      } catch {}
    }
  }

  const count = targetBarCount && targetBarCount > 5 ? targetBarCount : 80;
  const centerIdx = findClosestCandleIndex(data, targetTime);
  const from = Math.max(0, centerIdx - Math.round(count / 2));
  try {
    ts.setVisibleLogicalRange({ from, to: from + count });
    applyPreservedScale(chart, preservedPriceRange, keepAutoScale, series);
  } catch {}
}

/**
 * Frames the latest candles on the chart canvas, keeping the rightmost candle, zoom ratio, and price range fixed.
 */
export function frameLatestCandles(
  chart: IChartApi | null,
  barCount: number,
  keepAutoScale: boolean = false,
  preservedPriceRange?: { min: number; max: number } | null,
  preservedTimeScale?: ChartTimeScaleState | null,
  data?: readonly { time: any }[],
  series?: ISeriesApi<"Candlestick"> | null,
): void {
  if (!chart || barCount <= 0) return;
  const ts = chart.timeScale();
  if (!ts) return;
  try {
    if (preservedTimeScale && preservedTimeScale.barSpacing > 0) {
      const visibleBars = preservedTimeScale.visibleBars > 0 ? preservedTimeScale.visibleBars : Math.min(barCount, 80);
      let to: number;
      const rightMargin = preservedTimeScale.rightMarginBars ?? (typeof preservedTimeScale.scrollPosition === "number" && preservedTimeScale.scrollPosition > 0 ? preservedTimeScale.scrollPosition : 0);
      if (data && data.length > 0 && typeof preservedTimeScale.lastVisibleTime === "number") {
        const rightIdx = findClosestCandleIndex(data, preservedTimeScale.lastVisibleTime);
        to = rightIdx + 1 + rightMargin;
      } else {
        const scrollPos = typeof preservedTimeScale.scrollPosition === "number" ? preservedTimeScale.scrollPosition : (preservedTimeScale.rightOffset ?? 5);
        to = barCount + scrollPos;
      }
      const from = Math.max(0, to - visibleBars);
      ts.applyOptions({ barSpacing: preservedTimeScale.barSpacing, rightOffset: preservedTimeScale.rightOffset ?? rightMargin });
      ts.setVisibleLogicalRange({ from, to });
      if (!data && typeof preservedTimeScale.scrollPosition === "number") {
        ts.scrollToPosition(preservedTimeScale.scrollPosition, false);
      }
    } else {
      const visibleBars = Math.min(barCount, 80);
      const from = Math.max(0, barCount - visibleBars);
      ts.setVisibleLogicalRange({ from, to: barCount + 8 });
    }
    applyPreservedScale(chart, preservedPriceRange, keepAutoScale, series);
  } catch {
    try { ts.scrollToPosition(8, false); } catch {}
  }
}

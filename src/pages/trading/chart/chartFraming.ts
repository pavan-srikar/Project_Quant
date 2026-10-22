import type { IChartApi } from "lightweight-charts";

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

/**
 * Reads the current visible Y-axis price range from Lightweight Charts' right price scale.
 */
export function getChartPriceRange(
  chart: IChartApi | null,
): { min: number; max: number } | null {
  if (!chart) return null;
  try {
    const chartObj = chart as any;
    const widget = chartObj?._private__chartWidget;
    const model = widget?._internal_model?.();
    const pane = model?._internal_panes?.()?.[0];
    const ps = pane?._internal_rightPriceScale?.();
    if (!ps || !pane || !model) return null;

    if (!ps._internal_priceRange()) {
      pane._internal_momentaryAutoScale?.();
    }
    const currentPr = ps._internal_priceRange?.();
    if (!currentPr || currentPr._internal_isEmpty?.()) return null;

    const min = currentPr._internal_minValue?.();
    const max = currentPr._internal_maxValue?.();
    if (
      typeof min === "number" &&
      typeof max === "number" &&
      !isNaN(min) &&
      !isNaN(max) &&
      max > min
    ) {
      return { min, max };
    }
  } catch {}
  return null;
}

export function setChartPriceRange(
  chart: IChartApi | null,
  range: { min: number; max: number } | null,
): boolean {
  if (!chart || !range || range.max <= range.min) return false;
  try {
    const chartObj = chart as any;
    const widget = chartObj?._private__chartWidget;
    const model = widget?._internal_model?.();
    const pane = model?._internal_panes?.()?.[0];
    const ps = pane?._internal_rightPriceScale?.();
    if (!ps || !pane || !model) return false;

    if (!ps._internal_priceRange()) {
      pane._internal_momentaryAutoScale?.();
    }
    const currentPr = ps._internal_priceRange?.();
    if (!currentPr) return false;

    ps._internal_setMode?.({ _internal_autoScale: false });
    const newPr = currentPr._internal_clone?.();
    if (newPr) {
      newPr._private__minValue = range.min;
      newPr._private__maxValue = range.max;
      ps._internal_setPriceRange?.(newPr);
      pane._internal_updateAllSources?.();
      model._internal_lightUpdate?.();
      try {
        chart.priceScale("right").applyOptions({ autoScale: false });
      } catch {}
      return true;
    }
  } catch {}
  return false;
}

export interface ChartTimeScaleState {
  barSpacing: number;
  rightOffset: number;
  visibleBars: number;
  scrollPosition: number;
  lastVisibleTime?: number;
}

export function getChartTimeScaleState(
  chart: IChartApi | null,
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
    const lastVisibleTime = vr && typeof vr.to === "number" ? (vr.to as number) : undefined;
    if (typeof barSpacing === "number" && !isNaN(barSpacing) && barSpacing > 0) {
      return { barSpacing, rightOffset, visibleBars, scrollPosition, lastVisibleTime };
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
): void {
  if (!chart || data.length === 0) return;
  const ts = chart.timeScale();
  if (!ts) return;

  const applyScale = () => {
    if (preservedPriceRange && preservedPriceRange.max > preservedPriceRange.min) {
      try {
        chart.priceScale("right").applyOptions({ autoScale: false });
      } catch {}
      setChartPriceRange(chart, preservedPriceRange);
      return;
    }
    try {
      chart.priceScale("right").applyOptions({ autoScale: true });
      if (!keepAutoScale) {
        requestAnimationFrame(() => {
          try {
            chart.priceScale("right").applyOptions({ autoScale: false });
          } catch {}
        });
      }
    } catch {}
  };

  if (preservedTimeScale && preservedTimeScale.barSpacing > 0) {
    try {
      const anchorTime = preservedTimeScale.lastVisibleTime ?? visibleTimeRange?.to ?? targetTime;
      const rightIdx = findClosestCandleIndex(data, anchorTime);
      const visibleBars = preservedTimeScale.visibleBars > 0 ? preservedTimeScale.visibleBars : targetBarCount || 80;
      const scrollPos = typeof preservedTimeScale.scrollPosition === "number" ? preservedTimeScale.scrollPosition : 0;
      const to = rightIdx + 1 + Math.max(0, scrollPos);
      const from = Math.max(0, to - visibleBars);
      ts.setVisibleLogicalRange({ from, to });
      ts.applyOptions({
        barSpacing: preservedTimeScale.barSpacing,
        rightOffset: preservedTimeScale.rightOffset ?? 0,
      });
      applyScale();
      return;
    } catch {}
  }

  if (visibleTimeRange && visibleTimeRange.from < visibleTimeRange.to) {
    const fromIdx = findClosestCandleIndex(data, visibleTimeRange.from);
    const toIdx = findClosestCandleIndex(data, visibleTimeRange.to);
    const span = toIdx - fromIdx;
    if (span >= 15 && span <= 350) {
      try {
        ts.setVisibleRange({
          from: visibleTimeRange.from as any,
          to: visibleTimeRange.to as any,
        });
        applyScale();
        return;
      } catch {}
    }
  }

  const count = targetBarCount && targetBarCount > 5 ? targetBarCount : 80;
  const centerIdx = findClosestCandleIndex(data, targetTime);
  const halfBars = Math.round(count / 2);
  const from = Math.max(0, centerIdx - halfBars);
  const to = from + count;

  try {
    ts.setVisibleLogicalRange({ from, to });
    applyScale();
  } catch {}
}

/**
 * Frames the latest candles on the chart canvas.
 */
export function frameLatestCandles(
  chart: IChartApi | null,
  barCount: number,
  keepAutoScale: boolean = false,
  preservedPriceRange?: { min: number; max: number } | null,
  preservedTimeScale?: ChartTimeScaleState | null,
): void {
  if (!chart || barCount <= 0) return;
  const ts = chart.timeScale();
  if (!ts) return;
  const apply = () => {
    try {
      if (preservedTimeScale && preservedTimeScale.barSpacing > 0) {
        const scrollPos =
          typeof preservedTimeScale.scrollPosition === "number"
            ? preservedTimeScale.scrollPosition
            : (preservedTimeScale.rightOffset ?? 5);
        const visibleBars =
          preservedTimeScale.visibleBars > 0 ? preservedTimeScale.visibleBars : Math.min(barCount, 80);
        const to = barCount + scrollPos;
        const from = Math.max(0, to - visibleBars);
        ts.setVisibleLogicalRange({ from, to });
        ts.applyOptions({
          barSpacing: preservedTimeScale.barSpacing,
          rightOffset: preservedTimeScale.rightOffset ?? 0,
        });
        ts.scrollToPosition(scrollPos, false);
      } else {
        const visibleBars = Math.min(barCount, 80);
        const from = Math.max(0, barCount - visibleBars);
        const to = barCount + 8;
        ts.setVisibleLogicalRange({ from, to });
      }

      if (preservedPriceRange && preservedPriceRange.max > preservedPriceRange.min) {
        try {
          chart.priceScale("right").applyOptions({ autoScale: false });
        } catch {}
        setChartPriceRange(chart, preservedPriceRange);
      } else {
        chart.priceScale("right").applyOptions({ autoScale: true });
        if (!keepAutoScale) {
          requestAnimationFrame(() => {
            try {
              chart.priceScale("right").applyOptions({ autoScale: false });
            } catch {}
          });
        }
      }
    } catch {
      try {
        ts.scrollToPosition(8, false);
      } catch {}
    }
  };
  apply();
}

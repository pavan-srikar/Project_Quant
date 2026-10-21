import type { IChartApi, ISeriesApi } from "lightweight-charts";
import { getMinMove } from "../utils.ts";

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
 * Frames a historical viewport centered on targetTime with consistent barCount (aspect ratio).
 * If visibleTimeRange is provided, uses setVisibleRange to preserve exact time bounds.
 * Momentarily auto-scales the price scale so candles are properly framed vertically,
 * then locks to manual if keepAutoScale is false.
 */
export function frameHistoricalViewport(
  chart: IChartApi | null,
  data: readonly { time: any }[],
  targetTime: number,
  targetBarCount: number,
  keepAutoScale: boolean = false,
  visibleTimeRange?: { from: number; to: number } | null,
): void {
  if (!chart || data.length === 0) return;
  const ts = chart.timeScale();
  if (!ts) return;

  const applyScale = () => {
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

  const count = targetBarCount && targetBarCount > 10 ? Math.min(targetBarCount, 150) : 80;
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
): void {
  if (!chart || barCount <= 0) return;
  const ts = chart.timeScale();
  if (!ts) return;
  const apply = () => {
    try {
      const visibleBars = Math.min(barCount, 80);
      const from = Math.max(0, barCount - visibleBars);
      const to = barCount + 8;
      ts.setVisibleLogicalRange({ from, to });
      chart.priceScale("right").applyOptions({ autoScale: true });
      if (!keepAutoScale) {
        requestAnimationFrame(() => {
          try {
            chart.priceScale("right").applyOptions({ autoScale: false });
          } catch {}
        });
      }
    } catch {
      try {
        ts.scrollToPosition(8, false);
      } catch {}
    }
  };
  apply();
}

/**
 * Scales the right price axis vertically on mouse wheel when the cursor is positioned
 * over the price scale bar (TradingView style). When the cursor is over the main chart
 * pane, the event is allowed to propagate so Lightweight Charts handles default horizontal zoom.
 */
export function handlePriceScaleWheel(
  e: WheelEvent,
  container: HTMLDivElement,
  chart: IChartApi,
  seriesRef: { current: ISeriesApi<"Candlestick"> | null },
  pipDigits: number,
): void {
  if (e.deltaY === 0) return;

  const rect = container.getBoundingClientRect();
  const priceScaleWidth = chart.priceScale("right").width() || 80;

  // The price scale bar occupies the rightmost strip of the chart area.
  // Exclude the bottom time scale axis (~30px high).
  const isWithinX =
    e.clientX >= rect.right - priceScaleWidth && e.clientX <= rect.right;
  const isWithinY = e.clientY >= rect.top && e.clientY <= rect.bottom - 30;
  const isPriceAxisCell = Boolean(
    e.target &&
      (e.target as Element).closest?.("table tr:first-child td:last-child"),
  );

  if (!((isWithinX && isWithinY) || isPriceAxisCell)) {
    // Cursor is over the main chart area: let event propagate so Lightweight Charts performs horizontal zoom.
    return;
  }

  // Intercept the wheel event before Lightweight Charts's default time-zoom handler receives it.
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();

  const chartObj = chart as any;
  const widget = chartObj?._private__chartWidget;
  const model = widget?._internal_model?.();
  const pane = model?._internal_panes?.()?.[0];
  const ps = pane?._internal_rightPriceScale?.();
  if (!ps || !pane || !model) return;

  // Ensure price scale range is computed if not yet cached
  if (!ps._internal_priceRange()) {
    pane._internal_momentaryAutoScale?.();
  }

  const currentPr = ps._internal_priceRange?.();
  if (!currentPr || currentPr._internal_isEmpty?.()) return;

  const min = currentPr._internal_minValue?.();
  const max = currentPr._internal_maxValue?.();
  if (
    typeof min !== "number" ||
    typeof max !== "number" ||
    isNaN(min) ||
    isNaN(max) ||
    max <= min
  ) {
    return;
  }

  // Determine anchor price at cursor level so the price under the cursor stays fixed in place
  const y = e.clientY - rect.top;
  const candleSeries = seriesRef.current;
  const rawP0 = candleSeries?.coordinateToPrice(y);
  const p0: number =
    rawP0 != null && Number.isFinite(rawP0 as unknown as number)
      ? (rawP0 as unknown as number)
      : (min + max) * 0.5;

  // Wheel up (negative deltaY): contract price range (zoom in / stretch candles vertically)
  // Wheel down (positive deltaY): expand price range (zoom out / compress candles vertically)
  const factor = Math.max(0.7, Math.min(1.4, Math.exp(e.deltaY * 0.0015)));

  const newMin = p0 - (p0 - min) * factor;
  const newMax = p0 + (max - p0) * factor;

  const minMove = getMinMove(pipDigits);
  if (newMax - newMin < minMove * 5 || newMax - newMin > (max - min) * 100) {
    return;
  }

  ps._internal_setMode?.({ _internal_autoScale: false });
  const newPr = currentPr._internal_clone?.();
  if (newPr) {
    newPr._private__minValue = newMin;
    newPr._private__maxValue = newMax;
    ps._internal_setPriceRange?.(newPr);
    pane._internal_updateAllSources?.();
    model._internal_lightUpdate?.();
  }
}

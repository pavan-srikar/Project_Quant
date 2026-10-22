import type { IChartApi, ISeriesApi, LogicalRange } from "lightweight-charts";
import { getChartPriceRange, setChartPriceRange } from "./chartFraming.ts";
import { getMinMove } from "../utils.ts";
import type { LoadMoreState } from "./types.ts";

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
  const isWithinX = e.clientX >= rect.right - priceScaleWidth && e.clientX <= rect.right;
  const isWithinY = e.clientY >= rect.top && e.clientY <= rect.bottom - 30;
  const isPriceAxisCell = Boolean(
    e.target && (e.target as Element).closest?.("table tr:first-child td:last-child"),
  );
  if (!((isWithinX && isWithinY) || isPriceAxisCell)) return;

  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();

  const currentPr = getChartPriceRange(chart);
  if (!currentPr) return;
  const { min, max } = currentPr;
  const y = e.clientY - rect.top;
  const rawP0 = seriesRef.current?.coordinateToPrice(y);
  const p0: number =
    rawP0 != null && Number.isFinite(rawP0 as unknown as number)
      ? (rawP0 as unknown as number)
      : (min + max) * 0.5;

  const factor = Math.max(0.7, Math.min(1.4, Math.exp(e.deltaY * 0.0015)));
  const newMin = p0 - (p0 - min) * factor;
  const newMax = p0 + (max - p0) * factor;
  const minMove = getMinMove(pipDigits);
  if (newMax - newMin < minMove * 5 || newMax - newMin > (max - min) * 100) return;

  setChartPriceRange(chart, { min: newMin, max: newMax });
}

export function createChartWheelHandler(
  container: HTMLDivElement,
  chart: IChartApi,
  candleSeriesRef: { current: ISeriesApi<"Candlestick"> | null },
  pipDigits: number,
  loadMoreRef: { current: LoadMoreState },
  handleRangeChange: (range: LogicalRange | null) => void,
): (e: WheelEvent) => void {
  return (e: WheelEvent) => {
    handlePriceScaleWheel(e, container, chart, candleSeriesRef, pipDigits);
    if (e.defaultPrevented) return;

    // Horizontal zoom-out clamping (wheel deltaY > 0):
    // When all available bars are in view and no older historical data exists,
    // stop zoom-out immediately so the chart does NOT drift to the left into empty space.
    if (e.deltaY > 0) {
      const ts = chart.timeScale();
      const range = ts.getVisibleLogicalRange();
      if (range) {
        const state = loadMoreRef.current;
        const series = candleSeriesRef.current;
        const barsInfo = series ? series.barsInLogicalRange(range) : null;
        const isAtOldestEdge = barsInfo ? barsInfo.barsBefore <= 0 : range.from <= 0;

        if (isAtOldestEdge) {
          if (state.noMoreData || range.from <= 0) {
            if (!state.noMoreData && !state.loading && series) {
              handleRangeChange(range);
            }
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return;
          }
        }
      }
    }
  };
}

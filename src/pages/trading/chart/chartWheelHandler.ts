import type { IChartApi, ISeriesApi, LogicalRange } from "lightweight-charts";
import { handlePriceScaleWheel } from "./chartFraming.ts";
import type { LoadMoreState } from "./types.ts";

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

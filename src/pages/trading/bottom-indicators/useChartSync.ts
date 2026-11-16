import type {
  IChartApi,
  ISeriesApi,
  MouseEventParams,
} from "lightweight-charts";
import { useEffect } from "react";

export function useChartSync(
  chartRef: React.RefObject<IChartApi | null>,
  mainChart: IChartApi | null | undefined,
  chartEpoch: number,
  isSubInteractingRef: React.RefObject<boolean>,
  timePriceMap: Map<number, number>,
  mainSeriesRef: React.RefObject<ISeriesApi<any> | null>,
  onCrosshairTimeChange?: (time: number | null) => void,
) {
  // 1. Bidirectional zero-lag synchronization between mainChart and sub-chart
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !mainChart) return;

    let isSyncing = false;

    const syncRange = (from: IChartApi, to: IChartApi) => {
      if (isSyncing) return;
      const fromRange = from.timeScale().getVisibleLogicalRange();
      if (!fromRange) return;
      const toRange = to.timeScale().getVisibleLogicalRange();
      if (
        toRange &&
        Math.abs(toRange.from - fromRange.from) < 0.001 &&
        Math.abs(toRange.to - fromRange.to) < 0.001
      ) {
        return;
      }
      isSyncing = true;
      try {
        to.timeScale().setVisibleLogicalRange(fromRange);
      } catch {
      } finally {
        isSyncing = false;
      }
    };

    const onMainRangeChange = () => syncRange(mainChart, chart);
    const onSubRangeChange = () => {
      if (isSubInteractingRef.current) {
        syncRange(chart, mainChart);
      }
    };

    mainChart.timeScale().subscribeVisibleLogicalRangeChange(onMainRangeChange);
    chart.timeScale().subscribeVisibleLogicalRangeChange(onSubRangeChange);

    // Initial sync
    syncRange(mainChart, chart);

    return () => {
      try {
        mainChart
          .timeScale()
          .unsubscribeVisibleLogicalRangeChange(onMainRangeChange);
      } catch {}
      try {
        chart
          .timeScale()
          .unsubscribeVisibleLogicalRangeChange(onSubRangeChange);
      } catch {}
    };
  }, [mainChart, chartEpoch, chartRef, isSubInteractingRef]);

  // 1b. Force sync sub-chart range whenever indicator data updates (e.g. coin switch)
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !mainChart) return;

    const syncWithMain = () => {
      if (isSubInteractingRef.current) return;
      try {
        const fromRange = mainChart.timeScale().getVisibleLogicalRange();
        if (fromRange) {
          chart.timeScale().setVisibleLogicalRange(fromRange);
        }
      } catch {}
    };

    syncWithMain();
    const raf = requestAnimationFrame(syncWithMain);
    return () => cancelAnimationFrame(raf);
  }, [mainChart, chartEpoch, chartRef, timePriceMap, isSubInteractingRef]);

  // 2. Align right price scale width with mainChart so timestamps align to the pixel
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !mainChart) return;

    let lastWidth = -1;
    const syncWidth = () => {
      try {
        const mainWidth = mainChart.priceScale("right").width();
        if (mainWidth > 0 && mainWidth !== lastWidth) {
          lastWidth = mainWidth;
          chart.applyOptions({ rightPriceScale: { minimumWidth: mainWidth } });
        }
      } catch {}
    };

    syncWidth();
    const interval = setInterval(syncWidth, 1000);
    return () => clearInterval(interval);
  }, [mainChart, chartEpoch, chartRef]);

  // 3. Sync crosshair position from mainChart to sub-chart
  useEffect(() => {
    if (!mainChart) return;

    let rafId: number | null = null;
    let pendingTime: number | null = null;

    const dispatchTimeChange = (time: number | null) => {
      pendingTime = time;
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          rafId = null;
          onCrosshairTimeChange?.(pendingTime);
        });
      }
    };

    const onMainCrosshair = (param: MouseEventParams) => {
      const chart = chartRef.current;
      const mainSeries = mainSeriesRef.current;
      if (!chart || !mainSeries) return;

      if (!param.time) {
        try {
          chart.clearCrosshairPosition();
        } catch {}
        dispatchTimeChange(null);
        return;
      }

      dispatchTimeChange(param.time as number);

      const val = timePriceMap.get(param.time as number);
      if (val !== undefined) {
        try {
          chart.setCrosshairPosition(val, param.time, mainSeries);
        } catch {}
      } else {
        try {
          chart.clearCrosshairPosition();
        } catch {}
      }
    };

    mainChart.subscribeCrosshairMove(onMainCrosshair);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      try {
        mainChart.unsubscribeCrosshairMove(onMainCrosshair);
      } catch {}
    };
  }, [mainChart, timePriceMap, chartEpoch, chartRef, mainSeriesRef, onCrosshairTimeChange]);

  // 4. Sub-chart crosshair move to update header values
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    let rafId: number | null = null;
    let pendingTime: number | null = null;

    const dispatchTimeChange = (time: number | null) => {
      pendingTime = time;
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          rafId = null;
          onCrosshairTimeChange?.(pendingTime);
        });
      }
    };

    const onSubCrosshair = (param: MouseEventParams) => {
      if (!param.time) {
        dispatchTimeChange(null);
        return;
      }
      dispatchTimeChange(param.time as number);
    };

    chart.subscribeCrosshairMove(onSubCrosshair);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      try {
        chart.unsubscribeCrosshairMove(onSubCrosshair);
      } catch {}
    };
  }, [chartRef, chartEpoch, onCrosshairTimeChange]);
}

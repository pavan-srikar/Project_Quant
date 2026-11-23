import type { IChartApi, ISeriesApi } from "lightweight-charts";
import { useEffect, useMemo, useRef } from "react";
import type { IndicatorSettings } from "../../../hooks/useIndicatorSettings.ts";
import type { IndicatorType } from "../../../lib/indicators.ts";
import { PineRendererPrimitive } from "../../../lib/chart-plugins/pine-primitive";
import { buildIndicatorSeries } from "./seriesBuilders.ts";
import { updateSeriesData } from "./seriesUpdate.ts";
import type { IndicatorCalculatedData, SeriesState } from "./types.ts";

export function useIndicatorSeries(
  chartRef: React.RefObject<IChartApi | null>,
  activeBelow: IndicatorType[],
  indicatorData: IndicatorCalculatedData,
  candleTimes: number[],
  selectedType: IndicatorType,
  currentSettings: IndicatorSettings,
  mainChart?: IChartApi | null,
  chartEpoch: number = 0,
) {
  const seriesStateRef = useRef<SeriesState | null>(null);
  const mainSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const primitiveRef = useRef<PineRendererPrimitive | null>(null);

  // Compute a settings key for visual configuration of the selected indicator
  const currentSettingsKey = useMemo(() => {
    return JSON.stringify({
      type: selectedType,
      color: currentSettings.color,
      lineWidth: currentSettings.lineWidth,
      signalColor: currentSettings.signalColor,
      histUpColor: currentSettings.histUpColor,
      histDownColor: currentSettings.histDownColor,
      overbought: currentSettings.overbought,
      oversold: currentSettings.oversold,
    });
  }, [selectedType, currentSettings]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    if (activeBelow.length === 0 || !indicatorData) {
      if (primitiveRef.current) {
        try {
          mainSeriesRef.current?.detachPrimitive(primitiveRef.current);
        } catch {}
        primitiveRef.current = null;
      }
      if (seriesStateRef.current) {
        if (seriesStateRef.current.chart === chart) {
          for (const s of seriesStateRef.current.allSeries) {
            try {
              chart.removeSeries(s);
            } catch {}
          }
        }
        seriesStateRef.current = null;
        mainSeriesRef.current = null;
      }
      return;
    }

    const state = seriesStateRef.current;
    const isSameSeries =
      state &&
      state.chart === chart &&
      state.type === indicatorData.type &&
      state.settingsKey === currentSettingsKey;

    const syncLogicalRange = () => {
      const targetRange = mainChart?.timeScale().getVisibleLogicalRange();
      if (targetRange) {
        try {
          chart.timeScale().setVisibleLogicalRange(targetRange);
        } catch {}
      } else {
        try {
          chart.timeScale().fitContent();
        } catch {}
      }
    };

    const paneLabels = (indicatorData.type === "CUSTOM" && indicatorData.labels)
      ? indicatorData.labels.filter((l) => !l.forceOverlay)
      : [];

    if (isSameSeries) {
      // Just update data on existing series (smooth, 0ms, zero lag!)
      const prevCount = state.lastBarCount;
      const prevFirstTime = state.lastFirstTime;
      updateSeriesData(state, indicatorData, candleTimes, currentSettings);
      if (paneLabels.length > 0) {
        if (!primitiveRef.current) {
          primitiveRef.current = new PineRendererPrimitive();
          state.mainSeries.attachPrimitive(primitiveRef.current);
        }
        primitiveRef.current.updateData([], [], [], [], paneLabels);
      } else if (primitiveRef.current) {
        try {
          state.mainSeries.detachPrimitive(primitiveRef.current);
        } catch {}
        primitiveRef.current = null;
      }
      if (prevCount !== candleTimes.length || prevFirstTime !== candleTimes[0]) {
        syncLogicalRange();
        const raf = requestAnimationFrame(syncLogicalRange);
        return () => cancelAnimationFrame(raf);
      }
      return;
    }

    // Indicator type, style settings, or chart instance changed: rebuild series
    if (primitiveRef.current) {
      try {
        mainSeriesRef.current?.detachPrimitive(primitiveRef.current);
      } catch {}
      primitiveRef.current = null;
    }
    if (state) {
      if (state.chart === chart) {
        for (const s of state.allSeries) {
          try {
            chart.removeSeries(s);
          } catch {}
        }
      }
      seriesStateRef.current = null;
      mainSeriesRef.current = null;
    }

    const { mainSeries, allSeries, extraSeries } = buildIndicatorSeries(
      chart,
      indicatorData,
      candleTimes,
      currentSettings,
    );

    if (paneLabels.length > 0) {
      primitiveRef.current = new PineRendererPrimitive();
      mainSeries.attachPrimitive(primitiveRef.current);
      primitiveRef.current.updateData([], [], [], [], paneLabels);
    }

    mainSeriesRef.current = mainSeries;
    seriesStateRef.current = {
      chart,
      type: indicatorData.type,
      settingsKey: currentSettingsKey,
      mainSeries,
      allSeries,
      extraSeries,
    };

    // Align logical range with mainChart immediately
    syncLogicalRange();
    const raf = requestAnimationFrame(syncLogicalRange);
    return () => cancelAnimationFrame(raf);
  }, [
    indicatorData,
    activeBelow,
    candleTimes,
    currentSettingsKey,
    currentSettings,
    mainChart,
    chartRef,
    chartEpoch,
  ]);

  return { mainSeriesRef, seriesStateRef };
}

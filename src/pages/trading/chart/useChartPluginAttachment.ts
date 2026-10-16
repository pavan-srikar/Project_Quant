import type { ISeriesApi, ISeriesPrimitive, Time } from "lightweight-charts";
import { useEffect, type RefObject } from "react";
import type { Timeframe } from "../constants.ts";
import { attachPlugins, detachPlugins } from "./chartPluginManager.ts";

export interface UseChartPluginAttachmentParams {
  candleSeriesRef: RefObject<ISeriesApi<"Candlestick"> | null>;
  chartPluginsRef: RefObject<ISeriesPrimitive<Time>[]>;
  activePlugins: string[];
  isDark: boolean;
  selectedSymbol: string;
  timeframe: Timeframe;
  symbolCategory?: string;
}

export function useChartPluginAttachment({
  candleSeriesRef,
  chartPluginsRef,
  activePlugins,
  isDark,
  selectedSymbol,
  timeframe,
  symbolCategory,
}: UseChartPluginAttachmentParams) {
  useEffect(() => {
    if (!candleSeriesRef.current) return;
    const series = candleSeriesRef.current;
    detachPlugins(series, chartPluginsRef.current);
    chartPluginsRef.current = [];
    attachPlugins(
      series,
      activePlugins,
      { isDark, timeframe, symbolCategory },
      chartPluginsRef.current,
    );
  }, [activePlugins, isDark, selectedSymbol, timeframe, symbolCategory, candleSeriesRef, chartPluginsRef]);
}

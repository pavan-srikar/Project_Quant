import type { IChartApi } from "lightweight-charts";
import { useMemo, useState } from "react";
import type { IndicatorSettings } from "../../../hooks/useIndicatorSettings.ts";
import type { IndicatorType } from "../../../lib/indicators.ts";
import { IndicatorHeader } from "./IndicatorHeader.tsx";
import type { ContextMenuState } from "./types.ts";
import { useChartSync } from "./useChartSync.ts";
import { useIndicatorCalculation } from "./useIndicatorCalculation.ts";
import { useIndicatorChart } from "./useIndicatorChart.ts";
import { useIndicatorSeries } from "./useIndicatorSeries.ts";

export interface IndicatorPaneProps {
  type: IndicatorType;
  candles: any[];
  settings: IndicatorSettings;
  isDark?: boolean;
  timeframe?: string;
  mainChart?: IChartApi | null;
  showTimeScale: boolean;
  onOpenSettings: (type: IndicatorType) => void;
  onRemoveIndicator: (type: IndicatorType) => void;
  onContextMenu: (state: ContextMenuState) => void;
}

export function IndicatorPane({
  type,
  candles,
  settings,
  isDark = true,
  timeframe = "4h",
  mainChart,
  showTimeScale,
  onOpenSettings,
  onRemoveIndicator,
  onContextMenu,
}: IndicatorPaneProps) {
  const [crosshairTime, setCrosshairTime] = useState<number | null>(null);

  // 1. Indicator data calculations & crosshair lookup map
  const { candleTimes, firstBarClose, indicatorData, timePriceMap } = useIndicatorCalculation(
    candles,
    type,
    settings,
  );

  // 2. Chart instance lifecycle with showTimeScale flag
  const { chartContainerRef, chartRef, chartEpoch, isSubInteractingRef } =
    useIndicatorChart(timeframe, isDark, mainChart, showTimeScale);

  const activeBelow = useMemo(() => [type], [type]);

  // 3. Persistent chart series and in-place updates
  const { mainSeriesRef } = useIndicatorSeries(
    chartRef,
    activeBelow,
    indicatorData,
    candleTimes,
    type,
    settings,
    mainChart,
    chartEpoch,
    firstBarClose,
  );

  // 4. Synchronization with mainChart (range, price scale width, crosshair)
  useChartSync(
    chartRef,
    mainChart,
    chartEpoch,
    isSubInteractingRef,
    timePriceMap,
    mainSeriesRef,
    setCrosshairTime,
  );

  return (
    <div className="flex-1 min-h-[90px] w-full flex flex-col relative bg-[#131722] overflow-hidden">
      <IndicatorHeader
        type={type}
        settings={settings}
        indicatorData={indicatorData}
        crosshairTime={crosshairTime}
        onOpenSettings={onOpenSettings}
        onRemoveIndicator={onRemoveIndicator}
        onContextMenu={onContextMenu}
      />

      <div
        className="flex-1 min-h-0 w-full relative cursor-crosshair"
        ref={chartContainerRef}
        onDoubleClick={() => onOpenSettings(type)}
        onContextMenu={(e) => {
          e.preventDefault();
          onContextMenu({ x: e.clientX, y: e.clientY, type });
        }}
      />
    </div>
  );
}

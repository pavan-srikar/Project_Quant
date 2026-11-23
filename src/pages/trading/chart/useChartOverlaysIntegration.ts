import type { CandlestickData, IChartApi, ISeriesApi, Time } from "lightweight-charts";
import { useMemo, type RefObject } from "react";
import type { useChartPreferences } from "../../../hooks/useChartPreferences.ts";
import type { IndicatorType } from "../../../lib/indicators.ts";
import type { Position, Symbol } from "../../../services/schemas.ts";
import type { DrawingTool } from "../constants.ts";
import { useChallengeLevels } from "../useChallengeLevels.ts";
import { useIndicators } from "../useIndicators.ts";
import { useSlTpDrag } from "../useSlTpDrag.ts";
import type { SlTpMap, TickData } from "./types.ts";

export interface ChartOverlaysIntegrationParams {
  containerRef: RefObject<HTMLDivElement | null>;
  chartRef: RefObject<IChartApi | null>;
  candleSeriesRef: RefObject<ISeriesApi<"Candlestick"> | null>;
  slTpLinesRef: RefObject<SlTpMap>;
  drawingTool: DrawingTool;
  onModifyPosition?: (
    positionId: string,
    mods: { takeProfit?: number | null; stopLoss?: number | null },
  ) => void;
  pipDigits: number;
  symbolInfo?: Symbol;
  chartEpoch: number;
  chartPrefs: ReturnType<typeof useChartPreferences>;
  accountId?: string | null;
  selectedSymbol: string;
  positions: Position[];
  tick?: TickData;
  accountEquity: number;
  chartData: CandlestickData<Time>[];
  activeIndicators: IndicatorType[];
  isDark: boolean;
}

export function useChartOverlaysIntegration(params: ChartOverlaysIntegrationParams) {
  const {
    containerRef,
    chartRef,
    candleSeriesRef,
    slTpLinesRef,
    drawingTool,
    onModifyPosition,
    pipDigits,
    symbolInfo,
    chartEpoch,
    chartPrefs,
    accountId,
    selectedSymbol,
    positions,
    tick,
    accountEquity,
    chartData,
    activeIndicators,
    isDark,
  } = params;

  const dragPrice = useSlTpDrag(
    containerRef,
    chartRef,
    candleSeriesRef,
    slTpLinesRef,
    drawingTool,
    onModifyPosition,
    pipDigits,
    symbolInfo,
    chartEpoch,
  );

  const challengeFlags = useMemo(
    () => ({
      enabled: chartPrefs.challengeOverlay && !!accountId,
      dailyLoss: chartPrefs.challengeDailyLossLine,
      maxDrawdown: chartPrefs.challengeMaxDrawdownLine,
      profitTarget: chartPrefs.challengeProfitTargetLine,
    }),
    [
      chartPrefs.challengeOverlay,
      chartPrefs.challengeDailyLossLine,
      chartPrefs.challengeMaxDrawdownLine,
      chartPrefs.challengeProfitTargetLine,
      accountId,
    ],
  );

  useChallengeLevels({
    accountId,
    selectedSymbol,
    positions,
    tick,
    contractSize: symbolInfo?.contractSize || 100000,
    accountEquity,
    candleSeriesRef,
    flags: challengeFlags,
    chartEpoch,
  });

  const { pineTables } = useIndicators(
    chartRef,
    candleSeriesRef,
    chartData,
    activeIndicators,
    isDark,
    selectedSymbol,
    chartEpoch,
  );

  return { dragPrice, pineTables };
}

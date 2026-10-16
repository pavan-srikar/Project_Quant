import {
  ColorType,
  CrosshairMode,
  LineStyle,
  type DeepPartial,
  type ChartOptions,
} from "lightweight-charts";
import type { useChartPreferences } from "../../../hooks/useChartPreferences.ts";
import type { ChartColors } from "./types.ts";

export function buildChartOptions(
  colors: ChartColors,
  chartPrefs: ReturnType<typeof useChartPreferences>,
  timeframe: string,
  selectedSymbol: string,
): DeepPartial<ChartOptions> {
  return {
    layout: {
      background: { type: ColorType.Solid, color: colors.background },
      textColor: colors.text,
      fontFamily:
        "'JetBrains Mono', 'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
      fontSize: 11,
      attributionLogo: false,
    },
    grid: {
      vertLines: {
        color: colors.grid,
        style: LineStyle.Dotted,
        visible: chartPrefs.showGrid,
      },
      horzLines: {
        color: colors.grid,
        style: LineStyle.Dotted,
        visible: chartPrefs.showGrid,
      },
    },
    crosshair: {
      mode: CrosshairMode.Normal,
      vertLine: {
        color: colors.crosshair,
        width: 1,
        style: LineStyle.Dashed,
        labelBackgroundColor: "#363a45",
        labelVisible: true,
      },
      horzLine: {
        color: colors.crosshair,
        width: 1,
        style: LineStyle.Dashed,
        labelBackgroundColor: "#363a45",
        labelVisible: true,
      },
    },
    rightPriceScale: {
      borderColor: colors.grid,
      scaleMargins: { top: 0.06, bottom: 0.18 },
      autoScale: true,
      alignLabels: true,
      borderVisible: true,
      entireTextOnly: false,
      ticksVisible: true,
      minimumWidth: 80,
    },
    timeScale: {
      borderColor: colors.grid,
      timeVisible: true,
      secondsVisible: timeframe === "1m",
      rightOffset: timeframe === "1m" ? 10 : 6,
      minBarSpacing: 1.5,
      fixLeftEdge: false,
      fixRightEdge: false,
      borderVisible: true,
    },
    watermark: {
      visible: chartPrefs.showWatermark,
      text: selectedSymbol,
      fontSize: 56,
      color: colors.watermark,
      horzAlign: "center",
      vertAlign: "center",
    },
    handleScroll: {
      mouseWheel: true,
      pressedMouseMove: true,
      horzTouchDrag: true,
      vertTouchDrag: true,
    },
    handleScale: {
      mouseWheel: true,
      pinch: true,
      axisPressedMouseMove: { time: true, price: true },
      axisDoubleClickReset: { time: true, price: true },
    },
  };
}

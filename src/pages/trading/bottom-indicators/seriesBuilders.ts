import {
  LineStyle,
  type IChartApi,
  type ISeriesApi,
} from "lightweight-charts";
import type { IndicatorSettings } from "../../../hooks/useIndicatorSettings.ts";
import { alignLineData } from "./indicatorDataAlignment.ts";
import { buildCustomPlots, formatMacdHistogramData } from "./seriesBuilderHelpers.ts";
import type { IndicatorCalculatedData, SeriesState } from "./types.ts";

export interface BuildSeriesResult {
  mainSeries: ISeriesApi<any>;
  allSeries: ISeriesApi<any>[];
  extraSeries: SeriesState["extraSeries"];
}

export function buildIndicatorSeries(
  chart: IChartApi,
  indicatorData: NonNullable<IndicatorCalculatedData>,
  candleTimes: number[],
  currentSettings: IndicatorSettings,
): BuildSeriesResult {
  const allSeries: ISeriesApi<any>[] = [];
  let mainSeries: ISeriesApi<any>;
  const extraSeries: SeriesState["extraSeries"] = {};

  if (indicatorData.type === "RSI") {
    const rsiSeries = chart.addLineSeries({
      color: currentSettings.color || "#7e57c2",
      lineWidth: (currentSettings.lineWidth as any) ?? 2,
      priceLineVisible: false,
      lastValueVisible: true,
      priceFormat: {
        type: "custom",
        minMove: 0.01,
        formatter: (p: number) => p.toFixed(1),
      },
    });
    rsiSeries.setData(alignLineData(candleTimes, indicatorData.data));
    mainSeries = rsiSeries;
    allSeries.push(rsiSeries);

    const overbought = currentSettings.overbought ?? 70;
    const oversold = currentSettings.oversold ?? 30;
    rsiSeries.createPriceLine({
      price: overbought,
      color: "rgba(120, 123, 134, 0.35)",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: "",
    });
    rsiSeries.createPriceLine({
      price: 50,
      color: "rgba(120, 123, 134, 0.2)",
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      axisLabelVisible: false,
      title: "",
    });
    rsiSeries.createPriceLine({
      price: oversold,
      color: "rgba(120, 123, 134, 0.35)",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: "",
    });
  } else if (indicatorData.type === "MACD") {
    const histUp = currentSettings.histUpColor || "#26a69a";
    const histDown = currentSettings.histDownColor || "#ef5350";

    const histSeries = chart.addHistogramSeries({
      priceLineVisible: false,
      lastValueVisible: false,
      priceFormat: {
        type: "custom",
        minMove: 0.01,
        formatter: (p: number) => p.toFixed(2),
      },
    });
    histSeries.setData(
      formatMacdHistogramData(candleTimes, indicatorData.data.histogram, histUp, histDown),
    );
    histSeries.createPriceLine({
      price: 0,
      color: "rgba(120, 123, 134, 0.3)",
      lineWidth: 1,
      lineStyle: LineStyle.Solid,
      axisLabelVisible: false,
      title: "",
    });
    allSeries.push(histSeries);
    extraSeries.hist = histSeries;

    const macdSeries = chart.addLineSeries({
      color: currentSettings.color || "#2962ff",
      lineWidth: (currentSettings.lineWidth as any) ?? 1.5,
      priceLineVisible: false,
      lastValueVisible: true,
      priceFormat: {
        type: "custom",
        minMove: 0.01,
        formatter: (p: number) => p.toFixed(2),
      },
    });
    macdSeries.setData(alignLineData(candleTimes, indicatorData.data.macd));
    macdSeries.createPriceLine({
      price: 0,
      color: "rgba(120, 123, 134, 0.3)",
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      axisLabelVisible: false,
      title: "",
    });
    mainSeries = macdSeries;
    allSeries.push(macdSeries);

    const signalSeries = chart.addLineSeries({
      color: currentSettings.signalColor || "#ff6d00",
      lineWidth: (currentSettings.lineWidth as any) ?? 1.5,
      priceLineVisible: false,
      lastValueVisible: true,
      priceFormat: {
        type: "custom",
        minMove: 0.01,
        formatter: (p: number) => p.toFixed(2),
      },
    });
    signalSeries.setData(alignLineData(candleTimes, indicatorData.data.signal));
    allSeries.push(signalSeries);
    extraSeries.signal = signalSeries;
  } else if (indicatorData.type === "ATR") {
    const atrSeries = chart.addLineSeries({
      color: currentSettings.color || "#ff7043",
      lineWidth: (currentSettings.lineWidth as any) ?? 1.5,
      priceLineVisible: false,
      lastValueVisible: true,
      priceFormat: {
        type: "custom",
        minMove: 0.0001,
        formatter: (p: number) => p.toFixed(4),
      },
    });
    atrSeries.setData(alignLineData(candleTimes, indicatorData.data));
    mainSeries = atrSeries;
    allSeries.push(atrSeries);
  } else if (indicatorData.type === "STOCH") {
    const kSeries = chart.addLineSeries({
      color: currentSettings.color || "#2962ff",
      lineWidth: (currentSettings.lineWidth as any) ?? 1.5,
      priceLineVisible: false,
      lastValueVisible: true,
      priceFormat: {
        type: "custom",
        minMove: 0.01,
        formatter: (p: number) => p.toFixed(1),
      },
    });
    kSeries.setData(alignLineData(candleTimes, indicatorData.data.k));
    mainSeries = kSeries;
    allSeries.push(kSeries);

    const overbought = currentSettings.overbought ?? 80;
    const oversold = currentSettings.oversold ?? 20;
    kSeries.createPriceLine({
      price: overbought,
      color: "rgba(120, 123, 134, 0.35)",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: "",
    });
    kSeries.createPriceLine({
      price: oversold,
      color: "rgba(120, 123, 134, 0.35)",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: "",
    });

    const dSeries = chart.addLineSeries({
      color: currentSettings.signalColor || "#ff6d00",
      lineWidth: (currentSettings.lineWidth as any) ?? 1.5,
      priceLineVisible: false,
      lastValueVisible: true,
      priceFormat: {
        type: "custom",
        minMove: 0.01,
        formatter: (p: number) => p.toFixed(1),
      },
    });
    dSeries.setData(alignLineData(candleTimes, indicatorData.data.d));
    allSeries.push(dSeries);
    extraSeries.d = dSeries;
  } else if (indicatorData.type === "CCI") {
    const cciSeries = chart.addLineSeries({
      color: currentSettings.color || "#26c6da",
      lineWidth: (currentSettings.lineWidth as any) ?? 1.5,
      priceLineVisible: false,
      lastValueVisible: true,
      priceFormat: {
        type: "custom",
        minMove: 0.01,
        formatter: (p: number) => p.toFixed(2),
      },
    });
    cciSeries.setData(alignLineData(candleTimes, indicatorData.data));
    mainSeries = cciSeries;
    allSeries.push(cciSeries);

    cciSeries.createPriceLine({
      price: 100,
      color: "rgba(120, 123, 134, 0.35)",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: "",
    });
    cciSeries.createPriceLine({
      price: -100,
      color: "rgba(120, 123, 134, 0.35)",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: "",
    });
  } else if (indicatorData.type === "CUSTOM") {
    if (indicatorData.plots && indicatorData.plots.length > 0) {
      const customRes = buildCustomPlots(
        chart,
        candleTimes,
        indicatorData.plots,
        indicatorData.hlines,
        currentSettings,
      );
      mainSeries = customRes.mainSeries;
      allSeries.push(...customRes.allSeries);
    } else {
      const customSeries = chart.addLineSeries({
        color: currentSettings.color || "#2962ff",
        lineWidth: (currentSettings.lineWidth as any) ?? 1.5,
        priceLineVisible: false,
        lastValueVisible: true,
        priceFormat: {
          type: "custom",
          minMove: 0.01,
          formatter: (p: number) => p.toFixed(2),
        },
      });
      customSeries.setData(alignLineData(candleTimes, indicatorData.data));
      mainSeries = customSeries;
      allSeries.push(customSeries);
    }
  } else {
    // WR
    const wrSeries = chart.addLineSeries({
      color: currentSettings.color || "#ffca28",
      lineWidth: (currentSettings.lineWidth as any) ?? 1.5,
      priceLineVisible: false,
      lastValueVisible: true,
      priceFormat: {
        type: "custom",
        minMove: 0.01,
        formatter: (p: number) => p.toFixed(2),
      },
    });
    wrSeries.setData(alignLineData(candleTimes, indicatorData.data));
    mainSeries = wrSeries;
    allSeries.push(wrSeries);

    wrSeries.createPriceLine({
      price: -20,
      color: "rgba(120, 123, 134, 0.35)",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: "",
    });
    wrSeries.createPriceLine({
      price: -80,
      color: "rgba(120, 123, 134, 0.35)",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: "",
    });
  }

  return { mainSeries, allSeries, extraSeries };
}

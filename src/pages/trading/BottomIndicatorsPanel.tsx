import { useState, useEffect, useRef, useMemo } from "react";
import {
  createChart,
  ColorType,
  LineStyle,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type Time,
  type WhitespaceData,
  type LineData,
  type HistogramData,
  type MouseEventParams,
} from "lightweight-charts";
import { Activity, Plus, X, Sliders, RotateCcw, Search } from "lucide-react";
import {
  rsi,
  macd,
  atr,
  stochastic,
  cci,
  williamsR,
  INDICATOR_REGISTRY,
  type IndicatorType,
} from "../../lib/indicators.ts";
import { toIndicatorCandles } from "./utils.ts";
import { cn } from "../../lib/utils.ts";
import {
  useIndicatorSettings,
  type IndicatorSettings,
} from "../../hooks/useIndicatorSettings.ts";
import { IndicatorSettingsModal } from "../../components/IndicatorSettingsModal.tsx";

function getIndicatorTabLabel(type: IndicatorType, settings?: IndicatorSettings): string {
  if (type === "RSI") return `RSI (${settings?.period ?? 14})`;
  if (type === "MACD") return `MACD (${settings?.fast ?? 12}, ${settings?.slow ?? 26}, ${settings?.signal ?? 9})`;
  if (type === "ATR") return `ATR (${settings?.period ?? 14})`;
  if (type === "STOCH") return `STOCH (${settings?.kPeriod ?? 14}, ${settings?.dPeriod ?? 3})`;
  if (type === "CCI") return `CCI (${settings?.period ?? 20})`;
  if (type === "WR") return `%R (${settings?.period ?? 14})`;
  return type;
}

const SHORT_NAMES: Record<IndicatorType, string> = {
  RSI: "RSI",
  MACD: "MACD",
  ATR: "ATR",
  STOCH: "STO",
  CCI: "CCI",
  WR: "%R",
  EMA: "EMA",
  SMA: "SMA",
  BOLL: "BOLL",
  VWAP: "VWAP",
};

function alignLineData(
  times: number[],
  points: { time: number; value: number }[],
): (LineData<Time> | WhitespaceData<Time>)[] {
  if (times.length === 0) {
    return points.map((p) => ({ time: p.time as Time, value: p.value }));
  }
  const map = new Map<number, number>();
  for (const p of points) {
    map.set(p.time, p.value);
  }
  return times.map((t) => {
    const v = map.get(t);
    if (v !== undefined) {
      return { time: t as Time, value: v };
    }
    return { time: t as Time };
  });
}

function alignHistogramData(
  times: number[],
  points: { time: number; value: number }[],
): (HistogramData<Time> | WhitespaceData<Time>)[] {
  if (times.length === 0) {
    return points.map((p) => ({
      time: p.time as Time,
      value: p.value,
      color: p.value >= 0 ? "#0ecb81" : "#f6465d",
    }));
  }
  const map = new Map<number, number>();
  for (const p of points) {
    map.set(p.time, p.value);
  }
  return times.map((t) => {
    const v = map.get(t);
    if (v !== undefined) {
      return {
        time: t as Time,
        value: v,
        color: v >= 0 ? "#0ecb81" : "#f6465d",
      };
    }
    return { time: t as Time };
  });
}

export interface BottomIndicatorsPanelProps {
  candles: (CandlestickData<Time> | any)[];
  activeIndicators: IndicatorType[];
  onToggleIndicator: (type: IndicatorType) => void;
  isDark?: boolean;
  timeframe?: string;
  mainChart?: IChartApi | null;
  onCollapse?: () => void;
}

const BELOW_INDICATORS: IndicatorType[] = ["RSI", "MACD", "ATR", "STOCH", "CCI", "WR"];

export function BottomIndicatorsPanel({
  candles,
  activeIndicators,
  onToggleIndicator,
  isDark = true,
  timeframe = "15m",
  mainChart,
  onCollapse: _onCollapse,
}: BottomIndicatorsPanelProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const [chartEpoch, setChartEpoch] = useState(0);

  const { settings: allSettings, updateIndicatorSettings, resetIndicatorSettings } = useIndicatorSettings();
  const [settingsModalType, setSettingsModalType] = useState<IndicatorType | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: IndicatorType } | null>(null);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      window.addEventListener("click", handleClick);
      return () => window.removeEventListener("click", handleClick);
    }
  }, [contextMenu]);

  // Filter active indicators to only those designated for below / sub-chart
  const activeBelow = useMemo(() => {
    return activeIndicators.filter((t) => {
      const config = INDICATOR_REGISTRY.find((r) => r.type === t);
      return config && config.pane === "below";
    });
  }, [activeIndicators]);

  // Which below indicator is currently focused in the panel
  const [selectedType, setSelectedType] = useState<IndicatorType>(() => {
    return activeBelow[0] ?? "RSI";
  });

  const currentSettings = allSettings[selectedType] ?? {};

  // Keep selectedType valid if indicators list changes
  useEffect(() => {
    if (activeBelow.length > 0 && !activeBelow.includes(selectedType)) {
      setSelectedType(activeBelow[0]!);
    }
  }, [activeBelow, selectedType]);

  // Dropdown for quick-adding other below indicators
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const addMenuRef = useRef<HTMLDivElement>(null);

  const [hoveredPill, setHoveredPill] = useState<{
    type: IndicatorType;
    top: number;
    left: number;
    label: string;
    fullName: string;
    color: string;
  } | null>(null);

  const [hoveredPlus, setHoveredPlus] = useState<{ top: number; left: number } | null>(null);

  const filteredIndicators = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return BELOW_INDICATORS.map((t) => INDICATOR_REGISTRY.find((r) => r.type === t)!)
      .filter(Boolean)
      .filter((cfg) => {
        if (!q) return true;
        return (
          cfg.type.toLowerCase().includes(q) ||
          cfg.label.toLowerCase().includes(q)
        );
      });
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false);
      }
    };
    if (showAddMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAddMenu]);

  // Calculate indicator series data
  const indCandles = useMemo(() => toIndicatorCandles(candles), [candles]);
  const candleTimes = useMemo(() => indCandles.map((c) => c.time), [indCandles]);

  const indicatorData = useMemo(() => {
    if (indCandles.length === 0) return null;

    switch (selectedType) {
      case "RSI": {
        const period = currentSettings.period ?? 14;
        const pts = rsi(indCandles, period);
        return { type: "RSI" as const, period, data: pts };
      }
      case "MACD": {
        const fast = currentSettings.fast ?? 12;
        const slow = currentSettings.slow ?? 26;
        const signal = currentSettings.signal ?? 9;
        const res = macd(indCandles, fast, slow, signal);
        return { type: "MACD" as const, fast, slow, signal, data: res };
      }
      case "ATR": {
        const period = currentSettings.period ?? 14;
        const pts = atr(indCandles, period);
        return { type: "ATR" as const, period, data: pts };
      }
      case "STOCH": {
        const kPeriod = currentSettings.kPeriod ?? 14;
        const dPeriod = currentSettings.dPeriod ?? 3;
        const res = stochastic(indCandles, kPeriod, dPeriod);
        return { type: "STOCH" as const, kPeriod, dPeriod, data: res };
      }
      case "CCI": {
        const period = currentSettings.period ?? 20;
        const pts = cci(indCandles, period);
        return { type: "CCI" as const, period, data: pts };
      }
      case "WR": {
        const period = currentSettings.period ?? 14;
        const pts = williamsR(indCandles, period);
        return { type: "WR" as const, period, data: pts };
      }
      default:
        return null;
    }
  }, [indCandles, selectedType, currentSettings]);



  // Reference tracking for persistent chart series
  interface SeriesState {
    type: IndicatorType;
    settingsKey: string;
    mainSeries: ISeriesApi<any>;
    allSeries: ISeriesApi<any>[];
    extraSeries?: {
      signal?: ISeriesApi<"Line">;
      hist?: ISeriesApi<"Histogram">;
      d?: ISeriesApi<"Line">;
    };
  }
  const seriesStateRef = useRef<SeriesState | null>(null);
  const isSubInteractingRef = useRef(false);

  // 1. Initialize and maintain the lightweight-charts instance (persists across data updates!)
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const container = chartContainerRef.current;
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 180;

    const chart = createChart(container, {
      width,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "#131722" },
        textColor: "#787b86",
        fontSize: 10,
        fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
        attributionLogo: false,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "#363a45",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#2a2e39",
        },
        horzLine: {
          color: "#363a45",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#2a2e39",
        },
      },
      rightPriceScale: {
        borderColor: "#2a2e39",
        scaleMargins: { top: 0.1, bottom: 0.1 },
        autoScale: true,
        borderVisible: true,
        minimumWidth: 80,
      },
      timeScale: {
        borderColor: "#2a2e39",
        timeVisible: true,
        secondsVisible: timeframe === "1m",
        rightOffset: timeframe === "1m" ? 10 : 6,
        minBarSpacing: 0.5,
        fixLeftEdge: false,
        fixRightEdge: false,
        borderVisible: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: { time: true, price: true },
        axisDoubleClickReset: { time: true, price: true },
      },
    });

    chartRef.current = chart;
    setChartEpoch((e) => e + 1);

    // Initial visible range alignment with mainChart if available
    const initialRange = mainChart?.timeScale().getVisibleLogicalRange();
    if (initialRange) {
      try {
        chart.timeScale().setVisibleLogicalRange(initialRange);
      } catch {}
    }

    // ResizeObserver for responsive layout
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newW, height: newH } = entry.contentRect;
        if (newW > 0 && newH > 0 && chartRef.current) {
          chartRef.current.applyOptions({ width: newW, height: newH });
        }
      }
    });
    ro.observe(container);

    const onStart = () => { isSubInteractingRef.current = true; };
    const onEnd = () => { isSubInteractingRef.current = false; };
    container.addEventListener("pointerdown", onStart, { passive: true });
    window.addEventListener("pointerup", onEnd, { passive: true });
    window.addEventListener("pointercancel", onEnd, { passive: true });
    container.addEventListener("wheel", onStart, { passive: true });

    return () => {
      container.removeEventListener("pointerdown", onStart);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
      container.removeEventListener("wheel", onStart);
      ro.disconnect();
      try {
        chart.remove();
      } catch {}
      chartRef.current = null;
      mainSeriesRef.current = null;
      seriesStateRef.current = null;
    };
  }, [timeframe, isDark]);

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

  // 2. Manage indicator series and update data in place (NO chart recreation!)
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    if (activeBelow.length === 0 || !indicatorData) {
      if (seriesStateRef.current) {
        for (const s of seriesStateRef.current.allSeries) {
          try { chart.removeSeries(s); } catch {}
        }
        seriesStateRef.current = null;
        mainSeriesRef.current = null;
      }
      return;
    }

    const state = seriesStateRef.current;
    const isSameSeries = state && state.type === indicatorData.type && state.settingsKey === currentSettingsKey;

    if (isSameSeries) {
      // Just update data on existing series (smooth, 0ms, zero lag!)
      if (indicatorData.type === "RSI" || indicatorData.type === "ATR" || indicatorData.type === "CCI" || indicatorData.type === "WR") {
        state.mainSeries.setData(alignLineData(candleTimes, indicatorData.data));
      } else if (indicatorData.type === "MACD") {
        const histUp = currentSettings.histUpColor || "#26a69a";
        const histDown = currentSettings.histDownColor || "#ef5350";
        if (state.extraSeries?.hist) {
          state.extraSeries.hist.setData(
            alignHistogramData(
              candleTimes,
              indicatorData.data.histogram.map((h) => ({ time: h.time, value: h.value })),
            ).map((item) => {
              if ("value" in item && item.value !== undefined) {
                return { ...item, color: item.value >= 0 ? histUp : histDown };
              }
              return item;
            }),
          );
        }
        state.mainSeries.setData(alignLineData(candleTimes, indicatorData.data.macd));
        if (state.extraSeries?.signal) {
          state.extraSeries.signal.setData(alignLineData(candleTimes, indicatorData.data.signal));
        }
      } else if (indicatorData.type === "STOCH") {
        state.mainSeries.setData(alignLineData(candleTimes, indicatorData.data.k));
        if (state.extraSeries?.d) {
          state.extraSeries.d.setData(alignLineData(candleTimes, indicatorData.data.d));
        }
      }
      return;
    }

    // Indicator type or style settings changed: rebuild series
    if (state) {
      for (const s of state.allSeries) {
        try { chart.removeSeries(s); } catch {}
      }
      seriesStateRef.current = null;
      mainSeriesRef.current = null;
    }

    const allSeries: ISeriesApi<any>[] = [];
    let mainSeries: ISeriesApi<any> | null = null;
    const extraSeries: SeriesState["extraSeries"] = {};

    if (indicatorData.type === "RSI") {
      const rsiSeries = chart.addLineSeries({
        color: currentSettings.color || "#7e57c2",
        lineWidth: (currentSettings.lineWidth as any) ?? 2,
        priceLineVisible: false,
        lastValueVisible: true,
        priceFormat: { type: "custom", minMove: 0.01, formatter: (p: number) => p.toFixed(1) },
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
        priceFormat: { type: "custom", minMove: 0.01, formatter: (p: number) => p.toFixed(2) },
      });
      histSeries.setData(
        alignHistogramData(
          candleTimes,
          indicatorData.data.histogram.map((h) => ({ time: h.time, value: h.value })),
        ).map((item) => {
          if ("value" in item && item.value !== undefined) {
            return { ...item, color: item.value >= 0 ? histUp : histDown };
          }
          return item;
        }),
      );
      allSeries.push(histSeries);
      extraSeries.hist = histSeries;

      const macdSeries = chart.addLineSeries({
        color: currentSettings.color || "#2962ff",
        lineWidth: (currentSettings.lineWidth as any) ?? 1.5,
        priceLineVisible: false,
        lastValueVisible: true,
        priceFormat: { type: "custom", minMove: 0.01, formatter: (p: number) => p.toFixed(2) },
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
        priceFormat: { type: "custom", minMove: 0.01, formatter: (p: number) => p.toFixed(2) },
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
        priceFormat: { type: "custom", minMove: 0.0001, formatter: (p: number) => p.toFixed(4) },
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
        priceFormat: { type: "custom", minMove: 0.01, formatter: (p: number) => p.toFixed(1) },
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
        priceFormat: { type: "custom", minMove: 0.01, formatter: (p: number) => p.toFixed(1) },
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
        priceFormat: { type: "custom", minMove: 0.01, formatter: (p: number) => p.toFixed(2) },
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
    } else if (indicatorData.type === "WR") {
      const wrSeries = chart.addLineSeries({
        color: currentSettings.color || "#ffca28",
        lineWidth: (currentSettings.lineWidth as any) ?? 1.5,
        priceLineVisible: false,
        lastValueVisible: true,
        priceFormat: { type: "custom", minMove: 0.01, formatter: (p: number) => p.toFixed(2) },
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

    if (mainSeries) {
      mainSeriesRef.current = mainSeries;
      seriesStateRef.current = {
        type: indicatorData.type,
        settingsKey: currentSettingsKey,
        mainSeries,
        allSeries,
        extraSeries,
      };

      // Align logical range with mainChart immediately
      const initialRange = mainChart?.timeScale().getVisibleLogicalRange();
      if (initialRange) {
        try {
          chart.timeScale().setVisibleLogicalRange(initialRange);
        } catch {}
      }
    }
  }, [indicatorData, activeBelow, candleTimes, currentSettingsKey]);

  // 3. Bidirectional zero-lag synchronization between mainChart and sub-chart
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
        mainChart.timeScale().unsubscribeVisibleLogicalRangeChange(onMainRangeChange);
      } catch {}
      try {
        chart.timeScale().unsubscribeVisibleLogicalRangeChange(onSubRangeChange);
      } catch {}
    };
  }, [mainChart, chartEpoch]);

  // 4. Align right price scale width with mainChart so timestamps align to the pixel
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !mainChart) return;

    const syncWidth = () => {
      try {
        const mainWidth = mainChart.priceScale("right").width();
        if (mainWidth > 0) {
          chart.applyOptions({ rightPriceScale: { minimumWidth: mainWidth } });
        }
      } catch {}
    };

    syncWidth();
    const interval = setInterval(syncWidth, 1000);
    return () => clearInterval(interval);
  }, [mainChart, chartEpoch]);

  // 5. Fast O(1) price lookup map for smooth crosshair tracking
  const timePriceMap = useMemo(() => {
    const map = new Map<number, number>();
    if (!indicatorData) return map;

    if (
      indicatorData.type === "RSI" ||
      indicatorData.type === "ATR" ||
      indicatorData.type === "CCI" ||
      indicatorData.type === "WR"
    ) {
      for (const p of indicatorData.data) {
        map.set(p.time, p.value);
      }
    } else if (indicatorData.type === "MACD") {
      for (const m of indicatorData.data.macd) {
        map.set(m.time, m.value);
      }
    } else if (indicatorData.type === "STOCH") {
      for (const k of indicatorData.data.k) {
        map.set(k.time, k.value);
      }
    }
    return map;
  }, [indicatorData]);

  // 6. Sync crosshair position from mainChart to sub-chart
  useEffect(() => {
    if (!mainChart) return;

    const onMainCrosshair = (param: MouseEventParams) => {
      const chart = chartRef.current;
      const mainSeries = mainSeriesRef.current;
      if (!chart || !mainSeries) return;

      if (!param.time) {
        try {
          chart.clearCrosshairPosition();
        } catch {}
        return;
      }

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
      try {
        mainChart.unsubscribeCrosshairMove(onMainCrosshair);
      } catch {}
    };
  }, [mainChart, timePriceMap, chartEpoch]);

  return (
    <div className="h-full flex bg-[#131722] relative overflow-visible">
      {/* ── Left Indicator Rail (Width 44px, aligned under drawing toolbar) ── */}
      <div className="w-11 shrink-0 border-r border-[#2a2e39] bg-[#1a1e29] flex flex-col items-center py-2 select-none relative z-30">
        {/* Scrollable list of active indicator circular pills */}
        <div
          onScroll={() => setHoveredPill(null)}
          className="flex-1 w-full min-h-0 overflow-y-auto no-scrollbar flex flex-col items-center gap-2 px-1 pt-2 pb-2 overscroll-contain"
        >
          {activeBelow.map((type) => {
            const cfg = INDICATOR_REGISTRY.find((r) => r.type === type);
            const isSelected = selectedType === type;
            const color = allSettings[type]?.color || cfg?.color || "#2962ff";
            const shortName = SHORT_NAMES[type] || type;

            return (
              <div key={type} className="relative group shrink-0 p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedType(type);
                    setHoveredPill(null);
                  }}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHoveredPill({
                      type,
                      top: rect.top + rect.height / 2,
                      left: rect.right + 8,
                      label: getIndicatorTabLabel(type, allSettings[type]),
                      fullName: cfg?.label || type,
                      color,
                    });
                  }}
                  onMouseLeave={() => setHoveredPill(null)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setSettingsModalType(type);
                    setHoveredPill(null);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setContextMenu({ x: e.clientX, y: e.clientY, type });
                    setHoveredPill(null);
                  }}
                  className={cn(
                    "w-8 h-8 rounded-full flex flex-col items-center justify-center transition-all shrink-0 relative",
                    isSelected
                      ? "bg-[#2962ff]/20 text-[#2962ff] ring-2 ring-[#2962ff] shadow-md shadow-[#2962ff]/25 font-bold"
                      : "bg-[#1e222d] text-neutral-400 border border-[#2a2e39] hover:bg-[#252a38] hover:text-white hover:border-neutral-500",
                  )}
                >
                  <span
                    className={cn(
                      "font-mono font-bold leading-none tracking-tight",
                      shortName.length >= 4 ? "text-[8px]" : "text-[9.5px]",
                      isSelected ? "text-white" : "text-neutral-300",
                    )}
                  >
                    {shortName}
                  </span>
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0 shadow-sm mt-0.5"
                    style={{ backgroundColor: color }}
                  />
                </button>

                {/* Quick remove X on hover */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleIndicator(type);
                    setHoveredPill(null);
                  }}
                  className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#1e222d] border border-[#2a2e39] text-neutral-400 hover:text-white hover:bg-[#f6465d] hover:border-[#f6465d] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                >
                  <X className="h-2 w-2" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Divider line above + button (just like user drew: ---[+]) */}
        <div className="w-5 h-px bg-[#2a2e39] shrink-0 my-1.5" />

        {/* Fixed Plus Button at the bottom of the rail */}
        <div className="relative shrink-0" ref={addMenuRef}>
          <button
            type="button"
            data-testid="bottom-indicator-add-btn"
            title="Add Bottom Indicator"
            onClick={(e) => {
              e.stopPropagation();
              setShowAddMenu((prev) => !prev);
              setHoveredPlus(null);
              if (!showAddMenu) setSearchQuery("");
            }}
            onMouseEnter={(e) => {
              if (showAddMenu) return;
              const rect = e.currentTarget.getBoundingClientRect();
              setHoveredPlus({
                top: rect.top + rect.height / 2,
                left: rect.right + 8,
              });
            }}
            onMouseLeave={() => setHoveredPlus(null)}
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center transition-all border shrink-0 shadow-sm",
              showAddMenu
                ? "bg-[#2962ff] text-white border-[#2962ff] shadow-md shadow-[#2962ff]/25"
                : "bg-[#1e222d] text-neutral-300 hover:text-white hover:bg-[#252a38] border-[#2a2e39] hover:border-[#2962ff]/50",
            )}
          >
            <Plus className="h-4 w-4" />
          </button>

          {/* Small Box Popup: Search option + scrollable list with max 5 items visible */}
          {showAddMenu && (
            <div
              className="absolute left-full bottom-0 ml-2 w-64 bg-[#1a1e29] border border-[#2a2e39] rounded-xl shadow-2xl z-50 p-2 flex flex-col gap-1.5 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-400 pointer-events-none" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setShowAddMenu(false);
                  }}
                  placeholder="Search indicators..."
                  className="w-full bg-[#131722] border border-[#2a2e39] rounded-lg pl-8 pr-7 py-1.5 text-xs text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-[#2962ff]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-2 p-0.5 text-neutral-400 hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Scrollable list: Max 5 items visible height (~168px = 5 x 32px + 8px gaps) */}
              <div
                data-testid="indicator-popup-list"
                className="max-h-[168px] overflow-y-auto no-scrollbar flex flex-col gap-0.5 py-0.5"
              >
                {filteredIndicators.length === 0 ? (
                  <div className="py-4 text-center text-xs text-neutral-500">
                    No indicators found
                  </div>
                ) : (
                  filteredIndicators.map((cfg) => {
                    const isAlreadyActive = activeBelow.includes(cfg.type);
                    return (
                      <button
                        key={cfg.type}
                        type="button"
                        onClick={() => {
                          onToggleIndicator(cfg.type);
                          if (!isAlreadyActive) setSelectedType(cfg.type);
                          setShowAddMenu(false);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors h-8 shrink-0",
                          isAlreadyActive
                            ? "bg-[#2962ff]/15 text-[#2962ff] font-medium"
                            : "text-neutral-200 hover:bg-[#252a38] hover:text-white",
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-1">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                            style={{ backgroundColor: cfg.color }}
                          />
                          <div className="truncate flex items-baseline gap-1.5">
                            <span className="truncate font-medium">{cfg.label}</span>
                            <span className="text-[10px] text-neutral-500 uppercase font-mono">
                              {cfg.type}
                            </span>
                          </div>
                        </div>
                        {isAlreadyActive ? (
                          <span className="text-[10px] bg-[#2962ff]/20 text-[#2962ff] font-semibold px-1.5 py-0.5 rounded shrink-0">
                            Active
                          </span>
                        ) : (
                          <Plus className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Main Area: Sub-Chart with Floating Legend & Collapse ── */}
      <div className="flex-1 min-h-0 flex flex-col relative bg-[#131722] overflow-hidden">
        {/* Placeholder overlay when no sub-chart indicators are active */}
        {activeBelow.length === 0 && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center bg-[#131722]">
            <div className="p-3 rounded-full bg-[#2962ff]/10 text-[#2962ff] mb-3">
              <Activity className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-semibold text-neutral-200 mb-1">
              No Sub-Chart Indicators Active
            </h4>
            <p className="text-xs text-neutral-400 max-w-sm mb-4">
              Click the <span className="text-[#2962ff] font-semibold">+</span> button on the left rail or select an oscillator below:
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-md">
              {BELOW_INDICATORS.map((type) => {
                const cfg = INDICATOR_REGISTRY.find((r) => r.type === type);
                return (
                  <button
                    key={type}
                    onClick={() => {
                      onToggleIndicator(type);
                      setSelectedType(type);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1e222d] hover:bg-[#252a38] text-xs font-medium text-neutral-200 border border-[#2a2e39] hover:border-[#2962ff]/50 transition-colors"
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: cfg?.color || "#2962ff" }}
                    />
                    + {cfg?.label || type}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Sub-Chart Canvas Container (persists in DOM so chart instance stays ready) */}
        <div
          className="flex-1 min-h-0 w-full relative cursor-crosshair"
          ref={chartContainerRef}
          onDoubleClick={() => setSettingsModalType(selectedType)}
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenu({ x: e.clientX, y: e.clientY, type: selectedType });
          }}
        />
      </div>

      {/* Video Game-Style Pill Tooltip */}
      {hoveredPill && (
        <div
          data-testid="videogame-tooltip"
          className="fixed z-50 pointer-events-none flex items-center select-none animate-in fade-in zoom-in-95 duration-75 -translate-y-1/2"
          style={{ top: hoveredPill.top, left: hoveredPill.left }}
        >
          {/* Directional notch / arrow pointing directly to the circle */}
          <div className="w-0 h-0 border-y-[5px] border-y-transparent border-r-[5px] border-r-[#2a2e39] shrink-0" />
          <div className="-ml-[4px] w-0 h-0 border-y-[4px] border-y-transparent border-r-[4px] border-r-[#1a1e29] shrink-0 z-10" />

          {/* Item badge container matching dark UI theme */}
          <div className="bg-[#1a1e29]/95 border border-[#2a2e39] rounded-lg px-2.5 py-1.5 shadow-2xl backdrop-blur-md flex flex-col gap-0.5 min-w-[130px] max-w-[240px]">
            <div className="flex items-center gap-1.5 font-bold text-xs text-neutral-100">
              <span
                className="w-2 h-2 rounded-full shrink-0 shadow-sm"
                style={{ backgroundColor: hoveredPill.color }}
              />
              <span className="truncate">{hoveredPill.label}</span>
            </div>
            <div className="text-[10px] text-neutral-400 font-medium truncate">
              {hoveredPill.fullName}
            </div>
            <div className="text-[9px] text-neutral-500 pt-1 mt-0.5 border-t border-[#2a2e39] flex items-center gap-1">
              <span className="text-[#2962ff] font-semibold">L-Click</span>
              <span>view</span>
              <span className="text-neutral-600">·</span>
              <span className="text-[#2962ff] font-semibold">R-Click</span>
              <span>settings</span>
            </div>
          </div>
        </div>
      )}

      {/* Video Game-Style Add Indicator Tooltip */}
      {hoveredPlus && !showAddMenu && (
        <div
          data-testid="videogame-tooltip-plus"
          className="fixed z-50 pointer-events-none flex items-center select-none animate-in fade-in zoom-in-95 duration-75 -translate-y-1/2"
          style={{ top: hoveredPlus.top, left: hoveredPlus.left }}
        >
          <div className="w-0 h-0 border-y-[5px] border-y-transparent border-r-[5px] border-r-[#2a2e39] shrink-0" />
          <div className="-ml-[4px] w-0 h-0 border-y-[4px] border-y-transparent border-r-[4px] border-r-[#1a1e29] shrink-0 z-10" />
          <div className="bg-[#1a1e29]/95 border border-[#2a2e39] rounded-lg px-2.5 py-1.5 shadow-2xl backdrop-blur-md flex flex-col gap-0.5 min-w-[120px]">
            <div className="flex items-center gap-1.5 font-bold text-xs text-neutral-100">
              <Plus className="h-3 w-3 text-[#2962ff]" />
              <span>Add Indicator</span>
            </div>
            <div className="text-[10px] text-neutral-400">Search & pick oscillators</div>
          </div>
        </div>
      )}

      {/* Right Click Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 min-w-[170px] bg-[#1a1e29] border border-[#2a2e39] rounded-lg shadow-2xl py-1 text-xs backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 font-semibold text-neutral-400 border-b border-[#2a2e39] mb-1 flex items-center justify-between">
            <span>{contextMenu.type} Indicator</span>
          </div>
          <button
            type="button"
            className="w-full px-3 py-1.5 text-left text-neutral-200 hover:bg-[#252a38] hover:text-white flex items-center gap-2 transition-colors"
            onClick={() => {
              setSettingsModalType(contextMenu.type);
              setContextMenu(null);
            }}
          >
            <Sliders className="h-3.5 w-3.5 text-[#2962ff]" />
            <span>Settings...</span>
          </button>
          <button
            type="button"
            className="w-full px-3 py-1.5 text-left text-neutral-200 hover:bg-[#252a38] hover:text-white flex items-center gap-2 transition-colors"
            onClick={() => {
              resetIndicatorSettings(contextMenu.type);
              setContextMenu(null);
            }}
          >
            <RotateCcw className="h-3.5 w-3.5 text-neutral-400" />
            <span>Reset Settings</span>
          </button>
          <div className="my-1 border-t border-[#2a2e39]" />
          <button
            type="button"
            className="w-full px-3 py-1.5 text-left text-[#f6465d] hover:bg-[#f6465d]/10 flex items-center gap-2 transition-colors"
            onClick={() => {
              onToggleIndicator(contextMenu.type);
              setContextMenu(null);
            }}
          >
            <X className="h-3.5 w-3.5 text-[#f6465d]" />
            <span>Remove Indicator</span>
          </button>
        </div>
      )}

      {/* Settings Modal */}
      {settingsModalType && (
        <IndicatorSettingsModal
          isOpen={true}
          type={settingsModalType}
          settings={allSettings[settingsModalType]}
          onSave={(type, updates) => {
            updateIndicatorSettings(type, updates);
            setSettingsModalType(null);
          }}
          onReset={(type) => {
            resetIndicatorSettings(type);
          }}
          onClose={() => setSettingsModalType(null)}
        />
      )}
    </div>
  );
}

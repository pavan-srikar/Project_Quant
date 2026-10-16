import type { IndicatorConfig } from "./types";

export const INDICATOR_REGISTRY: IndicatorConfig[] = [
  {
    type: "SMA",
    label: "Simple Moving Average",
    pane: "overlay",
    defaultParams: { period: 20 },
    color: "#f0b90b",
  },
  {
    type: "EMA",
    label: "Exponential Moving Average",
    pane: "overlay",
    defaultParams: { period: 20 },
    color: "#e377c2",
  },
  {
    type: "RSI",
    label: "Relative Strength Index",
    pane: "below",
    defaultParams: { period: 14 },
    color: "#8884d8",
  },
  {
    type: "MACD",
    label: "MACD",
    pane: "below",
    defaultParams: { fast: 12, slow: 26, signal: 9 },
    color: "#2196f3",
  },
  {
    type: "BOLL",
    label: "Bollinger Bands",
    pane: "overlay",
    defaultParams: { period: 20, stdDev: 2 },
    color: "#26a69a",
  },
  {
    type: "ATR",
    label: "Average True Range",
    pane: "below",
    defaultParams: { period: 14 },
    color: "#ff7043",
  },
  {
    type: "STOCH",
    label: "Stochastic Oscillator",
    pane: "below",
    defaultParams: { kPeriod: 14, dPeriod: 3 },
    color: "#ab47bc",
  },
  {
    type: "VWAP",
    label: "Volume Weighted Avg Price",
    pane: "overlay",
    defaultParams: {},
    color: "#42a5f5",
  },
  {
    type: "CCI",
    label: "Commodity Channel Index",
    pane: "below",
    defaultParams: { period: 20 },
    color: "#26c6da",
  },
  {
    type: "WR",
    label: "Williams %R",
    pane: "below",
    defaultParams: { period: 14 },
    color: "#ffca28",
  },
];

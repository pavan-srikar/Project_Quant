export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface IndicatorPoint {
  time: number;
  value: number;
}

export interface MACDResult {
  macd: IndicatorPoint[];
  signal: IndicatorPoint[];
  histogram: IndicatorPoint[];
}

export interface BollingerResult {
  upper: IndicatorPoint[];
  middle: IndicatorPoint[];
  lower: IndicatorPoint[];
}

export interface StochasticResult {
  k: IndicatorPoint[];
  d: IndicatorPoint[];
}

export type IndicatorType =
  | "SMA"
  | "EMA"
  | "RSI"
  | "MACD"
  | "BOLL"
  | "ATR"
  | "STOCH"
  | "VWAP"
  | "CCI"
  | "WR";

export type IndicatorPane = "overlay" | "below";

export interface IndicatorConfig {
  type: IndicatorType;
  label: string;
  pane: IndicatorPane;
  defaultParams: Record<string, number>;
  color: string;
}

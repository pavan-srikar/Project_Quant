import type {
  CandlestickData,
  IChartApi,
  ISeriesApi,
  Time,
} from "lightweight-charts";
import type { IndicatorType } from "../../../lib/indicators.ts";
import type { PineLabel, PineBox, PineLine, PineTable } from "../../../lib/pinescript/types.ts";

export interface BottomIndicatorsPanelProps {
  candles: (CandlestickData<Time> | any)[];
  activeIndicators: IndicatorType[];
  onToggleIndicator: (type: IndicatorType) => void;
  isDark?: boolean;
  timeframe?: string;
  mainChart?: IChartApi | null;
}

export interface ContextMenuState {
  x: number;
  y: number;
  type: IndicatorType;
}

export interface SeriesState {
  chart: IChartApi;
  type: IndicatorType;
  settingsKey: string;
  mainSeries: ISeriesApi<any>;
  allSeries: ISeriesApi<any>[];
  extraSeries?: {
    signal?: ISeriesApi<"Line">;
    hist?: ISeriesApi<"Histogram">;
    d?: ISeriesApi<"Line">;
  };
  lastBarTime?: number;
  lastBarCount?: number;
  lastFirstTime?: number;
}

export type IndicatorCalculatedData =
  | { type: "RSI"; period: number; data: { time: number; value: number }[] }
  | {
      type: "MACD";
      fast: number;
      slow: number;
      signal: number;
      data: {
        macd: { time: number; value: number }[];
        signal: { time: number; value: number }[];
        histogram: { time: number; value: number }[];
      };
    }
  | { type: "ATR"; period: number; data: { time: number; value: number }[] }
  | {
      type: "STOCH";
      kPeriod: number;
      dPeriod: number;
      data: {
        k: { time: number; value: number }[];
        d: { time: number; value: number }[];
      };
    }
  | { type: "CCI"; period: number; data: { time: number; value: number }[] }
  | { type: "WR"; period: number; data: { time: number; value: number }[] }
  | {
      type: "CUSTOM";
      name: string;
      data: { time: number; value: number }[];
      plots?: {
        id: string;
        title: string;
        color: string;
        lineWidth: number;
        style?: "columns" | "histogram" | "line" | "area" | "stepline" | "circles" | "cross";
        values: { time: number; value: number }[];
      }[];
      hlines?: { price: number; title: string; color: string }[];
      labels?: PineLabel[];
      boxes?: PineBox[];
      lines?: PineLine[];
      tables?: PineTable[];
    }
  | null;

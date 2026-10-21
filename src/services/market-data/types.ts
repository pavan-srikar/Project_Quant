
export type MarketDataMode = "live" | "historical";

export interface HistoricalWindowParams {
  centerTimeSec: number;
  barCount?: number;
}

export interface RangeQueryParams {
  fromMs: number;
  toMs: number;
}

export interface CandleRepositoryQuery {
  symbol: string;
  timeframe: string;
  limit?: number;
  targetTimeSec?: number;
  range?: RangeQueryParams;
}

export interface CandleSeriesMetadata {
  symbol: string;
  timeframe: string;
  oldestTimeSec: number;
  newestTimeSec: number;
  count: number;
  isLive: boolean;
}

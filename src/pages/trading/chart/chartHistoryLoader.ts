import type { ISeriesApi, LogicalRange } from "lightweight-charts";
import { api } from "../../../services/api.ts";
import type { Candle } from "../../../services/schemas.ts";
import { TF_INTERVAL_MS, type Timeframe } from "../constants.ts";
import type { LoadMoreState } from "./types.ts";

export const LOAD_MORE_THRESHOLD = 20; // trigger when fewer than N bars remain on the left
export const LOAD_MORE_WINDOW = 500; // how many interval-widths to fetch per extension

export function getSeriesOldestMs(series: ISeriesApi<"Candlestick">): number {
  const data = series.data();
  return data.length === 0 ? 0 : (data[0]!.time as number) * 1_000;
}

export function isLoadMoreEligible(
  state: LoadMoreState,
  series: ISeriesApi<"Candlestick">,
  range: LogicalRange,
): boolean {
  if (state.loading || state.noMoreData) return false;
  const barsInfo = series.barsInLogicalRange(range);
  if ((barsInfo?.barsBefore ?? Number.POSITIVE_INFINITY) > LOAD_MORE_THRESHOLD) {
    return false;
  }
  // A shifted window from a previous empty-range response is always eligible —
  // we need to try the window before the gap (e.g. before a Forex weekend).
  if (state.fetchFromMs > 0) return true;
  const oldestMs = getSeriesOldestMs(series);
  if (oldestMs === 0) return false;
  return state.lastFetchedBeforeMs === 0 || oldestMs < state.lastFetchedBeforeMs;
}

export function fetchOlderRange(
  symbol: string,
  timeframe: string,
  toMs: number,
  state: LoadMoreState,
  onLoaded: (bars: Candle[]) => void,
): void {
  const windowMs =
    LOAD_MORE_WINDOW * (TF_INTERVAL_MS[timeframe as Timeframe] ?? 60_000);
  api
    .getCandles(symbol, timeframe, undefined, { fromMs: toMs - windowMs, toMs })
    .then((bars) => {
      if (bars.length === 0) {
        state.emptyFetchCount = (state.emptyFetchCount ?? 0) + 1;
        const upper = symbol.toUpperCase();
        const isCrypto =
          upper.endsWith("USDT") ||
          upper.endsWith("USD") ||
          upper.endsWith("BTC") ||
          upper.endsWith("ETH");
        if (isCrypto || (state.emptyFetchCount ?? 0) >= 2) {
          state.noMoreData = true;
        } else {
          const nextToMs = toMs - windowMs;
          if (nextToMs > 0) {
            state.fetchFromMs = nextToMs;
          } else {
            state.noMoreData = true;
          }
        }
      } else {
        state.emptyFetchCount = 0;
        onLoaded(bars as Candle[]);
      }
    })
    .catch(() => {
      // Reset the fetch boundary so the user can retry by scrolling again.
      state.lastFetchedBeforeMs = 0;
    })
    .finally(() => {
      state.loading = false;
    });
}

export function makeHistoryLoader(
  symbol: string,
  timeframeRef: { current: string },
  seriesRef: { current: ISeriesApi<"Candlestick"> | null },
  stateRef: { current: LoadMoreState },
  onLoaded: (bars: Candle[]) => void,
): (range: LogicalRange | null) => void {
  return (range) => {
    const series = seriesRef.current;
    if (!range || !series) return;
    const state = stateRef.current;
    if (!isLoadMoreEligible(state, series, range)) return;
    // Use the shifted boundary from a prior empty-range response when present,
    // otherwise fall back to the series' current oldest bar.
    const toMs =
      state.fetchFromMs > 0 ? state.fetchFromMs : getSeriesOldestMs(series);
    if (toMs === 0) return;
    state.loading = true;
    state.lastFetchedBeforeMs = toMs;
    state.fetchFromMs = 0;
    // Read the timeframe from a ref: the chart (and this subscription) persists
    // across TF changes, so the loader must always fetch the *current* TF.
    fetchOlderRange(symbol, timeframeRef.current, toMs, state, onLoaded);
  };
}

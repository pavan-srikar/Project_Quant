import type { ISeriesApi, LogicalRange } from "lightweight-charts";
import { api } from "../../../services/api.ts";
import type { Candle } from "../../../services/schemas.ts";
import { TF_INTERVAL_MS, type Timeframe } from "../constants.ts";
import type { LoadMoreState } from "./types.ts";

export const LOAD_MORE_THRESHOLD = 20; // trigger when fewer than N bars remain on the left
export const LOAD_MORE_WINDOW = 500; // how many interval-widths to fetch per extension

export function getSeriesOldestMs(
  series: ISeriesApi<"Candlestick">,
  getCandles?: () => readonly any[],
): number {
  if (getCandles) {
    const list = getCandles();
    if (list.length > 0 && list[0]) {
      const t = Number(list[0].time ?? list[0].timestamp);
      if (t > 0) return t < 1_000_000_000_000 ? t * 1000 : t;
    }
  }
  const data = series.data();
  return data.length === 0 ? 0 : (data[0]!.time as number) * 1_000;
}

export function isLoadMoreEligible(
  state: LoadMoreState,
  series: ISeriesApi<"Candlestick">,
  range: LogicalRange,
  getCandles?: () => readonly any[],
  hasUserPannedOrZoomedRef?: { current: boolean },
  isUserInteractingRef?: { current: boolean },
): boolean {
  if (hasUserPannedOrZoomedRef && !hasUserPannedOrZoomedRef.current) return false;
  if (isUserInteractingRef && !isUserInteractingRef.current) return false;
  if (state.loading || state.noMoreData) return false;
  const barsInfo = series.barsInLogicalRange(range);
  if ((barsInfo?.barsBefore ?? Number.POSITIVE_INFINITY) > LOAD_MORE_THRESHOLD) {
    return false;
  }
  // A shifted window from a previous empty-range response is always eligible —
  // we need to try the window before the gap (e.g. before a Forex weekend).
  if (state.fetchFromMs > 0) return true;
  const oldestMs = getSeriesOldestMs(series, getCandles);
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

export function getSeriesNewestMs(
  series: ISeriesApi<"Candlestick">,
  getCandles?: () => readonly any[],
): number {
  if (getCandles) {
    const list = getCandles();
    if (list.length > 0 && list[list.length - 1]) {
      const t = Number(list[list.length - 1].time ?? list[list.length - 1].timestamp);
      if (t > 0) return t < 1_000_000_000_000 ? t * 1000 : t;
    }
  }
  const data = series.data();
  return data.length === 0 ? 0 : (data[data.length - 1]!.time as number) * 1_000;
}

export function isLoadForwardEligible(
  state: LoadMoreState,
  series: ISeriesApi<"Candlestick">,
  range: LogicalRange,
  timeframe: string,
  getCandles?: () => readonly any[],
  hasUserPannedOrZoomedRef?: { current: boolean },
  isUserInteractingRef?: { current: boolean },
): boolean {
  if (hasUserPannedOrZoomedRef && !hasUserPannedOrZoomedRef.current) return false;
  if (isUserInteractingRef && !isUserInteractingRef.current) return false;
  if (state.loadingForward) return false;
  const barsInfo = series.barsInLogicalRange(range);
  if ((barsInfo?.barsAfter ?? Number.POSITIVE_INFINITY) > LOAD_MORE_THRESHOLD) {
    return false;
  }
  const newestMs = getSeriesNewestMs(series, getCandles);
  if (newestMs === 0) return false;
  const nowMs = Date.now();
  const intervalMs = TF_INTERVAL_MS[timeframe as Timeframe] ?? 60_000;
  return (nowMs - newestMs) > intervalMs * 3;
}

export function fetchNewerRange(
  symbol: string,
  timeframe: string,
  fromMs: number,
  state: LoadMoreState,
  onLoaded: (bars: Candle[], isForward?: boolean) => void,
): void {
  const windowMs =
    LOAD_MORE_WINDOW * (TF_INTERVAL_MS[timeframe as Timeframe] ?? 60_000);
  const toMs = Math.min(Date.now(), fromMs + windowMs);
  state.loadingForward = true;
  api
    .getCandles(symbol, timeframe, undefined, { fromMs, toMs })
    .then((bars) => {
      if (bars.length > 0) {
        onLoaded(bars as Candle[], true);
      }
    })
    .finally(() => {
      state.loadingForward = false;
    });
}

export function makeHistoryLoader(
  symbol: string,
  timeframeRef: { current: string },
  seriesRef: { current: ISeriesApi<"Candlestick"> | null },
  stateRef: { current: LoadMoreState },
  onLoaded: (bars: Candle[], isForward?: boolean) => void,
  getCandles?: () => readonly any[],
  hasUserPannedOrZoomedRef?: { current: boolean },
  isChangingTfRef?: { current: boolean },
  isUserInteractingRef?: { current: boolean },
  isApplyingHistoryRef?: { current: boolean },
): (range: LogicalRange | null) => void {
  let lastFetchTs = 0;
  return (range) => {
    if (isChangingTfRef?.current || isApplyingHistoryRef?.current) return;
    const series = seriesRef.current;
    if (!range || !series) return;
    const now = Date.now();
    if (now - lastFetchTs < 500) return;
    const state = stateRef.current;
    const reqTf = timeframeRef.current;

    if (isLoadMoreEligible(state, series, range, getCandles, hasUserPannedOrZoomedRef, isUserInteractingRef)) {
      const toMs =
        state.fetchFromMs > 0 ? state.fetchFromMs : getSeriesOldestMs(series, getCandles);
      if (toMs === 0) return;
      lastFetchTs = now;
      state.loading = true;
      state.lastFetchedBeforeMs = toMs;
      state.fetchFromMs = 0;
      fetchOlderRange(symbol, reqTf, toMs, state, (bars) => {
        if (timeframeRef.current !== reqTf || isChangingTfRef?.current) return;
        onLoaded(bars, false);
      });
      return;
    }

    if (isLoadForwardEligible(state, series, range, reqTf, getCandles, hasUserPannedOrZoomedRef, isUserInteractingRef)) {
      const fromMs = getSeriesNewestMs(series, getCandles);
      if (fromMs === 0) return;
      lastFetchTs = now;
      fetchNewerRange(symbol, reqTf, fromMs, state, (bars) => {
        if (timeframeRef.current !== reqTf || isChangingTfRef?.current) return;
        onLoaded(bars, true);
      });
    }
  };
}

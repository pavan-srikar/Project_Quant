import { describe, expect, it, vi } from "vitest";
import { makeResolveCtx } from "../lib/chart-plugins/drawing-tools/coords.ts";
import {
  getSeriesOldestMs,
  isLoadMoreEligible,
  makeHistoryLoader,
} from "../pages/trading/chart/chartHistoryLoader.ts";
import {
  findClosestCandleIndex,
  frameHistoricalViewport,
  frameLatestCandles,
} from "../pages/trading/chart/chartFraming.ts";
import { getChartPreferencesFromStorage } from "../hooks/useChartPreferences.ts";
import { areCandlesConnecting, hasDiscontinuity } from "../services/demo/candles.ts";

describe("Chart Performance & History Preserving Tests", () => {
  it("makeResolveCtx avoids calling series.data() when candles are provided", () => {
    const seriesDataSpy = vi.fn().mockReturnValue([]);
    const mockSeries: any = { data: seriesDataSpy };
    const mockChart: any = {};
    const candles = [
      { time: 1700000000, open: 100, high: 110, low: 90, close: 105 },
    ];

    const ctx = makeResolveCtx(mockChart, mockSeries, 60, () => candles);
    expect(seriesDataSpy).not.toHaveBeenCalled();
    expect(ctx.data).toBe(candles);
  });

  it("getSeriesOldestMs avoids calling series.data() when getCandles is provided", () => {
    const seriesDataSpy = vi.fn().mockReturnValue([]);
    const mockSeries: any = { data: seriesDataSpy };
    const candles = [
      { time: 1700000000, open: 100, high: 110, low: 90, close: 105 },
    ];

    const oldestMs = getSeriesOldestMs(mockSeries, () => candles);
    expect(seriesDataSpy).not.toHaveBeenCalled();
    expect(oldestMs).toBe(1700000000 * 1000);
  });

  it("isLoadMoreEligible checks oldestMs without series.data() when getCandles is provided", () => {
    const seriesDataSpy = vi.fn().mockReturnValue([]);
    const mockSeries: any = {
      data: seriesDataSpy,
      barsInLogicalRange: () => ({ barsBefore: 5, barsAfter: 10 }),
    };
    const candles = [
      { time: 1700000000, open: 100, high: 110, low: 90, close: 105 },
    ];
    const state: any = {
      loading: false,
      noMoreData: false,
      lastFetchedBeforeMs: 0,
      fetchFromMs: 0,
    };

    const eligible = isLoadMoreEligible(state, mockSeries, { from: 0, to: 10 } as any, () => candles);
    expect(seriesDataSpy).not.toHaveBeenCalled();
    expect(eligible).toBe(true);
  });

  it("findClosestCandleIndex locates the closest bar timestamp", () => {
    const data = [
      { time: 100 },
      { time: 200 },
      { time: 300 },
      { time: 400 },
      { time: 500 },
    ];
    expect(findClosestCandleIndex(data, 290)).toBe(2);
    expect(findClosestCandleIndex(data, 310)).toBe(2);
    expect(findClosestCandleIndex(data, 450)).toBe(3); // or 4
    expect(findClosestCandleIndex(data, 50)).toBe(0);
    expect(findClosestCandleIndex(data, 900)).toBe(4);
  });

  it("frameHistoricalViewport frames center timestamp with consistent barCount and fits price scale", () => {
    const applyOptionsSpy = vi.fn();
    const setVisibleLogicalRangeSpy = vi.fn();
    const mockChart: any = {
      timeScale: () => ({ setVisibleLogicalRange: setVisibleLogicalRangeSpy }),
      priceScale: () => ({ applyOptions: applyOptionsSpy }),
    };

    const data = Array.from({ length: 200 }, (_, i) => ({ time: 1000 + i * 60 }));
    // Target timestamp is at index 100
    frameHistoricalViewport(mockChart, data, 1000 + 100 * 60, 80, false);

    expect(setVisibleLogicalRangeSpy).toHaveBeenCalledWith({ from: 60, to: 140 });
    expect(applyOptionsSpy).toHaveBeenCalledWith({ autoScale: true });
  });

  it("frameLatestCandles sets logical range and fits vertical scale", () => {
    const applyOptionsSpy = vi.fn();
    const setVisibleLogicalRangeSpy = vi.fn();
    const mockChart: any = {
      timeScale: () => ({ setVisibleLogicalRange: setVisibleLogicalRangeSpy }),
      priceScale: () => ({ applyOptions: applyOptionsSpy }),
    };

    frameLatestCandles(mockChart, 100, false);
    expect(setVisibleLogicalRangeSpy).toHaveBeenCalledWith({ from: 20, to: 108 });
    expect(applyOptionsSpy).toHaveBeenCalledWith({ autoScale: true });
  });

  it("autoScale is disabled (false) by default in chart preferences", () => {
    const prefs = getChartPreferencesFromStorage();
    expect(prefs.autoScale).toBe(false);
  });

  it("isLoadMoreEligible suppresses fetch when user has not panned or zoomed", () => {
    const mockSeries: any = {
      barsInLogicalRange: () => ({ barsBefore: 5, barsAfter: 10 }),
    };
    const candles = [{ time: 1700000000, open: 100, high: 110, low: 90, close: 105 }];
    const state: any = {
      loading: false,
      noMoreData: false,
      lastFetchedBeforeMs: 0,
      fetchFromMs: 0,
    };

    // User has not touched chart -> should be false
    const notPannedRef = { current: false };
    expect(
      isLoadMoreEligible(state, mockSeries, { from: 0, to: 10 } as any, () => candles, notPannedRef),
    ).toBe(false);

    // User actively panned chart -> should be true
    const pannedRef = { current: true };
    expect(
      isLoadMoreEligible(state, mockSeries, { from: 0, to: 10 } as any, () => candles, pannedRef),
    ).toBe(true);
  });

  it("frameHistoricalViewport sets visible time range when visibleTimeRange is provided", () => {
    const applyOptionsSpy = vi.fn();
    const setVisibleRangeSpy = vi.fn();
    const setVisibleLogicalRangeSpy = vi.fn();
    const mockChart: any = {
      timeScale: () => ({
        setVisibleRange: setVisibleRangeSpy,
        setVisibleLogicalRange: setVisibleLogicalRangeSpy,
      }),
      priceScale: () => ({ applyOptions: applyOptionsSpy }),
    };

    const data = Array.from({ length: 200 }, (_, i) => ({ time: 1000 + i * 60 }));
    frameHistoricalViewport(mockChart, data, 1000 + 100 * 60, 80, false, {
      from: 1000,
      to: 5000,
    });

    expect(setVisibleRangeSpy).toHaveBeenCalledWith({ from: 1000, to: 5000 });
    expect(applyOptionsSpy).toHaveBeenCalledWith({ autoScale: true });
    expect(setVisibleLogicalRangeSpy).not.toHaveBeenCalled();
  });

  it("areCandlesConnecting correctly detects continuous vs disconnected candle chunks", () => {
    const febCandles: any[] = [
      { time: 1770000000, open: 66000, high: 66500, low: 65800, close: 66200 },
      { time: 1770000900, open: 66200, high: 66400, low: 66100, close: 66300 },
    ];
    // Gap of ~8 months (~20,000,000 seconds)
    const octCandles: any[] = [
      { time: 1790000000, open: 84000, high: 84500, low: 83900, close: 84200 },
      { time: 1790000900, open: 84200, high: 84600, low: 84100, close: 84500 },
    ];
    // Overlapping chunk
    const touchingCandles: any[] = [
      { time: 1770001800, open: 66300, high: 66600, low: 66200, close: 66500 },
    ];

    expect(areCandlesConnecting(febCandles, octCandles, "15m")).toBe(false);
    expect(areCandlesConnecting(febCandles, touchingCandles, "15m")).toBe(true);
  });

  it("hasDiscontinuity detects gaps between adjacent candles", () => {
    const continuous: any[] = [
      { time: 1000, close: 10 },
      { time: 1900, close: 11 },
      { time: 2800, close: 12 },
    ];
    const withGap: any[] = [
      { time: 1000, close: 10 },
      { time: 10000000, close: 11 },
    ];

    expect(hasDiscontinuity(continuous, "15m")).toBe(false);
    expect(hasDiscontinuity(withGap, "15m")).toBe(true);
  });

  it("isLoadMoreEligible blocks history loading when user is not actively interacting", () => {
    const mockSeries: any = {
      barsInLogicalRange: () => ({ barsBefore: 5 }),
    };
    const state: any = {
      loading: false,
      noMoreData: false,
      lastFetchedBeforeMs: 0,
      fetchFromMs: 0,
    };
    const candles = [{ time: 1000 }];

    // User touched chart in past, but is NOT actively dragging or wheeling right now
    const hasPannedRef = { current: true };
    const notInteractingRef = { current: false };
    expect(
      isLoadMoreEligible(state, mockSeries, { from: 0, to: 10 } as any, () => candles, hasPannedRef, notInteractingRef),
    ).toBe(false);

    // User is actively dragging or wheeling right now
    const interactingRef = { current: true };
    expect(
      isLoadMoreEligible(state, mockSeries, { from: 0, to: 10 } as any, () => candles, hasPannedRef, interactingRef),
    ).toBe(true);
  });

  it("makeHistoryLoader skips execution when isApplyingHistoryRef is true", () => {
    const onLoaded = vi.fn();
    const seriesRef = { current: { barsInLogicalRange: () => ({ barsBefore: 5 }) } as any };
    const stateRef = { current: { loading: false, noMoreData: false, lastFetchedBeforeMs: 0, fetchFromMs: 0 } as any };
    const timeframeRef = { current: "15m" };
    const isApplyingHistoryRef = { current: true };

    const loader = makeHistoryLoader(
      "BTCUSD",
      timeframeRef,
      seriesRef,
      stateRef,
      onLoaded,
      () => [{ time: 1000 }],
      { current: true },
      { current: false },
      { current: true },
      isApplyingHistoryRef,
    );

    loader({ from: 0, to: 10 } as any);
    expect(stateRef.current.loading).toBe(false);
    expect(onLoaded).not.toHaveBeenCalled();
  });
});

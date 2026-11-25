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
  getChartPriceRange,
  getChartTimeScaleState,
  setChartPriceRange,
} from "../pages/trading/chart/chartFraming.ts";
import { getChartPreferencesFromStorage } from "../hooks/useChartPreferences.ts";
import { areCandlesConnecting, hasDiscontinuity } from "../services/demo/candles.ts";
import { handlePriceScaleWheel } from "../pages/trading/chart/chartWheelHandler.ts";
import { resolvePreservedTimeScale } from "../pages/trading/chart/useChartStateRefs.ts";

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

  it("getChartPriceRange returns null on empty/mock chart and returns range when present", () => {
    expect(getChartPriceRange(null)).toBeNull();
    expect(getChartPriceRange({} as any)).toBeNull();

    const mockPriceRange = {
      _internal_isEmpty: () => false,
      _internal_minValue: () => 56000,
      _internal_maxValue: () => 100000,
    };
    const mockChart: any = {
      _private__chartWidget: {
        _internal_model: () => ({
          _internal_panes: () => [
            {
              _internal_rightPriceScale: () => ({
                _internal_priceRange: () => mockPriceRange,
              }),
            },
          ],
        }),
      },
    };
    expect(getChartPriceRange(mockChart)).toEqual({ min: 56000, max: 100000 });
  });

  it("setChartPriceRange sets price range and disables autoScale", () => {
    const setModeSpy = vi.fn();
    const setPriceRangeSpy = vi.fn();
    const applyOptionsSpy = vi.fn();
    const updateSourcesSpy = vi.fn();
    const lightUpdateSpy = vi.fn();

    const mockPriceRange = {
      _internal_clone: () => ({ _private__minValue: 0, _private__maxValue: 0 }),
    };
    const mockChart: any = {
      _private__chartWidget: {
        _internal_model: () => ({
          _internal_panes: () => [
            {
              _internal_rightPriceScale: () => ({
                _internal_priceRange: () => mockPriceRange,
                _internal_setMode: setModeSpy,
                _internal_setPriceRange: setPriceRangeSpy,
              }),
              _internal_updateAllSources: updateSourcesSpy,
            },
          ],
          _internal_lightUpdate: lightUpdateSpy,
        }),
      },
      priceScale: () => ({ applyOptions: applyOptionsSpy }),
    };

    const result = setChartPriceRange(mockChart, { min: 56000, max: 100000 });
    expect(result).toBe(true);
    expect(setModeSpy).toHaveBeenCalledWith({ _internal_autoScale: false });
    expect(setPriceRangeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ _private__minValue: 56000, _private__maxValue: 100000 }),
    );
    expect(applyOptionsSpy).toHaveBeenCalledWith({ autoScale: false });
  });

  it("handlePriceScaleWheel supports both zooming in and zooming out", () => {
    let currentMin = 50000;
    let currentMax = 60000;
    const setPriceRangeSpy = vi.fn((newPr) => {
      currentMin = newPr._private__minValue;
      currentMax = newPr._private__maxValue;
    });

    const mockPriceRange = {
      _internal_minValue: () => currentMin,
      _internal_maxValue: () => currentMax,
      _internal_isEmpty: () => false,
      _internal_clone: () => ({ _private__minValue: currentMin, _private__maxValue: currentMax }),
    };

    const mockChart: any = {
      priceScale: () => ({
        width: () => 80,
        applyOptions: vi.fn(),
      }),
      _private__chartWidget: {
        _internal_model: () => ({
          _internal_panes: () => [
            {
              _internal_rightPriceScale: () => ({
                _internal_priceRange: () => mockPriceRange,
                _internal_setMode: vi.fn(),
                _internal_setPriceRange: setPriceRangeSpy,
              }),
              _internal_updateAllSources: vi.fn(),
            },
          ],
          _internal_lightUpdate: vi.fn(),
        }),
      },
    };

    const container = document.createElement("div");
    vi.spyOn(container, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      right: 1000,
      bottom: 600,
      width: 1000,
      height: 600,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    const seriesRef = {
      current: {
        coordinateToPrice: vi.fn((_y: number) => 55000),
      } as any,
    };

    // Zoom IN (deltaY < 0, scroll up)
    const zoomInEvent = new WheelEvent("wheel", {
      clientX: 950,
      clientY: 300,
      deltaY: -100,
    });
    handlePriceScaleWheel(zoomInEvent, container, mockChart, seriesRef, 2);

    expect(setPriceRangeSpy).toHaveBeenCalled();
    const rangeAfterZoomIn = currentMax - currentMin;
    expect(rangeAfterZoomIn).toBeLessThan(10000); // Contracted vertically (zoomed in)

    // Zoom OUT (deltaY > 0, scroll down)
    const zoomOutEvent = new WheelEvent("wheel", {
      clientX: 950,
      clientY: 300,
      deltaY: 100,
    });
    handlePriceScaleWheel(zoomOutEvent, container, mockChart, seriesRef, 2);

    const rangeAfterZoomOut = currentMax - currentMin;
    expect(rangeAfterZoomOut).toBeGreaterThan(rangeAfterZoomIn); // Expanded vertically (zoomed out)
  });

  it("frameHistoricalViewport preserves price range when preservedPriceRange is provided", () => {
    const applyOptionsSpy = vi.fn();
    const setVisibleLogicalRangeSpy = vi.fn();
    const setModeSpy = vi.fn();
    const setPriceRangeSpy = vi.fn();

    const mockPriceRange = {
      _internal_clone: () => ({ _private__minValue: 0, _private__maxValue: 0 }),
    };
    const mockChart: any = {
      timeScale: () => ({ setVisibleLogicalRange: setVisibleLogicalRangeSpy }),
      priceScale: () => ({ applyOptions: applyOptionsSpy }),
      _private__chartWidget: {
        _internal_model: () => ({
          _internal_panes: () => [
            {
              _internal_rightPriceScale: () => ({
                _internal_priceRange: () => mockPriceRange,
                _internal_setMode: setModeSpy,
                _internal_setPriceRange: setPriceRangeSpy,
              }),
              _internal_updateAllSources: vi.fn(),
            },
          ],
          _internal_lightUpdate: vi.fn(),
        }),
      },
    };

    const data = Array.from({ length: 200 }, (_, i) => ({ time: 1000 + i * 60 }));
    frameHistoricalViewport(
      mockChart, data, 1000 + 100 * 60, 80, false, null, { min: 56000, max: 100000 },
    );

    expect(setVisibleLogicalRangeSpy).toHaveBeenCalledWith({ from: 60, to: 140 });
    expect(applyOptionsSpy).not.toHaveBeenCalledWith({ autoScale: true });
    expect(setModeSpy).toHaveBeenCalledWith({ _internal_autoScale: false });
    expect(setPriceRangeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ _private__minValue: 56000, _private__maxValue: 100000 }),
    );
  });

  it("frameLatestCandles preserves price range when preservedPriceRange is provided", () => {
    const applyOptionsSpy = vi.fn();
    const setVisibleLogicalRangeSpy = vi.fn();
    const setModeSpy = vi.fn();
    const setPriceRangeSpy = vi.fn();

    const mockPriceRange = {
      _internal_clone: () => ({ _private__minValue: 0, _private__maxValue: 0 }),
    };
    const mockChart: any = {
      timeScale: () => ({ setVisibleLogicalRange: setVisibleLogicalRangeSpy }),
      priceScale: () => ({ applyOptions: applyOptionsSpy }),
      _private__chartWidget: {
        _internal_model: () => ({
          _internal_panes: () => [
            {
              _internal_rightPriceScale: () => ({
                _internal_priceRange: () => mockPriceRange,
                _internal_setMode: setModeSpy,
                _internal_setPriceRange: setPriceRangeSpy,
              }),
              _internal_updateAllSources: vi.fn(),
            },
          ],
          _internal_lightUpdate: vi.fn(),
        }),
      },
    };

    frameLatestCandles(mockChart, 100, false, { min: 56000, max: 100000 });
    expect(setVisibleLogicalRangeSpy).toHaveBeenCalledWith({ from: 20, to: 108 });
    expect(applyOptionsSpy).not.toHaveBeenCalledWith({ autoScale: true });
    expect(setModeSpy).toHaveBeenCalledWith({ _internal_autoScale: false });
    expect(setPriceRangeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ _private__minValue: 56000, _private__maxValue: 100000 }),
    );
  });

  it("getChartTimeScaleState extracts time scale metrics", () => {
    expect(getChartTimeScaleState(null)).toBeNull();
    const mockChart: any = {
      timeScale: () => ({
        options: () => ({ barSpacing: 14.5, rightOffset: 6 }),
        scrollPosition: () => 5,
        getVisibleLogicalRange: () => ({ from: 120, to: 165 }),
        getVisibleRange: () => ({ from: 1700000000, to: 1700010000 }),
      }),
    };
    const state = getChartTimeScaleState(mockChart);
    expect(state).toEqual({
      barSpacing: 14.5,
      rightOffset: 6,
      visibleBars: 45,
      scrollPosition: 5,
      lastVisibleTime: 1700010000,
    });
  });

  it("frameLatestCandles locks rightmost candle and preserves zoom ratio when preservedTimeScale is provided", () => {
    const applyOptionsSpy = vi.fn();
    const setVisibleLogicalRangeSpy = vi.fn();
    const scrollToPositionSpy = vi.fn();
    const mockChart: any = {
      timeScale: () => ({
        applyOptions: applyOptionsSpy,
        setVisibleLogicalRange: setVisibleLogicalRangeSpy,
        scrollToPosition: scrollToPositionSpy,
      }),
      priceScale: () => ({ applyOptions: vi.fn() }),
    };

    const preservedTimeScale = {
      barSpacing: 12,
      rightOffset: 4,
      visibleBars: 35,
      scrollPosition: 4,
    };

    frameLatestCandles(mockChart, 500, false, null, preservedTimeScale);

    expect(applyOptionsSpy).toHaveBeenCalledWith({
      barSpacing: 12,
      rightOffset: 4,
    });
    // to = 500 + 4 = 504, from = 504 - 35 = 469
    expect(setVisibleLogicalRangeSpy).toHaveBeenCalledWith({ from: 469, to: 504 });
    expect(scrollToPositionSpy).toHaveBeenCalledWith(4, false);
  });

  it("frameLatestCandles anchors to lastVisibleTime and preserves barSpacing when data is provided", () => {
    const applyOptionsSpy = vi.fn();
    const setVisibleLogicalRangeSpy = vi.fn();
    const scrollToPositionSpy = vi.fn();
    const mockChart: any = {
      timeScale: () => ({
        applyOptions: applyOptionsSpy,
        setVisibleLogicalRange: setVisibleLogicalRangeSpy,
        scrollToPosition: scrollToPositionSpy,
      }),
      priceScale: () => ({ applyOptions: vi.fn() }),
    };

    const data = Array.from({ length: 500 }, (_, i) => ({ time: 1000 + i * 60 }));
    const preservedTimeScale = {
      barSpacing: 14,
      rightOffset: 6,
      visibleBars: 40,
      scrollPosition: 2,
      lastVisibleTime: 1000 + 300 * 60,
      rightMarginBars: 3,
    };

    frameLatestCandles(mockChart, 500, false, null, preservedTimeScale, data);

    expect(applyOptionsSpy).toHaveBeenCalledWith({
      barSpacing: 14,
      rightOffset: 6,
    });
    // rightIdx = 300, to = 300 + 1 + 3 = 304, from = 304 - 40 = 264
    expect(setVisibleLogicalRangeSpy).toHaveBeenCalledWith({ from: 264, to: 304 });
  });

  it("frameHistoricalViewport locks rightmost candle and preserves zoom ratio when preservedTimeScale is provided", () => {
    const applyOptionsSpy = vi.fn();
    const setVisibleLogicalRangeSpy = vi.fn();
    const mockChart: any = {
      timeScale: () => ({
        applyOptions: applyOptionsSpy,
        setVisibleLogicalRange: setVisibleLogicalRangeSpy,
      }),
      priceScale: () => ({ applyOptions: vi.fn() }),
    };

    const data = Array.from({ length: 300 }, (_, i) => ({ time: 1000 + i * 60 }));
    const preservedTimeScale = {
      barSpacing: 18,
      rightOffset: 0,
      visibleBars: 25,
      scrollPosition: 0,
      lastVisibleTime: 1000 + 150 * 60,
    };

    frameHistoricalViewport(mockChart, data, 1000 + 150 * 60, 80, false, null, null, preservedTimeScale);

    expect(applyOptionsSpy).toHaveBeenCalledWith({
      barSpacing: 18,
      rightOffset: 0,
    });
    // rightIdx = 150, to = 150 + 1 = 151, from = 151 - 25 = 126
    expect(setVisibleLogicalRangeSpy).toHaveBeenCalledWith({ from: 126, to: 151 });
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

    // Timeframe switch cooldown active (Date.now() < tfCooldownUntilRef.current)
    const activeCooldownRef = { current: Date.now() + 5000 };
    expect(
      isLoadMoreEligible(state, mockSeries, { from: 0, to: 10 } as any, () => candles, hasPannedRef, interactingRef, activeCooldownRef),
    ).toBe(false);
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

  it("makeHistoryLoader skips execution during timeframe switch cooldown", () => {
    const onLoaded = vi.fn();
    const seriesRef = { current: { barsInLogicalRange: () => ({ barsBefore: 5 }) } as any };
    const stateRef = { current: { loading: false, noMoreData: false, lastFetchedBeforeMs: 0, fetchFromMs: 0 } as any };
    const timeframeRef = { current: "15m" };
    const isApplyingHistoryRef = { current: false };
    const tfCooldownUntilRef = { current: Date.now() + 5000 };

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
      tfCooldownUntilRef,
    );

    loader({ from: 0, to: 10 } as any);
    expect(stateRef.current.loading).toBe(false);
    expect(onLoaded).not.toHaveBeenCalled();
  });

  it("frameHistoricalViewport accurately aligns rightmost historical candle across timeframe switch without jumping to latest", () => {
    const setVisibleLogicalRangeSpy = vi.fn();
    const applyOptionsSpy = vi.fn();
    const mockChart: any = {
      timeScale: () => ({
        setVisibleLogicalRange: setVisibleLogicalRangeSpy,
        applyOptions: applyOptionsSpy,
      }),
    };

    // User is viewing 4h candles from last year (e.g. 1700000000)
    // 4h bar duration is 14,400s; bar starts at 1700000000, ends at 1700014400
    const historical4hEndTime = 1700014400;
    const preservedTimeScale = {
      barSpacing: 12,
      rightOffset: 0,
      visibleBars: 60,
      scrollPosition: 0,
      lastVisibleTime: 1700000000,
      lastVisibleEndTime: historical4hEndTime,
      rightMarginBars: 0,
    };

    // Switched to 30m timeframe (1800s per candle)
    // In 30m, the candle aligning to 1700014400 starts at 1700014400 - 1800 = 1700012600
    const candles30m = [
      { time: 1700009000, open: 10, high: 12, low: 9, close: 11 },
      { time: 1700010800, open: 11, high: 13, low: 10, close: 12 },
      { time: 1700012600, open: 12, high: 14, low: 11, close: 13 }, // index 2: exact 30m candle
      { time: 1700014400, open: 13, high: 15, low: 12, close: 14 },
      // Latest candles (today - e.g. 1730000000)
      { time: 1730000000, open: 50, high: 55, low: 48, close: 52 },
    ];

    frameHistoricalViewport(
      mockChart,
      candles30m,
      1700000000,
      60,
      false,
      null,
      null,
      preservedTimeScale,
      null,
      "30m",
    );

    // Target right index should be 2 (1700012600), NOT index 4 (1730000000 / today)
    // to = rightIdx + 1 + rightMargin = 2 + 1 + 0 = 3
    // from = Math.max(0, 3 - 60) = 0
    expect(setVisibleLogicalRangeSpy).toHaveBeenCalledWith({ from: 0, to: 3 });
    expect(applyOptionsSpy).toHaveBeenCalledWith({ barSpacing: 12, rightOffset: 0 });
  });

  it("frameLatestCandles and frameHistoricalViewport turn off autoScale when keepAutoScale is false", async () => {
    const applyOptionsSpy = vi.fn();
    const mockChart: any = {
      timeScale: () => ({
        setVisibleLogicalRange: vi.fn(),
        applyOptions: vi.fn(),
      }),
      priceScale: () => ({ applyOptions: applyOptionsSpy }),
    };

    frameLatestCandles(mockChart, 100, false);
    expect(applyOptionsSpy).toHaveBeenCalledWith({ autoScale: true });

    // Wait for requestAnimationFrame to disable autoScale
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(applyOptionsSpy).toHaveBeenCalledWith({ autoScale: false });
  });

  it("resolvePreservedTimeScale carries zoom ratio across symbol switches without leaking historical scroll", () => {
    const prevEntry = {
      symbol: "BTCUSDT",
      state: {
        barSpacing: 1.5,
        rightOffset: 6,
        visibleBars: 1100,
        scrollPosition: -250,
        lastVisibleTime: 1700000000,
      },
    };

    const resolved = resolvePreservedTimeScale(
      prevEntry,
      "ETHUSDT",
      null,
      false,
      false,
      true,
    );

    expect(resolved).toEqual({
      barSpacing: 1.5,
      rightOffset: 6,
      visibleBars: 1100,
      scrollPosition: 6,
    });

    const applyOptionsSpy = vi.fn();
    const setVisibleLogicalRangeSpy = vi.fn();
    const mockChart: any = {
      timeScale: () => ({
        applyOptions: applyOptionsSpy,
        setVisibleLogicalRange: setVisibleLogicalRangeSpy,
        scrollToPosition: vi.fn(),
      }),
      priceScale: () => ({ applyOptions: vi.fn() }),
    };

    // Even when zoomed out wider than barCount (1000 < 1100), from is not clamped to 0
    frameLatestCandles(mockChart, 1000, false, null, resolved);
    expect(applyOptionsSpy).toHaveBeenCalledWith({ barSpacing: 1.5, rightOffset: 6 });
    expect(setVisibleLogicalRangeSpy).toHaveBeenCalledWith({ from: -94, to: 1006 });
  });
});

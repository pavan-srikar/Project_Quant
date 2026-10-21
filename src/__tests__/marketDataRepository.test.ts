import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  areCandlesConnecting,
  candleRepository,
  hasDiscontinuity,
  mergeCandleArrays,
} from "../services/market-data/index.ts";
import { isSeriesAtLiveEdge } from "../pages/trading/chart/realtimeFeed.ts";

describe("Market Data Repository Tests", () => {
  beforeEach(() => {
    candleRepository.clear();
  });

  it("mergeCandleArrays deduplicates bars and sorts ascending by time", () => {
    const chunkA = [
      { time: 1000, open: 10, high: 12, low: 9, close: 11, volume: 100 },
      { time: 1060, open: 11, high: 13, low: 10, close: 12, volume: 150 },
    ];
    const chunkB = [
      { time: 1060, open: 11, high: 14, low: 10, close: 13, volume: 200 }, // updated close
      { time: 1120, open: 13, high: 15, low: 12, close: 14, volume: 180 },
    ];

    const merged = mergeCandleArrays(chunkA, chunkB);
    expect(merged.length).toBe(3);
    expect(merged[0]!.time).toBe(1000);
    expect(merged[1]!.time).toBe(1060);
    expect(merged[1]!.close).toBe(13); // chunkB overwrite
    expect(merged[2]!.time).toBe(1120);
  });

  it("areCandlesConnecting correctly detects gap between disconnected islands", () => {
    const febBars = [
      { time: 1770000000, open: 66000, high: 66500, low: 65800, close: 66200, volume: 10 },
      { time: 1770000900, open: 66200, high: 66400, low: 66100, close: 66300, volume: 15 },
    ];
    // 8 months later
    const octBars = [
      { time: 1790000000, open: 84000, high: 84500, low: 83900, close: 84200, volume: 20 },
      { time: 1790000900, open: 84200, high: 84600, low: 84100, close: 84500, volume: 25 },
    ];
    const adjacentBars = [
      { time: 1770001800, open: 66300, high: 66600, low: 66200, close: 66500, volume: 12 },
    ];

    expect(areCandlesConnecting(febBars, octBars, "15m")).toBe(false);
    expect(areCandlesConnecting(febBars, adjacentBars, "15m")).toBe(true);
  });

  it("hasDiscontinuity returns true when candles have an 8-month gap", () => {
    const contiguous = [
      { time: 1000, open: 1, high: 2, low: 1, close: 2, volume: 1 },
      { time: 1900, open: 2, high: 3, low: 2, close: 3, volume: 1 },
      { time: 2800, open: 3, high: 4, low: 3, close: 4, volume: 1 },
    ];
    const withGap = [
      { time: 1000, open: 1, high: 2, low: 1, close: 2, volume: 1 },
      { time: 10000000, open: 2, high: 3, low: 2, close: 3, volume: 1 },
    ];

    expect(hasDiscontinuity(contiguous, "15m")).toBe(false);
    expect(hasDiscontinuity(withGap, "15m")).toBe(true);
  });

  it("loadHistoricalWindow does not merge disconnected islands into a Frankenstein chart", async () => {
    // Seed repository with live October candles
    const octBars = [
      { time: 1790000000, open: 84000, high: 84500, low: 83900, close: 84200, volume: 20 },
      { time: 1790000900, open: 84200, high: 84600, low: 84100, close: 84500, volume: 25 },
    ];
    candleRepository.setSeries("BTCUSD", "15m", octBars);

    // Mock fetch to return February candles around targetTime
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve([
            [1770000000 * 1000, "66000", "66500", "65800", "66200", "10"],
            [1770000900 * 1000, "66200", "66400", "66100", "66300", "15"],
          ]),
      } as any),
    );

    const result = await candleRepository.loadHistoricalWindow("BTCUSD", "15m", 1770000000, 100);

    // Result should ONLY have the February candles, not October joined next to Feb!
    expect(result.length).toBe(2);
    expect(result[0]!.time).toBe(1770000000);
    expect(result[1]!.time).toBe(1770000900);
    expect(hasDiscontinuity(result, "15m")).toBe(false);

    fetchSpy.mockRestore();
  });

  it("isSeriesAtLiveEdge correctly distinguishes live edge from historical charts", () => {
    const nowSec = Math.floor(Date.now() / 1000);

    // Current bar within 15m interval tolerance
    expect(isSeriesAtLiveEdge(nowSec - 300, "15m")).toBe(true);

    // Weekend forex tolerance (e.g. 2 days ago)
    expect(isSeriesAtLiveEdge(nowSec - 86400 * 2, "15m")).toBe(true);

    // Historical date (e.g. 2 months ago in August)
    expect(isSeriesAtLiveEdge(nowSec - 86400 * 60, "15m")).toBe(false);
  });

  it("fetchNewer loads contiguous newer candles forwards in time", async () => {
    // Seed with February candles
    const febBars = [
      { time: 1770000000, open: 66000, high: 66500, low: 65800, close: 66200, volume: 10 },
      { time: 1770000900, open: 66200, high: 66400, low: 66100, close: 66300, volume: 15 },
    ];
    candleRepository.setSeries("BTCUSD", "15m", febBars);

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve([
            [(1770000900 + 900) * 1000, "66300", "66700", "66250", "66600", "18"],
            [(1770000900 + 1800) * 1000, "66600", "66800", "66500", "66750", "22"],
          ]),
      } as any),
    );

    const newer = await candleRepository.fetchNewer("BTCUSD", "15m", 10);
    expect(newer.length).toBe(2);
    expect(newer[0]!.time).toBe(1770001800);
    expect(newer[1]!.time).toBe(1770002700);

    const series = candleRepository.getSeries("BTCUSD", "15m");
    expect(series.length).toBe(4);
    expect(hasDiscontinuity(series, "15m")).toBe(false);

    fetchSpy.mockRestore();
  });
});

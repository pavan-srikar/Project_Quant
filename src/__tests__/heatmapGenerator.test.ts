import { describe, expect, it } from "vitest";
import {
  calculateLiqPrice,
  generateHeatmapGrid,
  generateLiquidationBands,
} from "../lib/chart-plugins/heatmap/heatmap-generator.ts";
import { viridisColor } from "../lib/chart-plugins/heatmap/heatmap-renderer.ts";
import type { Candle } from "../services/schemas.ts";

describe("heatmapGenerator", () => {
  it("calculates long and short liquidation prices correctly across leverage tiers", () => {
    const entry = 50000;

    // 100x: offset 0.008 (0.8%)
    const long100x = calculateLiqPrice(entry, "long", 100);
    const short100x = calculateLiqPrice(entry, "short", 100);
    expect(long100x).toBe(49600);
    expect(short100x).toBe(50400);

    // 50x: offset 0.018 (1.8%)
    const long50x = calculateLiqPrice(entry, "long", 50);
    const short50x = calculateLiqPrice(entry, "short", 50);
    expect(long50x).toBe(49100);
    expect(short50x).toBe(50900);

    // 25x: offset 0.038 (3.8%)
    const long25x = calculateLiqPrice(entry, "long", 25);
    const short25x = calculateLiqPrice(entry, "short", 25);
    expect(long25x).toBe(48100);
    expect(short25x).toBe(51900);

    // 10x: offset 0.095 (9.5%)
    const long10x = calculateLiqPrice(entry, "long", 10);
    const short10x = calculateLiqPrice(entry, "short", 10);
    expect(long10x).toBe(45250);
    expect(short10x).toBe(54750);
  });

  it("generates liquidation bands and simulates price sweeps", () => {
    const candles: Candle[] = [
      {
        time: 1700000000,
        open: 50000,
        high: 50100,
        low: 49900,
        close: 50000,
        volume: 1000,
        takerBuyVolume: 600, // 600 buy vol, 400 sell vol
      },
      {
        // Candle drops to 49500: should sweep 100x long liq (49600)
        time: 1700000060,
        open: 50000,
        high: 50050,
        low: 49500,
        close: 49700,
        volume: 800,
        takerBuyVolume: 300,
      },
      {
        // Candle pushes up to 50500: should sweep 100x short liq (50400)
        time: 1700000120,
        open: 49700,
        high: 50500,
        low: 49650,
        close: 50300,
        volume: 900,
        takerBuyVolume: 500,
      },
    ];

    const bands = generateLiquidationBands(candles);
    expect(bands.length).toBeGreaterThan(0);

    // Find the 100x long band generated from candle 0
    const long100 = bands.find((b) => b.side === "long" && b.leverage === 100 && b.startTime === 1700000000);
    expect(long100).toBeDefined();
    expect(long100?.isSwept).toBe(true);
    expect(long100?.endTime).toBe(1700000060);

    // Find the 10x long band (liq price 45250) - candle low only reached 49500, so NOT swept
    const long10 = bands.find((b) => b.side === "long" && b.leverage === 10 && b.startTime === 1700000000);
    expect(long10).toBeDefined();
    expect(long10?.isSwept).toBe(false);
    expect(long10?.endTime).toBeNull();

    // Find the 100x short band generated from candle 0
    const short100 = bands.find((b) => b.side === "short" && b.leverage === 100 && b.startTime === 1700000000);
    expect(short100).toBeDefined();
    expect(short100?.isSwept).toBe(true);
    expect(short100?.endTime).toBe(1700000120);
  });

  it("handles empty or zero-volume candle inputs safely", () => {
    expect(generateLiquidationBands([])).toEqual([]);

    const zeroVolCandle: Candle = {
      time: 1700000000,
      open: 100,
      high: 100,
      low: 100,
      close: 100,
      volume: 0,
    };
    expect(generateLiquidationBands([zeroVolCandle])).toEqual([]);
  });

  it("produces valid Viridis colormap values", () => {
    const minColor = viridisColor(0);
    const midColor = viridisColor(0.5);
    const maxColor = viridisColor(1.0);

    expect(minColor).toContain("rgba(");
    expect(midColor).toContain("rgba(");
    expect(maxColor).toContain("rgba(");

    // Boundary clamping
    expect(viridisColor(-0.5)).toBe(minColor);
    expect(viridisColor(1.5)).toBe(maxColor);
  });

  it("filters liquidation bands according to sensitivity preset", () => {
    const candles: Candle[] = [
      {
        time: 1700000000,
        open: 50000,
        high: 50100,
        low: 49900,
        close: 50000,
        volume: 1000,
        takerBuyVolume: 600,
      },
      {
        time: 1700000060,
        open: 50000,
        high: 50050,
        low: 49500,
        close: 49700,
        volume: 800,
        takerBuyVolume: 300,
      },
    ];

    const highBands = generateLiquidationBands(candles, "high");
    const lowBands = generateLiquidationBands(candles, "low");
    expect(highBands.length).toBeGreaterThanOrEqual(lowBands.length);
  });

  it("generates 2D continuous liquidation heatmap grid with cumulative order flow and sweeps", () => {
    const candles: Candle[] = [
      {
        time: 1700000000,
        open: 50000,
        high: 50100,
        low: 49900,
        close: 50000,
        volume: 1000,
        takerBuyVolume: 600,
      },
      {
        time: 1700000060,
        open: 50000,
        high: 50050,
        low: 49500, // plunges down, sweeping 100x long liq
        close: 49700,
        volume: 800,
        takerBuyVolume: 300,
      },
      {
        time: 1700000120,
        open: 49700,
        high: 50500, // surges up, sweeping 100x short liq
        low: 49650,
        close: 50300,
        volume: 900,
        takerBuyVolume: 500,
      },
    ];

    const gridData = generateHeatmapGrid(candles, "medium", 60);
    expect(gridData.colCount).toBe(3);
    expect(gridData.rowCount).toBe(60);
    expect(gridData.grid.length).toBe(3 * 60);
    expect(gridData.maxVol).toBeGreaterThan(0);
    expect(gridData.threshold).toBeLessThan(gridData.ceiling);

    // Empty candle handling
    const emptyGrid = generateHeatmapGrid([]);
    expect(emptyGrid.colCount).toBe(0);
    expect(emptyGrid.rowCount).toBe(0);
    expect(emptyGrid.grid.length).toBe(0);

    // Sensitivity presets on gridData
    const highGrid = generateHeatmapGrid(candles, "high", 60);
    const lowGrid = generateHeatmapGrid(candles, "low", 60);
    expect(highGrid.threshold).toBeLessThan(lowGrid.threshold);

    // Custom dual-handle threshold and ceiling ratios
    const customGrid = generateHeatmapGrid(candles, "medium", 60, 0.165, 0.412);
    expect(customGrid.threshold).toBeCloseTo(customGrid.maxVol * 0.165, 2);
    expect(customGrid.ceiling).toBeCloseTo(customGrid.maxVol * 0.412, 2);
  });
});

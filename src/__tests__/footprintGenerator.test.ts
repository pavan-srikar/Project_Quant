import { describe, expect, it } from "vitest";
import { generateFootprintBar } from "../lib/chart-plugins/footprint/footprint-generator.ts";
import type { Candle } from "../services/schemas.ts";

describe("footprintGenerator", () => {
  it("generates footprint bar with price levels conserving volume", () => {
    const candle: Candle = {
      time: 1700000000,
      open: 50000,
      high: 52000,
      low: 49000,
      close: 51500,
      volume: 1000,
      takerBuyVolume: 600,
    };

    const bar = generateFootprintBar(candle);

    expect(bar.timeSec).toBe(1700000000);
    expect(bar.totalVolume).toBe(1000);
    expect(bar.totalBuyVol).toBe(600);
    expect(bar.totalSellVol).toBe(400);
    expect(bar.delta).toBe(200);

    expect(bar.levels.length).toBeGreaterThan(5);

    // Verify levels are sorted descending by price (highest price first)
    for (let i = 1; i < bar.levels.length; i++) {
      expect(bar.levels[i - 1]!.price).toBeGreaterThan(bar.levels[i]!.price);
    }

    // Verify at least one level is flagged as POC
    const pocCount = bar.levels.filter((l) => l.isPoc).length;
    expect(pocCount).toBe(1);

    // Verify POC has the maximum total volume
    const pocLevel = bar.levels.find((l) => l.isPoc)!;
    for (const lvl of bar.levels) {
      expect(pocLevel.totalVol).toBeGreaterThanOrEqual(lvl.totalVol);
    }
  });

  it("handles zero volume candle gracefully", () => {
    const candle: Candle = {
      time: 1700000000,
      open: 100,
      high: 100,
      low: 100,
      close: 100,
      volume: 0,
    };

    const bar = generateFootprintBar(candle);
    expect(bar.totalVolume).toBe(0);
    expect(bar.levels.length).toBe(1);
    expect(bar.levels[0]?.isPoc).toBe(true);
  });
});

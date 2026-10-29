import { describe, expect, it } from "vitest";
import {
  calculateBarDelta,
  calculateCvdSeries,
  formatDelta,
} from "../lib/orderFlowDelta.ts";
import type { Candle } from "../services/schemas.ts";

describe("orderFlowDelta", () => {
  it("calculates exact taker buy delta when takerBuyVolume is provided", () => {
    const candle: Candle = {
      time: 1700000000,
      open: 100,
      high: 105,
      low: 95,
      close: 102,
      volume: 1000,
      takerBuyVolume: 650,
    };
    const res = calculateBarDelta(candle);
    expect(res.buyVol).toBe(650);
    expect(res.sellVol).toBe(350);
    expect(res.delta).toBe(300);
    expect(res.deltaPercent).toBe(30);
  });

  it("handles negative delta when selling dominates", () => {
    const candle: Candle = {
      time: 1700000000,
      open: 100,
      high: 105,
      low: 95,
      close: 96,
      volume: 1000,
      takerBuyVolume: 300,
    };
    const res = calculateBarDelta(candle);
    expect(res.buyVol).toBe(300);
    expect(res.sellVol).toBe(700);
    expect(res.delta).toBe(-400);
    expect(res.deltaPercent).toBe(-40);
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
    const res = calculateBarDelta(candle);
    expect(res.buyVol).toBe(0);
    expect(res.sellVol).toBe(0);
    expect(res.delta).toBe(0);
    expect(res.deltaPercent).toBe(0);
  });

  it("calculates cumulative volume delta (CVD) across consecutive candles", () => {
    const candles: Candle[] = [
      {
        time: 1700000000,
        open: 100,
        high: 105,
        low: 95,
        close: 102,
        volume: 1000,
        takerBuyVolume: 600, // delta = +200
      },
      {
        time: 1700000060,
        open: 102,
        high: 106,
        low: 101,
        close: 105,
        volume: 800,
        takerBuyVolume: 500, // delta = +200
      },
      {
        time: 1700000120,
        open: 105,
        high: 105,
        low: 98,
        close: 99,
        volume: 1200,
        takerBuyVolume: 300, // delta = -600
      },
    ];

    const cvdSeries = calculateCvdSeries(candles);
    expect(cvdSeries).toHaveLength(3);
    expect(cvdSeries[0]?.delta).toBe(200);
    expect(cvdSeries[0]?.cvd).toBe(200);

    expect(cvdSeries[1]?.delta).toBe(200);
    expect(cvdSeries[1]?.cvd).toBe(400);

    expect(cvdSeries[2]?.delta).toBe(-600);
    expect(cvdSeries[2]?.cvd).toBe(-200);
  });

  it("formats delta values cleanly", () => {
    expect(formatDelta(1500)).toBe("+1.50K");
    expect(formatDelta(-2450000)).toBe("-2.45M");
    expect(formatDelta(45.67)).toBe("+45.67");
    expect(formatDelta(0)).toBe("0.00");
  });
});

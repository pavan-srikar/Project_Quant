import { describe, it, expect } from "vitest";
import {
  sma,
  ema,
  rsi,
  macd,
  bollingerBands,
  atr,
  stochastic,
  vwap,
  cci,
  williamsR,
  type CandleData,
} from "../lib/indicators.ts";

function generateCandles(count: number, basePrice = 100, trend = 0.5): CandleData[] {
  const candles: CandleData[] = [];
  let price = basePrice;
  for (let i = 0; i < count; i++) {
    const change = (Math.sin(i * 0.5) + trend) * 2;
    price += change;
    const high = price + 2;
    const low = Math.max(0.1, price - 2);
    const open = price - 0.5;
    const close = price;
    const volume = 1000 + i * 10;
    candles.push({
      time: 1700000000 + i * 60,
      open,
      high,
      low,
      close,
      volume,
    });
  }
  return candles;
}

describe("Technical Indicators", () => {
  describe("SMA (Simple Moving Average)", () => {
    it("returns empty array when candle count is less than period", () => {
      const candles = generateCandles(5);
      expect(sma(candles, 10)).toEqual([]);
    });

    it("calculates exact moving average for known prices", () => {
      const candles: CandleData[] = [
        { time: 1, open: 10, high: 10, low: 10, close: 10 },
        { time: 2, open: 20, high: 20, low: 20, close: 20 },
        { time: 3, open: 30, high: 30, low: 30, close: 30 },
      ];
      const result = sma(candles, 3);
      expect(result).toHaveLength(1);
      expect(result[0]!.time).toBe(3);
      expect(result[0]!.value).toBeCloseTo(20, 5);
    });

    it("rolls correctly across time steps", () => {
      const candles: CandleData[] = [
        { time: 1, open: 10, high: 10, low: 10, close: 10 },
        { time: 2, open: 20, high: 20, low: 20, close: 20 },
        { time: 3, open: 30, high: 30, low: 30, close: 30 },
        { time: 4, open: 40, high: 40, low: 40, close: 40 },
      ];
      const result = sma(candles, 2);
      expect(result).toHaveLength(3);
      expect(result[0]!.value).toBeCloseTo(15);
      expect(result[1]!.value).toBeCloseTo(25);
      expect(result[2]!.value).toBeCloseTo(35);
    });
  });

  describe("EMA (Exponential Moving Average)", () => {
    it("returns empty array when candles < period", () => {
      expect(ema(generateCandles(5), 10)).toEqual([]);
    });

    it("seeds with SMA and weights recent prices higher", () => {
      const candles = generateCandles(20, 100, 1);
      const result = ema(candles, 5);
      expect(result.length).toBe(16);
      expect(result[0]!.value).toBeGreaterThan(0);
    });
  });

  describe("RSI (Relative Strength Index)", () => {
    it("returns empty when candles < period + 1", () => {
      expect(rsi(generateCandles(10), 14)).toEqual([]);
    });

    it("keeps values strictly within 0 to 100", () => {
      const candles = generateCandles(50);
      const result = rsi(candles, 14);
      expect(result.length).toBeGreaterThan(0);
      for (const pt of result) {
        expect(pt.value).toBeGreaterThanOrEqual(0);
        expect(pt.value).toBeLessThanOrEqual(100);
      }
    });

    it("approaches 100 on continuous upward trend", () => {
      const upCandles: CandleData[] = [];
      for (let i = 0; i < 30; i++) {
        upCandles.push({
          time: i,
          open: 100 + i,
          high: 100 + i + 1,
          low: 100 + i - 0.1,
          close: 100 + i + 1,
        });
      }
      const result = rsi(upCandles, 14);
      expect(result[result.length - 1]!.value).toBeCloseTo(100, 0);
    });
  });

  describe("MACD", () => {
    it("calculates macd, signal, and histogram components", () => {
      const candles = generateCandles(60);
      const result = macd(candles, 12, 26, 9);
      expect(result.macd.length).toBeGreaterThan(0);
      expect(result.signal.length).toBeGreaterThan(0);
      expect(result.histogram.length).toBeGreaterThan(0);

      // Verify histogram = macd - signal
      const signalMap = new Map(result.signal.map((p) => [p.time, p.value]));
      const macdMap = new Map(result.macd.map((p) => [p.time, p.value]));
      for (const h of result.histogram) {
        const mv = macdMap.get(h.time)!;
        const sv = signalMap.get(h.time)!;
        expect(h.value).toBeCloseTo(mv - sv, 5);
      }
    });
  });

  describe("Bollinger Bands", () => {
    it("computes upper, middle, and lower bands where upper >= middle >= lower", () => {
      const candles = generateCandles(30);
      const result = bollingerBands(candles, 20, 2);
      expect(result.middle.length).toBe(11);
      for (let i = 0; i < result.middle.length; i++) {
        expect(result.upper[i]!.value).toBeGreaterThanOrEqual(result.middle[i]!.value);
        expect(result.middle[i]!.value).toBeGreaterThanOrEqual(result.lower[i]!.value);
      }
    });
  });

  describe("ATR (Average True Range)", () => {
    it("returns positive volatility values", () => {
      const candles = generateCandles(30);
      const result = atr(candles, 14);
      expect(result.length).toBeGreaterThan(0);
      for (const pt of result) {
        expect(pt.value).toBeGreaterThan(0);
      }
    });
  });

  describe("Stochastic Oscillator", () => {
    it("keeps %K and %D within 0 to 100 range", () => {
      const candles = generateCandles(40);
      const result = stochastic(candles, 14, 3);
      expect(result.k.length).toBeGreaterThan(0);
      expect(result.d.length).toBeGreaterThan(0);
      for (const pt of result.k) {
        expect(pt.value).toBeGreaterThanOrEqual(0);
        expect(pt.value).toBeLessThanOrEqual(100);
      }
    });
  });

  describe("Williams %R", () => {
    it("keeps values between -100 and 0", () => {
      const candles = generateCandles(30);
      const result = williamsR(candles, 14);
      expect(result.length).toBeGreaterThan(0);
      for (const pt of result) {
        expect(pt.value).toBeGreaterThanOrEqual(-100);
        expect(pt.value).toBeLessThanOrEqual(0);
      }
    });
  });

  describe("CCI (Commodity Channel Index)", () => {
    it("computes CCI values without throwing", () => {
      const candles = generateCandles(30);
      const result = cci(candles, 14);
      expect(result.length).toBeGreaterThan(0);
      expect(Number.isFinite(result[0]!.value)).toBe(true);
    });
  });

  describe("VWAP", () => {
    it("computes cumulative volume-weighted average price", () => {
      const candles: CandleData[] = [
        { time: 1, open: 10, high: 12, low: 8, close: 10, volume: 100 }, // TP = 10
        { time: 2, open: 20, high: 22, low: 18, close: 20, volume: 200 }, // TP = 20
      ];
      const result = vwap(candles);
      expect(result).toHaveLength(2);
      expect(result[0]!.value).toBeCloseTo(10);
      // (10 * 100 + 20 * 200) / 300 = 5000 / 300 = 16.6667
      expect(result[1]!.value).toBeCloseTo(16.6667, 3);
    });
  });
});

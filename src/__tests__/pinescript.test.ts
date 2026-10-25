import { describe, expect, it } from "vitest";
import { parsePineScript } from "../lib/pinescript/parser";
import { evaluatePineScript } from "../lib/pinescript/evaluator";
import type { CandleData } from "../lib/indicators/types";

describe("Pine Script Engine", () => {
  it("parses indicator header and inputs", () => {
    const code = `
      //@version=5
      indicator("My Test Indicator", overlay=true)
      len = input.int(14, "Length")
      mult = input.float(2.5, "Multiplier")
      plot(close, "Close Price", color.blue, 2)
    `;
    const parsed = parsePineScript(code);
    expect(parsed.title).toBe("My Test Indicator");
    expect(parsed.overlay).toBe(true);
    expect(parsed.inputs.length).toBe(2);
    expect(parsed.inputs[0]?.id).toBe("len");
    expect(parsed.inputs[0]?.defval).toBe(14);
    expect(parsed.inputs[1]?.id).toBe("mult");
    expect(parsed.inputs[1]?.defval).toBe(2.5);
    expect(parsed.plots.length).toBe(1);
    expect(parsed.plots[0]?.title).toBe("Close Price");
  });

  it("evaluates technical analysis SMA and plot expressions", () => {
    const code = `
      //@version=5
      indicator("SMA Test", overlay=true)
      fastLen = input.int(2, "Fast")
      fastSMA = ta.sma(close, fastLen)
      plot(fastSMA, "Fast SMA", color.yellow)
    `;
    const parsed = parsePineScript(code);
    const candles: CandleData[] = [
      { time: 1000, open: 10, high: 15, low: 9, close: 10 },
      { time: 2000, open: 11, high: 16, low: 10, close: 20 },
      { time: 3000, open: 21, high: 32, low: 19, close: 30 },
    ];
    const res = evaluatePineScript(candles, parsed);
    expect(res.error).toBeUndefined();
    expect(res.plots.length).toBe(1);
    const pts = res.plots[0]?.values ?? [];
    expect(pts.length).toBe(2);
    expect(pts[0]?.time).toBe(2000);
    expect(pts[0]?.value).toBe(15); // (10 + 20) / 2
    expect(pts[1]?.time).toBe(3000);
    expect(pts[1]?.value).toBe(25); // (20 + 30) / 2
  });

  it("evaluates sub-chart indicators with hline levels", () => {
    const code = `
      //@version=5
      indicator("RSI Custom", overlay=false)
      r = ta.rsi(close, 2)
      plot(r, "RSI", color.purple)
      hline(70, "Overbought", color.red)
      hline(30, "Oversold", color.green)
    `;
    const parsed = parsePineScript(code);
    expect(parsed.overlay).toBe(false);
    expect(parsed.hlines.length).toBe(2);
    expect(parsed.hlines[0]?.price).toBe(70);
    expect(parsed.hlines[1]?.price).toBe(30);

    const candles: CandleData[] = [
      { time: 1, open: 10, high: 12, low: 9, close: 10 },
      { time: 2, open: 10, high: 15, low: 10, close: 15 },
      { time: 3, open: 15, high: 18, low: 14, close: 18 },
      { time: 4, open: 18, high: 20, low: 11, close: 12 },
    ];
    const res = evaluatePineScript(candles, parsed);
    expect(res.plots.length).toBe(1);
    expect(res.hlines.length).toBe(2);
  });
});

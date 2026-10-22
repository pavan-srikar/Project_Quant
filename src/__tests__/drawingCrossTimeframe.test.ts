import { describe, expect, it } from "vitest";
import { timeToLogical, type ResolveCtx } from "../lib/chart-plugins/drawing-tools/coords";
import { INDICATOR_REGISTRY } from "../lib/indicators";

describe("Drawing Cross-Timeframe Resolution", () => {
  const sep20 = 1726790400; // 20 Sep 2024 00:00:00 UTC
  const sep26 = 1727308800; // 26 Sep 2024 00:00:00 UTC
  const durationSec = sep26 - sep20; // 518,400 seconds = 6 days

  it("calculates correct logical span on 4h timeframe (36 bars)", () => {
    // 4h candles
    const interval4h = 14400;
    const candles4h = Array.from({ length: 50 }, (_, i) => ({
      time: (sep20 + i * interval4h) as any,
    }));

    const ctx4h: ResolveCtx = {
      chart: {} as any,
      series: {} as any,
      intervalSec: interval4h,
      data: candles4h,
    };

    const l1 = timeToLogical(ctx4h, sep20);
    const l2 = timeToLogical(ctx4h, sep26);

    expect(l1).toBe(0);
    expect(l2).toBe(36);
    expect(l2! - l1!).toBe(36);
  });

  it("calculates correct logical span on 30m timeframe (288 bars), never shrinking to 36 bars", () => {
    // 30m candles
    const interval30m = 1800;
    const candles30m = Array.from({ length: 350 }, (_, i) => ({
      time: (sep20 + i * interval30m) as any,
    }));

    const ctx30m: ResolveCtx = {
      chart: {} as any,
      series: {} as any,
      intervalSec: interval30m,
      data: candles30m,
    };

    const l1 = timeToLogical(ctx30m, sep20);
    const l2 = timeToLogical(ctx30m, sep26);

    expect(l1).toBe(0);
    expect(l2).toBe(288);
    // 288 bars of 30m = 6 days = exact same calendar duration as 36 bars of 4h
    expect(l2! - l1!).toBe(288);
    expect((l2! - l1!) * interval30m).toBe(durationSec);
  });

  it("preserves calendar span via intervalSec extrapolation when anchors precede loaded data", () => {
    const interval30m = 1800;
    const loadedStart = sep26 + 86400; // loaded data starts 1 day after sep26
    const candles30m = Array.from({ length: 100 }, (_, i) => ({
      time: (loadedStart + i * interval30m) as any,
    }));

    const ctx30m: ResolveCtx = {
      chart: {} as any,
      series: {} as any,
      intervalSec: interval30m,
      data: candles30m,
    };

    const l1 = timeToLogical(ctx30m, sep20);
    const l2 = timeToLogical(ctx30m, sep26);

    expect(l2! - l1!).toBe(288);
    expect((l2! - l1!) * interval30m).toBe(durationSec);
  });

  it("calculates logical offset using intervalSec when data has large gaps or timeframe mismatches", () => {
    const interval30m = 1800;
    // Data has a 4-hour gap between bar 0 and bar 1
    const candlesWithGap = [
      { time: sep20 as any },
      { time: (sep20 + 14400) as any }, // 4 hours later
    ];

    const ctx30m: ResolveCtx = {
      chart: {} as any,
      series: {} as any,
      intervalSec: interval30m,
      data: candlesWithGap,
    };

    // A timestamp 1 hour after bar 0 (should be 2 bars of 30m, not squashed to 0.25 bars)
    const time1h = sep20 + 3600;
    const l = timeToLogical(ctx30m, time1h);

    expect(l).toBe(2); // exactly 2 30m bars from bar 0
  });
});

describe("Single Bottom Date Bar Configuration", () => {
  it("identifies below indicators correctly via INDICATOR_REGISTRY", () => {
    const rsiConfig = INDICATOR_REGISTRY.find(
      (r) => r.type === "RSI" || r.type.toLowerCase() === "rsi",
    );
    expect(rsiConfig?.pane).toBe("below");

    const smaConfig = INDICATOR_REGISTRY.find(
      (r) => r.type === "SMA" || r.type.toLowerCase() === "sma",
    );
    expect(smaConfig?.pane).toBe("overlay");

    const activeIndicators = ["RSI", "SMA"] as any;
    const hasActiveBelowIndicators = activeIndicators.some((t: any) => {
      const cfg = INDICATOR_REGISTRY.find(
        (r) => r.type === t || r.type.toLowerCase() === String(t).toLowerCase(),
      );
      return cfg && cfg.pane === "below";
    });
    expect(hasActiveBelowIndicators).toBe(true);

    const isBottomCollapsed = false;
    const bottomTab = "indicators";
    const isBottomIndicatorActive =
      !isBottomCollapsed && bottomTab === "indicators" && hasActiveBelowIndicators;

    expect(isBottomIndicatorActive).toBe(true);
  });

  it("disables bottom indicator active flag when bottom panel is collapsed or on positions tab", () => {
    const activeIndicators = ["rsi"] as any;
    const hasActiveBelowIndicators = activeIndicators.some((t: any) => {
      const cfg = INDICATOR_REGISTRY.find((r) => r.type === t);
      return cfg && cfg.pane === "below";
    });

    const isCollapsed = true;
    const currentTab: string = "indicators";
    const whenCollapsed = !isCollapsed && currentTab === "indicators" && hasActiveBelowIndicators;
    expect(whenCollapsed).toBe(false);

    const isExpanded = false;
    const tabName: string = "positions";
    const whenPositionsTab = !isExpanded && tabName === "indicators" && hasActiveBelowIndicators;
    expect(whenPositionsTab).toBe(false);
  });
});

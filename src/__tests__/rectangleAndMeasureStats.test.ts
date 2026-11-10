import { describe, expect, it, vi } from "vitest";
import { buildNew } from "../lib/chart-plugins/drawing-tools/factories.ts";
import { renderRectangle } from "../lib/chart-plugins/drawing-tools/renderers/shape-renderers.ts";
import { formatDuration, trendlineStats } from "../lib/chart-plugins/drawing-tools/resolve-trendline.ts";

describe("Rectangle default border width", () => {
  it("defaults rectangle border width to 0", () => {
    const rect = buildNew(
      "rectangle",
      { time: 1000, price: 100 },
      { time: 2000, price: 150 },
      "1m",
      60,
    );
    expect(rect.type).toBe("rectangle");
    expect(rect.width).toBe(0);
  });

  it("renderRectangle only fills without stroke when width is 0", () => {
    const fillRectSpy = vi.fn();
    const strokeRectSpy = vi.fn();
    const mockScope: any = {
      context: {
        save: vi.fn(),
        restore: vi.fn(),
        fillRect: fillRectSpy,
        strokeRect: strokeRectSpy,
        beginPath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        setLineDash: vi.fn(),
      },
      horizontalPixelRatio: 1,
      verticalPixelRatio: 1,
    };

    const entry: any = {
      d: { id: "r1", type: "rectangle", color: "#f0b90b", width: 0 },
      x1: 10,
      y1: 20,
      x2: 100,
      y2: 200,
      state: "normal",
    };

    renderRectangle(mockScope, entry);
    expect(fillRectSpy).toHaveBeenCalledTimes(1);
    expect(strokeRectSpy).not.toHaveBeenCalled();
  });

  it("renderRectangle strokes border when width > 0", () => {
    const fillRectSpy = vi.fn();
    const strokeRectSpy = vi.fn();
    const mockScope: any = {
      context: {
        save: vi.fn(),
        restore: vi.fn(),
        fillRect: fillRectSpy,
        strokeRect: strokeRectSpy,
        beginPath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        setLineDash: vi.fn(),
      },
      horizontalPixelRatio: 1,
      verticalPixelRatio: 1,
    };

    const entry: any = {
      d: { id: "r2", type: "rectangle", color: "#f0b90b", width: 2 },
      x1: 10,
      y1: 20,
      x2: 100,
      y2: 200,
      state: "normal",
    };

    renderRectangle(mockScope, entry);
    expect(fillRectSpy).toHaveBeenCalledTimes(1);
    expect(strokeRectSpy).toHaveBeenCalledTimes(1);
  });
});

describe("Measuring tool time duration stats (days:hours:min)", () => {
  it("formatDuration formats minutes, hours, and days correctly", () => {
    // 15 minutes
    expect(formatDuration(15 * 60)).toBe("15m");
    // 4 hours
    expect(formatDuration(4 * 3600)).toBe("4h 0m");
    // 4 hours 30 mins
    expect(formatDuration(4 * 3600 + 30 * 60)).toBe("4h 30m");
    // 2 days 5 hours 15 mins
    expect(formatDuration(2 * 86400 + 5 * 3600 + 15 * 60)).toBe("2d 5h 15m");
    // 1 day 0 hours 0 mins
    expect(formatDuration(86400)).toBe("1d 0h 0m");
  });

  it("trendlineStats returns duration instead of angle", () => {
    const mockCtx: any = {
      intervalSec: 3600,
      series: {
        priceFormatter: () => ({
          format: (p: number) => p.toFixed(2),
        }),
      },
    };

    const drawing: any = {
      id: "measure",
      type: "trendline",
      price: 100,
      price2: 110,
      time: 1700000000,
      time2: 1700000000 + (2 * 86400 + 3 * 3600), // 2 days 3 hours
    };

    const stats = trendlineStats(drawing, mockCtx);
    expect(stats).toHaveLength(3);
    expect(stats[0]).toBe("+10.00 (+10.00%)");
    expect(stats[1]).toBe("51 bars");
    expect(stats[2]).toBe("2d 3h 0m");
  });
});

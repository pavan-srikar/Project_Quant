import { describe, expect, it, vi } from "vitest";
import { DrawingToolsManager } from "../lib/chart-plugins/drawing-tools/manager.ts";
import { renderLivePositionTracker } from "../lib/chart-plugins/drawing-tools/renderers/position-tracker-renderer.ts";
import { renderPositionBadges } from "../lib/chart-plugins/drawing-tools/renderers/position-renderer.ts";
import type { DrawingLine } from "../pages/trading/constants.ts";

describe("DrawingToolsManager Placement", () => {
  function setup() {
    const container = document.createElement("div");
    container.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    const mockChart: any = {
      timeScale: () => ({
        width: () => 740,
        height: () => 26,
        coordinateToTime: (x: number) => 1700000000 + Math.floor(x) * 60,
        timeToCoordinate: (t: number) => (t - 1700000000) / 60,
        coordinateToLogical: (x: number) => Math.floor(x / 10),
        logicalToCoordinate: (l: number) => l * 10,
      }),
    };

    const candles = Array.from({ length: 100 }, (_, i) => ({
      time: 1700000000 + i * 60,
      open: 100,
      high: 110,
      low: 90,
      close: 105,
    }));

    const mockSeries: any = {
      priceToCoordinate: (p: number) => 500 - p,
      coordinateToPrice: (y: number) => 500 - y,
      data: () => candles,
      attachPrimitive: vi.fn(),
      detachPrimitive: vi.fn(),
      priceFormatter: () => ({ format: (p: number) => p.toFixed(2) }),
      subscribeDataChanged: vi.fn(),
      unsubscribeDataChanged: vi.fn(),
    };

    const onAdd = vi.fn();
    const onUpdate = vi.fn();
    const onRemove = vi.fn();
    const onToolFinished = vi.fn();

    const manager = new DrawingToolsManager({
      chart: mockChart,
      series: mockSeries,
      container,
      intervalSec: 60,
      timeframe: "1m",
      callbacks: {
        onAdd,
        onUpdate,
        onRemove,
        onToolFinished,
      },
    });

    return { manager, container, mockChart, onAdd, onToolFinished };
  }

  it("can place a horizontal line on click", () => {
    const { manager, container, onAdd, onToolFinished } = setup();

    manager.setTool("horizontal");

    const event = new MouseEvent("mousedown", {
      clientX: 200,
      clientY: 200,
      button: 0,
      bubbles: true,
      cancelable: true,
    });
    container.dispatchEvent(event);

    expect(onAdd).toHaveBeenCalledTimes(1);
    const drawing = onAdd.mock.calls[0]?.[0] as DrawingLine;
    expect(drawing.type).toBe("horizontal");
    expect(drawing.price).toBe(300);
    expect(onToolFinished).toHaveBeenCalledTimes(1);
  });

  it("can place a trendline via click-move-click", () => {
    const { manager, container, onAdd, onToolFinished } = setup();

    manager.setTool("trendline");

    // Click 1: p1
    container.dispatchEvent(
      new MouseEvent("mousedown", {
        clientX: 100,
        clientY: 200,
        button: 0,
        bubbles: true,
        cancelable: true,
      }),
    );
    window.dispatchEvent(
      new MouseEvent("mouseup", {
        clientX: 100,
        clientY: 200,
        button: 0,
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(onAdd).not.toHaveBeenCalled();

    // Move
    window.dispatchEvent(
      new MouseEvent("mousemove", {
        clientX: 300,
        clientY: 250,
        bubbles: true,
        cancelable: true,
      }),
    );

    // Click 2: p2
    container.dispatchEvent(
      new MouseEvent("mousedown", {
        clientX: 300,
        clientY: 250,
        button: 0,
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(onAdd).toHaveBeenCalledTimes(1);
    const drawing = onAdd.mock.calls[0]?.[0] as DrawingLine;
    expect(drawing.type).toBe("trendline");
    expect(drawing.price).toBe(300);
    expect(drawing.price2).toBe(250);
    expect(onToolFinished).toHaveBeenCalledTimes(1);
  });

  it("can place drawings even when timeScale width is 0 (hidden timescale)", () => {
    const { manager, container, mockChart, onAdd, onToolFinished } = setup();

    // Simulate timeScale hidden (hideTimeScale=true when bottom indicator panel is open)
    mockChart.timeScale = () => ({
      width: () => 0,
      height: () => 0,
      coordinateToTime: (x: number) => 1700000000 + Math.floor(x) * 60,
      timeToCoordinate: (t: number) => (t - 1700000000) / 60,
      coordinateToLogical: (x: number) => Math.floor(x / 10),
      logicalToCoordinate: (l: number) => l * 10,
    });

    manager.setTool("horizontal");

    const event = new MouseEvent("mousedown", {
      clientX: 200,
      clientY: 200,
      button: 0,
      bubbles: true,
      cancelable: true,
    });
    container.dispatchEvent(event);

    expect(onAdd).toHaveBeenCalledTimes(1);
    const drawing = onAdd.mock.calls[0]?.[0] as DrawingLine;
    expect(drawing.type).toBe("horizontal");
    expect(onToolFinished).toHaveBeenCalledTimes(1);
  });

  it("resolves time using logical index when coordinateToTime returns null", () => {
    const { manager, container, mockChart, onAdd } = setup();

    // Simulate coordinateToTime returning null for in-data clicks (e.g. fractional coordinates)
    mockChart.timeScale = () => ({
      width: () => 740,
      height: () => 26,
      coordinateToTime: () => null,
      timeToCoordinate: (t: number) => (t - 1700000000) / 60,
      coordinateToLogical: (x: number) => Math.floor(x / 10),
      logicalToCoordinate: (l: number) => l * 10,
    });

    manager.setTool("vertical");

    container.dispatchEvent(
      new MouseEvent("mousedown", {
        clientX: 200,
        clientY: 200,
        button: 0,
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(onAdd).toHaveBeenCalledTimes(1);
    const drawing = onAdd.mock.calls[0]?.[0] as DrawingLine;
    expect(drawing.type).toBe("vertical");
    // Logical index 20 (200 / 10) maps to candle index 20 -> 1700000000 + 20 * 60
    expect(drawing.time).toBe(1700001200);
  });

  it("does not render trailing tracker badge, and renders closed info in center badge", () => {
    const fillTextSpy = vi.fn();
    const mockScope: any = {
      context: {
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        setLineDash: vi.fn(),
        measureText: () => ({ width: 80 }),
        fillText: fillTextSpy,
        roundRect: vi.fn(),
      },
      horizontalPixelRatio: 1,
      verticalPixelRatio: 1,
      bitmapSize: { width: 800, height: 600 },
    };

    const entry: any = {
      d: { id: "p1", type: "position", price: 100, stopPrice: 90, targetPrice: 120, side: "long" },
      hasTriggered: true,
      currentPrice: 110,
      xCurrent: 200,
      yCurrent: 200,
      trackingStatus: "CLOSED",
      isHovered: true,
      state: "selected",
    };

    const info: any = {
      priceFormat: (p: number) => p.toFixed(2),
    };

    // 1. Tracker itself does NOT render any text badges
    renderLivePositionTracker(mockScope, entry, info, 100, 300, 250);
    expect(fillTextSpy).toHaveBeenCalledTimes(0);

    // 2. Center badge renders "Closed: 110.00 [+10.00%]"
    renderPositionBadges(mockScope, entry, info, 100, 300, 250, 150, 350);
    const closedTexts = fillTextSpy.mock.calls.filter((call) =>
      typeof call[0] === "string" && call[0].includes("Closed:"),
    );
    expect(closedTexts.length).toBe(1);
    expect(closedTexts[0]?.[0]).toContain("Closed: 110.00 [+10.00%]");
  });
});

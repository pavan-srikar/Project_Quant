import { describe, expect, it, vi } from "vitest";
import { renderPositionHandles } from "../lib/chart-plugins/drawing-tools/renderers/position-renderer.ts";
import { hitPosition } from "../lib/chart-plugins/drawing-tools/hit-test/complex-hits.ts";
import { dragPoint, type DragState } from "../lib/chart-plugins/drawing-tools/drag-controller.ts";
import type { DrawingLine } from "../pages/trading/constants.ts";
import type { ResolvedEntry } from "../lib/chart-plugins/drawing-tools/types.ts";

describe("Position Tool 4-Handle TradingView Alignment", () => {
  it("renders only 4 handles: left target, left stop, left entry, and right width", () => {
    const arcSpy = vi.fn();
    const mockScope: any = {
      context: {
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        arc: arcSpy,
        fill: vi.fn(),
        stroke: vi.fn(),
      },
      horizontalPixelRatio: 1,
      verticalPixelRatio: 1,
      bitmapSize: { width: 800, height: 600 },
    };

    const entry: ResolvedEntry = {
      d: { id: "p1", type: "position", side: "long", price: 100, stopPrice: 90, targetPrice: 120 } as DrawingLine,
      x1: 100,
      y1: 300,
      x2: 300,
      y2: null,
      yTarget: 200,
      yStop: 400,
      state: "selected",
    };

    renderPositionHandles(mockScope, entry, 100, 300, 300);

    // Exactly 4 handles rendered: (100, 200), (100, 400), (100, 300), (300, 300)
    expect(arcSpy).toHaveBeenCalledTimes(4);
    const renderedCoords = arcSpy.mock.calls.map((c) => ({ x: c[0], y: c[1] }));
    expect(renderedCoords).toEqual([
      { x: 100, y: 200 }, // target
      { x: 100, y: 400 }, // stop
      { x: 100, y: 300 }, // entry
      { x: 300, y: 300 }, // right width
    ]);
  });

  it("hitPosition returns 2D hit (time & price) on the first entry handle", () => {
    const entry: ResolvedEntry = {
      d: { id: "pos-1", type: "position", side: "long", price: 100, stopPrice: 90, targetPrice: 120 } as DrawingLine,
      x1: 100,
      y1: 300,
      x2: 300,
      y2: null,
      yTarget: 200,
      yStop: 400,
      state: "selected",
    };
    const tol = { handle: 8, line: 4 };

    // 1. Left middle handle (xa, y1) -> both time and price
    const hitEntry = hitPosition(entry, { x: 100, y: 300 }, tol);
    expect(hitEntry).not.toBeNull();
    expect(hitEntry?.region).toEqual({ kind: "point", timeKey: "time", priceKey: "price" });

    // 2. Left target handle (xa, yTarget) -> price only (targetPrice)
    const hitTarget = hitPosition(entry, { x: 100, y: 200 }, tol);
    expect(hitTarget?.region).toEqual({ kind: "point", timeKey: null, priceKey: "targetPrice" });

    // 3. Left stop handle (xa, yStop) -> price only (stopPrice)
    const hitStop = hitPosition(entry, { x: 100, y: 400 }, tol);
    expect(hitStop?.region).toEqual({ kind: "point", timeKey: null, priceKey: "stopPrice" });

    // 4. Right width handle (xb, y1) -> time2 only
    const hitWidth = hitPosition(entry, { x: 300, y: 300 }, tol);
    expect(hitWidth?.region).toEqual({ kind: "point", timeKey: "time2", priceKey: null });

    // 5. Old center handle (xm, y1) -> no longer an anchor handle hit (handled as body hit)
    const hitOldCenter = hitPosition(entry, { x: 200, y: 300 }, tol);
    expect(hitOldCenter?.region.kind).toBe("body");
  });

  it("dragPoint moves entry price and date axis, adjusting risk/reward while safely clamped", () => {
    const origin: DrawingLine = {
      id: "pos-1",
      type: "position",
      side: "long",
      price: 100,
      stopPrice: 90,
      targetPrice: 120,
      time: 1000,
      time2: 2000,
      color: "#3179f5",
    };

    const dragState: DragState = {
      hit: { id: "pos-1", region: { kind: "point", timeKey: "time", priceKey: "price" } },
      startX: 100,
      startY: 300,
      origin,
      originEntry: {} as any,
      group: [],
      moved: true,
      isTouch: false,
    };

    // Drag entry handle to new time (date axis) and new price (increasing risk, decreasing reward)
    const updated = dragPoint(dragState, { time: 1050, price: 110 });
    expect(updated).not.toBeNull();
    expect(updated?.time).toBe(1050);
    expect(updated?.price).toBe(110);
    expect(updated?.stopPrice).toBe(90);
    expect(updated?.targetPrice).toBe(120);

    // Clamping: entry cannot cross targetPrice (120)
    const clampedHigh = dragPoint(dragState, { time: 1050, price: 130 });
    expect(clampedHigh?.price).toBeLessThan(120);

    // Clamping: entry cannot cross stopPrice (90)
    const clampedLow = dragPoint(dragState, { time: 1050, price: 80 });
    expect(clampedLow?.price).toBeGreaterThan(90);
  });

  it("selects only when clicked inside the box, not on external target/stop tags", () => {
    const entry: ResolvedEntry = {
      d: { id: "pos-1", type: "position", side: "long", price: 100, stopPrice: 90, targetPrice: 120 } as DrawingLine,
      x1: 100,
      y1: 300,
      x2: 300,
      y2: null,
      yTarget: 200,
      yStop: 400,
      state: "normal",
    };
    const tol = { handle: 8, line: 4 };

    // Inside the box -> body hit
    const insideHit = hitPosition(entry, { x: 200, y: 250 }, tol);
    expect(insideHit).not.toBeNull();
    expect(insideHit?.region.kind).toBe("body");

    // Outside above the box (where Target tag floats at y=170) -> NOT hit
    const aboveTagHit = hitPosition(entry, { x: 200, y: 170 }, tol);
    expect(aboveTagHit).toBeNull();

    // Outside below the box (where Stop tag floats at y=430) -> NOT hit
    const belowTagHit = hitPosition(entry, { x: 200, y: 430 }, tol);
    expect(belowTagHit).toBeNull();

    // Outside to the right of the box -> NOT hit
    const rightHit = hitPosition(entry, { x: 350, y: 250 }, tol);
    expect(rightHit).toBeNull();
  });
});

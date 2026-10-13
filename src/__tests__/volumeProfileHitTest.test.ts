import { describe, expect, it } from "vitest";
import { hitTest } from "../lib/chart-plugins/drawing-tools/hit-test.ts";
import type { ResolvedEntry, ResolvedVolumeProfile } from "../lib/chart-plugins/drawing-tools/types.ts";

describe("Fixed Range Volume Profile Hit Testing", () => {
  const createMockVolumeProfileEntry = (overrides?: Partial<ResolvedEntry>): ResolvedEntry => {
    // A profile from x: 100 to x: 500 (rangeWidth = 400, maxBarWidth = 400 * 0.82 = 328)
    // Vertical span from y: 100 to y: 300
    const vp: ResolvedVolumeProfile = {
      xStart: 100,
      xEnd: 500,
      maxVol: 1000,
      pocPrice: 150,
      pocY: 200,
      vahPrice: 175,
      vahY: 150,
      valPrice: 125,
      valY: 250,
      totalVol: 3000,
      upColor: "#5b84c4",
      downColor: "#7e60a8",
      pocColor: "#ea3943",
      buckets: [
        // Top bucket (y: 100..150): small volume bar (totalVol = 200 -> bar width ~ 66px)
        {
          priceLow: 175,
          priceHigh: 200,
          priceCenter: 187.5,
          yTop: 100,
          yBottom: 150,
          upVol: 100,
          downVol: 100,
          totalVol: 200,
          isPoc: false,
          isValueArea: false,
        },
        // Middle bucket (y: 150..250): POC bucket (totalVol = 1000 -> bar width ~ 328px)
        {
          priceLow: 125,
          priceHigh: 175,
          priceCenter: 150,
          yTop: 150,
          yBottom: 250,
          upVol: 600,
          downVol: 400,
          totalVol: 1000,
          isPoc: true,
          isValueArea: true,
        },
        // Bottom bucket (y: 250..300): small volume bar (totalVol = 300 -> bar width ~ 98px)
        {
          priceLow: 100,
          priceHigh: 125,
          priceCenter: 112.5,
          yTop: 250,
          yBottom: 300,
          upVol: 150,
          downVol: 150,
          totalVol: 300,
          isPoc: false,
          isValueArea: false,
        },
      ],
    };

    return {
      d: {
        id: "vp-1",
        type: "fixed-range-volume-profile",
        time: 1000,
        price: 200,
        time2: 2000,
        price2: 100,
        color: "#2962FF",
      },
      x1: 100,
      y1: 100,
      x2: 500,
      y2: 300,
      state: "normal",
      volumeProfile: vp,
      ...overrides,
    };
  };

  it("hits when clicking directly on a histogram bar", () => {
    const entry = createMockVolumeProfileEntry();
    // In top bucket (y: 100..150), bar width is ~66px (from x=100 to x=166).
    // Clicking at x=130, y=120 is right on the bar.
    const hit = hitTest([entry], { x: 130, y: 120 });
    expect(hit).not.toBeNull();
    expect(hit?.id).toBe("vp-1");
    expect(hit?.region.kind).toBe("body");
  });

  it("does NOT hit when clicking in empty space inside the bounding box", () => {
    const entry = createMockVolumeProfileEntry();
    // In top bucket (y: 100..150), bar only reaches x=166.
    // Clicking at x=350, y=120 is inside the rectangle bounding box ([100..500] x [100..300])
    // but in empty space where NO bar or line exists.
    const hit = hitTest([entry], { x: 350, y: 120 });
    expect(hit).toBeNull();
  });

  it("hits when clicking on the POC line even in the right half of the range", () => {
    const entry = createMockVolumeProfileEntry();
    // POC is at y=200, spanning x=100 to x=500.
    const hit = hitTest([entry], { x: 420, y: 200 });
    expect(hit).not.toBeNull();
    expect(hit?.id).toBe("vp-1");
    expect(hit?.region.kind).toBe("body");
  });

  it("hits when clicking on VAH or VAL lines", () => {
    const entry = createMockVolumeProfileEntry();
    // VAH line is at y=150
    const hitVAH = hitTest([entry], { x: 400, y: 150 });
    expect(hitVAH).not.toBeNull();
    expect(hitVAH?.id).toBe("vp-1");

    // VAL line is at y=250
    const hitVAL = hitTest([entry], { x: 400, y: 250 });
    expect(hitVAL).not.toBeNull();
    expect(hitVAL?.id).toBe("vp-1");
  });

  it("hits when clicking on the left or right boundary lines", () => {
    const entry = createMockVolumeProfileEntry();
    // Left boundary is at x=100
    const hitLeft = hitTest([entry], { x: 100, y: 180 });
    expect(hitLeft).not.toBeNull();
    expect(hitLeft?.id).toBe("vp-1");

    // Right boundary is at x=500
    const hitRight = hitTest([entry], { x: 500, y: 180 });
    expect(hitRight).not.toBeNull();
    expect(hitRight?.id).toBe("vp-1");
  });

  it("hits anchor handle when clicking on anchor point", () => {
    const entry = createMockVolumeProfileEntry();
    // Anchor 1 is at (100, 100)
    const hit = hitTest([entry], { x: 100, y: 100 });
    expect(hit).not.toBeNull();
    expect(hit?.id).toBe("vp-1");
    expect(hit?.region.kind).toBe("point");
  });
});

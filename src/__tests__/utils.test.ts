import { describe, it, expect } from "vitest";
import {
  cn,
  formatCurrency,
  formatNumber,
  pnlClass,
  getBaseAsset,
  getErrorMessage,
  getPriceDecimals,
  hexToRgba,
} from "@/lib/utils";

describe("cn (class name merge)", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles undefined and null", () => {
    expect(cn("foo", undefined, null, "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    const hide = false;
    const show = true;
    expect(cn("base", hide && "hidden", show && "visible")).toBe("base visible");
  });

  it("resolves Tailwind conflicts (last wins)", () => {
    const result = cn("p-4", "p-6");
    expect(result).toBe("p-6");
  });

  it("handles empty input", () => {
    expect(cn()).toBe("");
  });
});

describe("formatCurrency", () => {
  it("formats positive numbers", () => {
    expect(formatCurrency(1234.56)).toBe("$1,234.56");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("formats negative numbers", () => {
    expect(formatCurrency(-500)).toBe("-$500.00");
  });

  it("respects custom decimals", () => {
    expect(formatCurrency(100, 0)).toBe("$100");
  });

  it("formats large numbers with commas", () => {
    expect(formatCurrency(1000000)).toBe("$1,000,000.00");
  });
});

describe("formatNumber", () => {
  it("formats with default 2 decimals", () => {
    expect(formatNumber(1234.5)).toBe("1,234.50");
  });

  it("formats zero", () => {
    expect(formatNumber(0)).toBe("0.00");
  });

  it("respects custom decimals", () => {
    expect(formatNumber(3.14159, 4)).toBe("3.1416");
  });
});

describe("pnlClass", () => {
  it("returns success for positive values", () => {
    expect(pnlClass(100)).toBe("text-success");
  });

  it("returns destructive for negative values", () => {
    expect(pnlClass(-50)).toBe("text-destructive");
  });

  it("returns muted for zero", () => {
    expect(pnlClass(0)).toBe("text-muted-foreground");
  });
});

describe("getBaseAsset", () => {
  it("removes USD and USDT suffixes", () => {
    expect(getBaseAsset("BTCUSD")).toBe("BTC");
    expect(getBaseAsset("BTCUSDT")).toBe("BTC");
    expect(getBaseAsset("ETHUSD")).toBe("ETH");
    expect(getBaseAsset("SOLUSDT")).toBe("SOL");
    expect(getBaseAsset("EURUSD")).toBe("EUR");
  });
});

describe("getErrorMessage", () => {
  it("handles string errors", () => {
    expect(getErrorMessage("Direct error")).toBe("Direct error");
  });

  it("handles nested action error objects", () => {
    expect(getErrorMessage({ error: { message: "Action failed" } })).toBe("Action failed");
  });

  it("handles standard Error instances or objects with message", () => {
    expect(getErrorMessage(new Error("Standard error"))).toBe("Standard error");
    expect(getErrorMessage({ message: "Simple message" })).toBe("Simple message");
  });

  it("handles null/undefined with fallback", () => {
    expect(getErrorMessage(null)).toBe("Request failed");
    expect(getErrorMessage(undefined)).toBe("Request failed");
  });
});

describe("getPriceDecimals", () => {
  it("returns 8 if tickSize < 0.0001", () => {
    expect(getPriceDecimals(1.23, 0.00001)).toBe(8);
  });

  it("returns 6 if price < 0.1", () => {
    expect(getPriceDecimals(0.05)).toBe(6);
  });

  it("returns 4 if price < 10", () => {
    expect(getPriceDecimals(5.5)).toBe(4);
  });

  it("returns 2 for larger prices", () => {
    expect(getPriceDecimals(50000)).toBe(2);
  });
});

describe("hexToRgba", () => {
  it("converts hex to rgba", () => {
    expect(hexToRgba("#ff0000", 0.5)).toBe("rgba(255, 0, 0, 0.5)");
    expect(hexToRgba("#00ff00", 1)).toBe("rgba(0, 255, 0, 1)");
    expect(hexToRgba("0000ff", 0.2)).toBe("rgba(0, 0, 255, 0.2)");
  });
});

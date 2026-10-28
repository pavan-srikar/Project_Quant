import { describe, expect, it } from "vitest";
import {
  parseColor,
  formatColor,
  applyAlphaToColor,
  applyHexToColor,
  rgbToHsv,
  hsvToRgb,
} from "../lib/colorUtils.ts";

describe("colorUtils", () => {
  it("parses 6-digit hex colors", () => {
    const res = parseColor("#2962ff");
    expect(res.r).toBe(41);
    expect(res.g).toBe(98);
    expect(res.b).toBe(255);
    expect(res.a).toBe(1);
    expect(res.hex).toBe("#2962ff");
  });

  it("parses 8-digit hex colors with alpha", () => {
    const res = parseColor("#2962ff80");
    expect(res.r).toBe(41);
    expect(res.g).toBe(98);
    expect(res.b).toBe(255);
    expect(res.a).toBeCloseTo(0.5, 1);
    expect(res.hex).toBe("#2962ff");
  });

  it("parses 3-digit hex colors", () => {
    const res = parseColor("#f00");
    expect(res.r).toBe(255);
    expect(res.g).toBe(0);
    expect(res.b).toBe(0);
    expect(res.a).toBe(1);
    expect(res.hex).toBe("#ff0000");
  });

  it("parses rgba colors", () => {
    const res = parseColor("rgba(41, 98, 255, 0.65)");
    expect(res.r).toBe(41);
    expect(res.g).toBe(98);
    expect(res.b).toBe(255);
    expect(res.a).toBe(0.65);
    expect(res.hex).toBe("#2962ff");
  });

  it("formats full opacity color as 6-digit hex", () => {
    expect(formatColor(41, 98, 255, 1)).toBe("#2962ff");
  });

  it("formats semi-transparent color as rgba string", () => {
    expect(formatColor(41, 98, 255, 0.5)).toBe("rgba(41, 98, 255, 0.5)");
  });

  it("applies alpha while preserving rgb", () => {
    const res = applyAlphaToColor("#2962ff", 0.75);
    expect(res).toBe("rgba(41, 98, 255, 0.75)");
  });

  it("applies new hex while preserving alpha", () => {
    const res = applyHexToColor("rgba(41, 98, 255, 0.4)", "#ff0000");
    expect(res).toBe("rgba(255, 0, 0, 0.4)");
  });

  it("converts RGB to HSV and back accurately", () => {
    const hsv = rgbToHsv(255, 0, 0);
    expect(hsv.h).toBe(0);
    expect(hsv.s).toBe(1);
    expect(hsv.v).toBe(1);

    const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
    expect(rgb.r).toBe(255);
    expect(rgb.g).toBe(0);
    expect(rgb.b).toBe(0);
  });
});

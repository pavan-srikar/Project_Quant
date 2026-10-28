/**
 * Color manipulation utilities supporting Hex, RGB, and RGBA with Alpha/Opacity.
 */

export interface ParsedColor {
  r: number;
  g: number;
  b: number;
  a: number; // 0 to 1
  hex: string; // 6-digit #rrggbb
}

export function parseColor(colorStr: string): ParsedColor {
  if (!colorStr || typeof colorStr !== "string") {
    return { r: 41, g: 98, b: 255, a: 1, hex: "#2962ff" };
  }

  const trimmed = colorStr.trim().toLowerCase();

  // 1. RGBA or RGB string
  const rgbaMatch = trimmed.match(
    /^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+)\s*)?\)$/,
  );
  if (rgbaMatch && rgbaMatch[1] && rgbaMatch[2] && rgbaMatch[3]) {
    const r = Math.min(255, Math.max(0, parseInt(rgbaMatch[1], 10)));
    const g = Math.min(255, Math.max(0, parseInt(rgbaMatch[2], 10)));
    const b = Math.min(255, Math.max(0, parseInt(rgbaMatch[3], 10)));
    const a = rgbaMatch[4] !== undefined ? Math.min(1, Math.max(0, parseFloat(rgbaMatch[4]))) : 1;
    const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    return { r, g, b, a: Number(a.toFixed(2)), hex };
  }

  // 2. Hex string (#rgb, #rrggbb, #rrggbbaa)
  if (trimmed.startsWith("#")) {
    const clean = trimmed.replace("#", "");
    if (clean.length === 3) {
      const r = parseInt(clean[0]! + clean[0]!, 16) || 0;
      const g = parseInt(clean[1]! + clean[1]!, 16) || 0;
      const b = parseInt(clean[2]! + clean[2]!, 16) || 0;
      const hex = `#${clean[0]}${clean[0]}${clean[1]}${clean[1]}${clean[2]}${clean[2]}`;
      return { r, g, b, a: 1, hex };
    }
    if (clean.length === 6) {
      const r = parseInt(clean.substring(0, 2), 16) || 0;
      const g = parseInt(clean.substring(2, 4), 16) || 0;
      const b = parseInt(clean.substring(4, 6), 16) || 0;
      return { r, g, b, a: 1, hex: `#${clean}` };
    }
    if (clean.length === 8) {
      const r = parseInt(clean.substring(0, 2), 16) || 0;
      const g = parseInt(clean.substring(2, 4), 16) || 0;
      const b = parseInt(clean.substring(4, 6), 16) || 0;
      const a = Math.min(1, Math.max(0, parseInt(clean.substring(6, 8), 16) / 255));
      const hex = `#${clean.substring(0, 6)}`;
      return { r, g, b, a: Number(a.toFixed(2)), hex };
    }
  }

  return { r: 41, g: 98, b: 255, a: 1, hex: "#2962ff" };
}

export function formatColor(r: number, g: number, b: number, a: number): string {
  const clampedA = Math.min(1, Math.max(0, a));
  if (clampedA >= 0.999) {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }
  return `rgba(${r}, ${g}, ${b}, ${Number(clampedA.toFixed(2))})`;
}

export function applyAlphaToColor(colorStr: string, newAlpha: number): string {
  const { r, g, b } = parseColor(colorStr);
  return formatColor(r, g, b, newAlpha);
}

export function applyHexToColor(colorStr: string, newHex: string): string {
  const { a } = parseColor(colorStr);
  const { r, g, b } = parseColor(newHex);
  return formatColor(r, g, b, a);
}

export interface HSV {
  h: number; // 0 to 360
  s: number; // 0 to 1
  v: number; // 0 to 1
}

export function rgbToHsv(r: number, g: number, b: number): HSV {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      case bn:
        h = (rn - gn) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s, v };
}

export function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  h = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

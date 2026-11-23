import type { CandleData } from "../indicators/types";
import type { PineBox, PineLine } from "./types";

export interface LiquiditySweepsParams {
  len?: number;
  opt?: string;
  colBl?: string;
  colBr?: string;
  colBl2?: string;
  colBr2?: string;
  colBl3?: string;
  colBr3?: string;
  extend?: boolean;
  maxB?: number;
}

interface Piv {
  prc: number;
  bix: number;
  brk: boolean;
  mit: boolean;
  tak: boolean;
  wic: boolean;
}

interface BoxBr {
  boxId: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
  bgColor: string;
  dr: number;
  br: boolean;
}

function checkPivot(candles: CandleData[], n: number, len: number, isHigh: boolean): number | null {
  if (n < len * 2) return null;
  const pIdx = n - len;
  const pVal = isHigh ? candles[pIdx]!.high : candles[pIdx]!.low;
  for (let j = 1; j <= len; j++) {
    const v = isHigh ? candles[pIdx - j]!.high : candles[pIdx - j]!.low;
    if (isHigh ? v >= pVal : v <= pVal) return null;
  }
  for (let j = 1; j <= len; j++) {
    const v = isHigh ? candles[pIdx + j]!.high : candles[pIdx + j]!.low;
    if (isHigh ? v > pVal : v < pVal) return null;
  }
  return pVal;
}

export function computeLiquiditySweeps(
  candles: CandleData[],
  params: LiquiditySweepsParams = {},
): { boxes: PineBox[]; lines: PineLine[] } {
  const nBars = candles.length;
  if (nBars < 5) return { boxes: [], lines: [] };

  const len = Math.max(1, Math.round(params.len ?? 5));
  const opt = params.opt || "Only Wicks";
  const colBl = params.colBl || "#089981";
  const colBr = params.colBr || "#f23645";
  const colBl2 = params.colBl2 || "rgba(8, 153, 129, 0.5)";
  const colBr2 = params.colBr2 || "rgba(242, 54, 69, 0.5)";
  const colBl3 = params.colBl3 || "rgba(8, 153, 129, 0.08)";
  const colBr3 = params.colBr3 || "rgba(242, 54, 69, 0.08)";
  const extend = params.extend !== false;
  const maxB = Math.min(300, Math.max(1, params.maxB ?? 300));

  const oW = opt === "Only Wicks";
  const oO = opt === "Only Outbreaks & Retest";

  const aPivH: Piv[] = [];
  const aPivL: Piv[] = [];
  const aBoxBr: BoxBr[] = [];
  const lines: PineLine[] = [];

  for (let n = 0; n < nBars; n++) {
    const c = candles[n]!;
    const { high, low, close } = c;

    // Pivot detection
    const pH = checkPivot(candles, n, len, true);
    if (pH !== null) aPivH.unshift({ prc: pH, bix: n - len, brk: false, mit: false, tak: false, wic: false });
    const pL = checkPivot(candles, n, len, false);
    if (pL !== null) aPivL.unshift({ prc: pL, bix: n - len, brk: false, mit: false, tak: false, wic: false });

    // Process Pivot Highs
    for (let i = aPivH.length - 1; i >= 0; i--) {
      const g = aPivH[i]!;
      if (!g.mit) {
        if (!g.brk) {
          if (close > g.prc) {
            if (!oW) g.brk = true;
            else g.mit = true;
          }
          if (!oO && !g.wic && high > g.prc && close < g.prc) {
            aBoxBr.unshift({ boxId: `b_${aBoxBr.length}`, left: n - 1, top: high, right: n + 1, bottom: g.prc, bgColor: colBr3, dr: 1, br: false });
            lines.push({ id: `l_${lines.length}`, x1: n, y1: high, x2: n, y2: g.prc, color: colBr, width: 3, style: "solid" });
            lines.push({ id: `l_${lines.length}`, x1: g.bix, y1: g.prc, x2: n, y2: g.prc, color: colBr2, width: 1.5, style: "dotted" });
            lines.push({ id: `l_${lines.length}`, x1: n, y1: low, x2: n + 3, y2: low, color: colBr, width: 1.5, style: "dotted" });
            g.wic = true;
          }
        } else {
          if (close < g.prc) g.mit = true;
          if (!oW && low < g.prc && close > g.prc) {
            aBoxBr.unshift({ boxId: `b_${aBoxBr.length}`, left: n - 1, top: g.prc, right: n + 1, bottom: low, bgColor: colBl3, dr: -1, br: false });
            lines.push({ id: `l_${lines.length}`, x1: n, y1: g.prc, x2: n, y2: low, color: colBl, width: 3, style: "solid" });
            lines.push({ id: `l_${lines.length}`, x1: g.bix, y1: g.prc, x2: n, y2: g.prc, color: colBl2, width: 1.5, style: "dashed" });
            lines.push({ id: `l_${lines.length}`, x1: n, y1: high, x2: n + 3, y2: high, color: colBl, width: 1.5, style: "dotted" });
            g.tak = true;
          }
        }
      }
      if (n - g.bix > 2000 || g.mit || g.tak) aPivH.splice(i, 1);
    }

    // Process Pivot Lows
    for (let i = aPivL.length - 1; i >= 0; i--) {
      const g = aPivL[i]!;
      if (!g.mit) {
        if (!g.brk) {
          if (close < g.prc) {
            if (!oW) g.brk = true;
            else g.mit = true;
          }
          if (!oO && !g.wic && low < g.prc && close > g.prc) {
            aBoxBr.unshift({ boxId: `b_${aBoxBr.length}`, left: n - 1, top: g.prc, right: n + 1, bottom: low, bgColor: colBl3, dr: -1, br: false });
            lines.push({ id: `l_${lines.length}`, x1: n, y1: g.prc, x2: n, y2: low, color: colBl, width: 3, style: "solid" });
            lines.push({ id: `l_${lines.length}`, x1: g.bix, y1: g.prc, x2: n, y2: g.prc, color: colBl2, width: 1.5, style: "dotted" });
            lines.push({ id: `l_${lines.length}`, x1: n, y1: high, x2: n + 3, y2: high, color: colBl, width: 1.5, style: "dotted" });
            g.wic = true;
          }
        } else {
          if (close > g.prc) g.mit = true;
          if (!oW && high > g.prc && close < g.prc) {
            aBoxBr.unshift({ boxId: `b_${aBoxBr.length}`, left: n - 1, top: high, right: n + 1, bottom: g.prc, bgColor: colBr3, dr: 1, br: false });
            lines.push({ id: `l_${lines.length}`, x1: n, y1: high, x2: n, y2: g.prc, color: colBr, width: 3, style: "solid" });
            lines.push({ id: `l_${lines.length}`, x1: g.bix, y1: g.prc, x2: n, y2: g.prc, color: colBr2, width: 1.5, style: "dashed" });
            lines.push({ id: `l_${lines.length}`, x1: n, y1: low, x2: n + 3, y2: low, color: colBr, width: 1.5, style: "dotted" });
            g.tak = true;
          }
        }
      }
      if (n - g.bix > 2000 || g.mit || g.tak) aPivL.splice(i, 1);
    }

    // Extend active boxes
    if (extend) {
      for (const bx of aBoxBr) {
        if (!bx.br && n - bx.left - 1 <= maxB) {
          bx.right = n;
          if (bx.dr === -1 && close < bx.bottom) bx.br = true;
          if (bx.dr === 1 && close > bx.top) bx.br = true;
        }
      }
    }
  }

  const boxes: PineBox[] = aBoxBr.map((b) => ({
    id: b.boxId,
    left: b.left,
    top: b.top,
    right: b.right,
    bottom: b.bottom,
    bgColor: b.bgColor,
  }));

  return { boxes, lines };
}

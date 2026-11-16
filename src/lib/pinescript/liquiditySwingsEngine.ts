import type { CandleData } from "../indicators/types";
import type { PineBox, PineLine, PineLabel } from "./types";

export interface LiquiditySwingsParams {
  length?: number;
  area?: string;
  filterOptions?: string;
  filterValue?: number;
  showTop?: boolean;
  topCss?: string;
  topAreaCss?: string;
  showBtm?: boolean;
  btmCss?: string;
  btmAreaCss?: string;
  labelSize?: string;
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

function formatVolume(vol: number, count?: number): string {
  if (vol >= 1_000_000_000) return (vol / 1_000_000_000).toFixed(3).replace(/\.?0+$/, "") + "B";
  if (vol >= 1_000_000) return (vol / 1_000_000).toFixed(3).replace(/\.?0+$/, "") + "M";
  if (vol >= 1_000) return (vol / 1_000).toFixed(3).replace(/\.?0+$/, "") + "K";
  if (vol >= 1) return vol.toFixed(0);
  if (vol > 0) return vol.toFixed(2);
  return count && count > 0 ? `${count}` : "";
}

export function computeLiquiditySwings(
  candles: CandleData[],
  params: LiquiditySwingsParams = {},
): { boxes: PineBox[]; lines: PineLine[]; labels: PineLabel[] } {
  const nBars = candles.length;
  if (nBars < 5) return { boxes: [], lines: [], labels: [] };

  const length = Math.max(1, Math.round(params.length ?? 14));
  const area = params.area || "Wick Extremity";
  const filterOptions = params.filterOptions || "Count";
  const filterValue = params.filterValue ?? 0;
  const showTop = params.showTop !== false;
  const topCss = params.topCss && params.topCss !== "#f23645" && params.topCss !== "color.red"
    ? params.topCss
    : "#7c4dff";
  const topAreaCss = params.topAreaCss && !params.topAreaCss.includes("242")
    ? params.topAreaCss
    : "rgba(124, 77, 255, 0.25)";
  const showBtm = params.showBtm !== false;
  const btmCss = params.btmCss && params.btmCss !== "#089981" && params.btmCss !== "#00897b"
    ? params.btmCss
    : "#00b4d8";
  const btmAreaCss = params.btmAreaCss && !params.btmAreaCss.includes("137")
    ? params.btmAreaCss
    : "rgba(0, 180, 216, 0.25)";

  const boxes: PineBox[] = [];
  const lines: PineLine[] = [];
  const labels: PineLabel[] = [];

  let prevHLine: PineLine | null = null;
  let prevHCrossed = false;
  let prevLLine: PineLine | null = null;
  let prevLCrossed = false;
  let lastUncrossedH: { left: number; top: number; btm: number } | null = null;
  let lastUncrossedL: { left: number; top: number; btm: number } | null = null;

  for (let n = length * 2; n < nBars; n++) {
    if (showTop) {
      const pH = checkPivot(candles, n, length, true);
      if (pH !== null) {
        const pIdx = n - length;
        const pCandle = candles[pIdx]!;
        const top = pCandle.high;
        const btm = area === "Full Range" ? pCandle.low : Math.max(pCandle.open, pCandle.close);

        let crossed = false;
        let crossIdx = nBars;
        let count = 0;
        let vol = 0;

        for (let k = pIdx + 1; k < nBars; k++) {
          const c = candles[k]!;
          if (!crossed && c.close > top) {
            crossed = true;
            crossIdx = k;
          }
          if (c.low < top && c.high > btm) {
            count += 1;
            vol += c.volume ?? 0;
          }
        }

        const target = filterOptions === "Volume" ? vol : count;
        if (target >= filterValue) {
          const zoneRight = pIdx + Math.max(2, Math.min(count, 8));
          boxes.push({
            id: `sw_h_box_${pIdx}`,
            left: pIdx,
            top,
            right: zoneRight,
            bottom: btm,
            bgColor: topAreaCss,
          });

          if (prevHLine && !prevHCrossed) {
            prevHLine.x2 = pIdx;
          }

          const curLine: PineLine = {
            id: `sw_h_line_${pIdx}`,
            x1: pIdx,
            y1: top,
            x2: crossed ? crossIdx : nBars + 2,
            y2: top,
            color: topCss,
            width: 1,
            style: crossed ? "dashed" : "solid",
          };
          lines.push(curLine);
          prevHLine = curLine;
          prevHCrossed = crossed;

          if (!crossed) {
            lastUncrossedH = { left: pIdx, top, btm };
          }

          const text = formatVolume(vol, count);
          if (text) {
            labels.push({
              id: `sw_h_lbl_${pIdx}`,
              x: pIdx,
              y: top,
              text,
              color: topCss,
              style: "down",
            });
          }
        }
      }
    }

    if (showBtm) {
      const pL = checkPivot(candles, n, length, false);
      if (pL !== null) {
        const pIdx = n - length;
        const pCandle = candles[pIdx]!;
        const btm = pCandle.low;
        const top = area === "Full Range" ? pCandle.high : Math.min(pCandle.open, pCandle.close);

        let crossed = false;
        let crossIdx = nBars;
        let count = 0;
        let vol = 0;

        for (let k = pIdx + 1; k < nBars; k++) {
          const c = candles[k]!;
          if (!crossed && c.close < btm) {
            crossed = true;
            crossIdx = k;
          }
          if (c.low < top && c.high > btm) {
            count += 1;
            vol += c.volume ?? 0;
          }
        }

        const target = filterOptions === "Volume" ? vol : count;
        if (target >= filterValue) {
          const zoneRight = pIdx + Math.max(2, Math.min(count, 8));
          boxes.push({
            id: `sw_l_box_${pIdx}`,
            left: pIdx,
            top,
            right: zoneRight,
            bottom: btm,
            bgColor: btmAreaCss,
          });

          if (prevLLine && !prevLCrossed) {
            prevLLine.x2 = pIdx;
          }

          const curLine: PineLine = {
            id: `sw_l_line_${pIdx}`,
            x1: pIdx,
            y1: btm,
            x2: crossed ? crossIdx : nBars + 2,
            y2: btm,
            color: btmCss,
            width: 1,
            style: crossed ? "dashed" : "solid",
          };
          lines.push(curLine);
          prevLLine = curLine;
          prevLCrossed = crossed;

          if (!crossed) {
            lastUncrossedL = { left: pIdx, top, btm };
          }

          const btmText = formatVolume(vol, count);
          if (btmText) {
            labels.push({
              id: `sw_l_lbl_${pIdx}`,
              x: pIdx,
              y: btm,
              text: btmText,
              color: btmCss,
              style: "up",
            });
          }
        }
      }
    }
  }

  // Active uncrossed trailing zone at the chart edge (matching TradingView ph_bx / pl_bx)
  if (lastUncrossedH) {
    boxes.push({
      id: "sw_h_active_zone",
      left: lastUncrossedH.left,
      top: lastUncrossedH.top,
      right: nBars + 2,
      bottom: lastUncrossedH.btm,
      bgColor: "rgba(124, 77, 255, 0.08)",
    });
  }
  if (lastUncrossedL) {
    boxes.push({
      id: "sw_l_active_zone",
      left: lastUncrossedL.left,
      top: lastUncrossedL.top,
      right: nBars + 2,
      bottom: lastUncrossedL.btm,
      bgColor: "rgba(0, 180, 216, 0.08)",
    });
  }

  return { boxes, lines, labels };
}

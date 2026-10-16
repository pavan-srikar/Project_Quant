import type { DrawingLine } from "../../../pages/trading/constants";
import type { ResolvedFibLevel } from "./types";
import type { AnySeries } from "./coords";

export const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1] as const;
export const FIB_EXT_LEVELS = [0, 0.618, 1, 1.618, 2.618] as const;
export const FIB_COLORS = [
  "#e91e63",
  "#ff5722",
  "#ff9800",
  "#ffc107",
  "#4caf50",
  "#2196F3",
  "#9c27b0",
];

// Retracement convention: level 0 sits at the second anchor (p2), level 1 at
// the first (p1), matching TradingView's fib retracement direction.
export function fibLevelsFor(d: DrawingLine): readonly number[] {
  if (d.fibLevels && d.fibLevels.length > 0) return d.fibLevels;
  return d.type === "fibextension" ? FIB_EXT_LEVELS : FIB_LEVELS;
}

export function resolveFibLevels(d: DrawingLine, series: AnySeries): ResolvedFibLevel[] {
  if (d.price2 == null) return [];
  const formatter = series.priceFormatter();
  return fibLevelsFor(d).map((level, i) => {
    const price = d.price2! + (d.price - d.price2!) * level;
    return {
      level,
      price,
      y: series.priceToCoordinate(price),
      color: FIB_COLORS[i] ?? "#2196F3",
      label: `${level} (${formatter.format(price)})`,
    };
  });
}

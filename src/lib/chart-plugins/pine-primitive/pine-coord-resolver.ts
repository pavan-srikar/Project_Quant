import type { Logical, Time } from "lightweight-charts";

/**
 * Universal Pine Script X-coordinate resolver.
 * Handles both bar indices (0..N-1, including forward offsets) and timestamps
 * with zero memory allocations or series.data() cloning.
 */
export function resolvePineX(ts: any, _series: any, val: number): number | null {
  if (typeof val !== "number" || isNaN(val)) return null;

  // 1. Timestamp (seconds or milliseconds)
  if (val > 100_000) {
    const sec = val > 1e11 ? Math.floor(val / 1000) : Math.floor(val);
    return ts.timeToCoordinate(sec as Time);
  }

  // 2. Logical bar index (fast direct coordinate or linear projection)
  const direct = ts.logicalToCoordinate(Math.round(val) as Logical);
  if (direct !== null) return direct;

  try {
    const c0 = ts.logicalToCoordinate(0 as Logical), c1 = ts.logicalToCoordinate(1 as Logical);
    const barSpacing = c0 !== null && c1 !== null ? Math.abs(c1 - c0) : 6;
    if (c0 !== null) return c0 + val * barSpacing;
  } catch {}
  return null;
}

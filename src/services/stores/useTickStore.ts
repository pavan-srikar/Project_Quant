export type TickEntry = {
  bid: number;
  ask: number;
  timestamp: number;
  /** Pre-formatted with symbol-correct decimal places — avoids toFixed() during renders */
  bidFmt: string;
  askFmt: string;
};

// RAF tick buffers — batch all WS ticks arriving in one frame into a single set()
export const _pendingTicks = new Map<string, TickEntry>();
export const _pendingLiveTicks = new Map<string, TickEntry>();

/** Per-symbol decimal precision cache — populated on first tick, avoids O(n) symbol lookup per tick */
export const _symbolDecimals = new Map<string, number>();

export function _pipDecimals(tickSize?: number | null): number {
  if (!tickSize) return 5;
  const s = String(tickSize);
  const dot = s.indexOf(".");
  return dot >= 0 ? s.length - dot - 1 : 2;
}

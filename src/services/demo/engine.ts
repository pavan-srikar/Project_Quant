/**
 * In-browser paper-trading engine. The single source of truth for the demo
 * account, positions and orders. Market orders fill instantly at the latest
 * replayed price; positions are marked-to-market on every tick.
 * Backward-compatible facade re-exporting decomposed engine modules.
 */

export * from "./engine/state.ts";
export * from "./engine/accounting.ts";
export * from "./engine/positions.ts";
export * from "./engine/orders.ts";

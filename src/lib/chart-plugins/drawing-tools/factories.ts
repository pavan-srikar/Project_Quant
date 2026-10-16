import type {
  DrawingLine,
  DrawingTool,
  DrawingType,
} from "../../../pages/trading/constants";
import type { DataPoint } from "./types";

/** Drop undefined-valued keys so a style default never overwrites with undefined. */
export function definedOnly<T extends object>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const key of Object.keys(obj) as Array<keyof T>) {
    if (obj[key] !== undefined) out[key] = obj[key];
  }
  return out;
}

// Position tool: creates TradingView-style Long or Short position with
// realistic target, stop, and timeframe width.
export function makePosition(
  side: "long" | "short",
  p1: DataPoint,
  p2: DataPoint,
  timeframe: string,
  intervalSec: number,
): DrawingLine {
  const entry = p1.price;
  const isSingleClick = p1.time === p2.time && Math.abs(p1.price - p2.price) < 1e-6;
  const defaultBars = 25;
  const timeSpan = intervalSec > 0 ? intervalSec * defaultBars : 3600 * defaultBars;

  const time = Math.min(p1.time, p2.time);
  let time2 = Math.max(p1.time, p2.time);
  if (time === time2) {
    time2 = time + timeSpan;
  }

  let targetPrice: number;
  let stopPrice: number;

  if (side === "long") {
    if (isSingleClick) {
      // Default 2:1 RR with 1% stop loss below entry
      const risk = entry * 0.01;
      stopPrice = entry - risk;
      targetPrice = entry + risk * 2;
    } else if (p2.price > entry) {
      // Dragged upward to target
      targetPrice = p2.price;
      const reward = targetPrice - entry;
      stopPrice = entry - reward / 2;
    } else {
      // Dragged downward to stop
      stopPrice = p2.price;
      const risk = entry - stopPrice;
      targetPrice = entry + risk * 2;
    }
    // Ensure long invariant: targetPrice > entry > stopPrice
    if (targetPrice <= entry) targetPrice = entry * 1.02;
    if (stopPrice >= entry) stopPrice = entry * 0.99;
  } else {
    // Short position
    if (isSingleClick) {
      // Default 2:1 RR with 1% stop loss above entry
      const risk = entry * 0.01;
      stopPrice = entry + risk;
      targetPrice = entry - risk * 2;
    } else if (p2.price < entry) {
      // Dragged downward to target
      targetPrice = p2.price;
      const reward = entry - targetPrice;
      stopPrice = entry + reward / 2;
    } else {
      // Dragged upward to stop
      stopPrice = p2.price;
      const risk = stopPrice - entry;
      targetPrice = entry - risk * 2;
    }
    // Ensure short invariant: stopPrice > entry > targetPrice
    if (targetPrice >= entry) targetPrice = entry * 0.98;
    if (stopPrice <= entry) stopPrice = entry * 1.01;
  }

  return {
    id: crypto.randomUUID(),
    type: "position",
    side,
    color: side === "long" ? "#3179f5" : "#ec407a",
    createdTf: timeframe,
    price: entry,
    time,
    time2,
    targetPrice,
    stopPrice,
    riskPct: 1,
  };
}

export function buildNew(
  tool: DrawingTool,
  p1: DataPoint,
  p2: DataPoint,
  timeframe: string,
  intervalSec: number,
): DrawingLine {
  if (tool === "long-position" || tool === "short-position") {
    return makePosition(tool === "long-position" ? "long" : "short", p1, p2, timeframe, intervalSec);
  }
  const base = {
    id: crypto.randomUUID(),
    color: tool === "trendline" ? "#2196F3" : "#f0b90b",
    createdTf: timeframe,
  };
  if (tool === "horizontal") return { ...base, type: "horizontal", price: p1.price };
  if (tool === "vertical") return { ...base, type: "vertical", price: p1.price, time: p1.time };
  const two = { ...base, price: p1.price, time: p1.time, price2: p2.price, time2: p2.time };
  if (tool === "ray") return { ...two, type: "trendline", extendRight: true };
  if (tool === "extended")
    return { ...two, type: "trendline", extendLeft: true, extendRight: true };
  if (tool === "measure")
    return { ...two, type: "trendline", color: "#b2b5be", lineStyle: "dashed" };
  if (tool === "channel") {
    // Offset line defaults parallel and mirrored below so it's visible/draggable.
    return { ...two, type: "channel", time3: p1.time, price3: 2 * p1.price - p2.price };
  }
  if (tool === "fixed-range-volume-profile") {
    const defaultBars = 35;
    const timeSpan = intervalSec > 0 ? intervalSec * defaultBars : 3600 * defaultBars;
    const time = Math.min(p1.time, p2.time);
    let time2 = Math.max(p1.time, p2.time);
    if (time === time2) {
      time2 = time + timeSpan;
    }
    return {
      ...base,
      type: "fixed-range-volume-profile",
      color: "#2962FF",
      price: p1.price,
      time,
      price2: p2.price,
      time2,
      vaPct: 70,
      numRows: 500,
      upColor: "#5b84c4",
      downColor: "#7e60a8",
      pocColor: "#ea3943",
    };
  }
  if (tool === "text") return { ...two, type: "text", text: "Text" };
  return { ...two, type: tool as DrawingType };
}

// Build a drawing, then merge the user's saved style default for its type
// (the measure gesture keeps its fixed look).
export function makeNew(
  tool: DrawingTool,
  p1: DataPoint,
  p2: DataPoint,
  timeframe: string,
  intervalSec: number,
  styleDefaults: Record<string, Partial<DrawingLine>>,
): DrawingLine {
  const d = buildNew(tool, p1, p2, timeframe, intervalSec);
  if (tool === "measure") return d;
  const def = styleDefaults[d.type];
  return def ? { ...d, ...definedOnly(def) } : d;
}

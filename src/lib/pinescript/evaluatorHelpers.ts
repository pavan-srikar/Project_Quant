import type { CandleData } from "../indicators/types";
import type { ParsedPineScript } from "./parser";
import { executePineVM } from "./pineVM";
import {
  seriesSMA,
  seriesEMA,
  seriesRMA,
  seriesRSI,
  seriesATR,
  seriesHighest,
  seriesLowest,
  seriesMACD,
  seriesStdev,
  seriesCross,
  seriesCrossover,
  seriesCrossunder,
  seriesPivotHigh,
  seriesPivotLow,
} from "./mathFunctions";

export function evalTAFunction(
  fn: string,
  args: string[],
  resolve: (e: string) => any,
  candles: CandleData[],
  fallbackSeries: number[],
): number[] | boolean[] | undefined {
  const getSeries = (idx: number, fallback = "close") => {
    const s = resolve(args[idx] || fallback);
    return Array.isArray(s) ? s : fallbackSeries;
  };
  const getLen = (idx: number, fallback = 14) => {
    const l = Number(resolve(args[idx] || String(fallback))) || fallback;
    return Math.max(1, Math.round(l));
  };

  if (fn === "sma") return seriesSMA(getSeries(0), getLen(1, 20));
  if (fn === "ema") return seriesEMA(getSeries(0), getLen(1, 20));
  if (fn === "rma") return seriesRMA(getSeries(0), getLen(1, 14));
  if (fn === "rsi") return seriesRSI(getSeries(0), getLen(1, 14));
  if (fn === "atr") return seriesATR(candles, getLen(0, 14));
  if (fn === "highest") return seriesHighest(getSeries(0), getLen(1, 14));
  if (fn === "lowest") return seriesLowest(getSeries(0), getLen(1, 14));
  if (fn === "stdev") return seriesStdev(getSeries(0), getLen(1, 20));
  if (fn === "macd") return seriesMACD(getSeries(0), getLen(1, 12), getLen(2, 26), getLen(3, 9)).macd;
  if (fn === "cross") return seriesCross(getSeries(0), getSeries(1));
  if (fn === "crossover") return seriesCrossover(getSeries(0), getSeries(1));
  if (fn === "crossunder") return seriesCrossunder(getSeries(0), getSeries(1));
  if (fn === "pivothigh") {
    const highArr = candles.map((c) => c.high);
    return args.length >= 3
      ? seriesPivotHigh(getSeries(0, "high"), getLen(1, 5), getLen(2, 5))
      : seriesPivotHigh(highArr, getLen(0, 5), getLen(1, 5));
  }
  if (fn === "pivotlow") {
    const lowArr = candles.map((c) => c.low);
    return args.length >= 3
      ? seriesPivotLow(getSeries(0, "low"), getLen(1, 5), getLen(2, 5))
      : seriesPivotLow(lowArr, getLen(0, 5), getLen(1, 5));
  }
  return undefined;
}

export function evalMathOrSpecialFunction(
  fn: string,
  args: string[],
  resolve: (e: string) => any,
  n: number,
): any {
  if (fn === "abs") {
    const val = resolve(args[0] || "0");
    return Array.isArray(val) ? val.map((v) => Math.abs(Number(v))) : Math.abs(Number(val));
  }
  if (fn === "max") {
    const a = resolve(args[0] || "0");
    const b = resolve(args[1] || "0");
    const out = new Array<number>(n);
    for (let i = 0; i < n; i++) {
      const va = Array.isArray(a) ? Number(a[i]) : Number(a);
      const vb = Array.isArray(b) ? Number(b[i]) : Number(b);
      out[i] = Math.max(isNaN(va) ? -Infinity : va, isNaN(vb) ? -Infinity : vb);
    }
    return out;
  }
  if (fn === "min") {
    const a = resolve(args[0] || "0");
    const b = resolve(args[1] || "0");
    const out = new Array<number>(n);
    for (let i = 0; i < n; i++) {
      const va = Array.isArray(a) ? Number(a[i]) : Number(a);
      const vb = Array.isArray(b) ? Number(b[i]) : Number(b);
      out[i] = Math.min(isNaN(va) ? Infinity : va, isNaN(vb) ? Infinity : vb);
    }
    return out;
  }
  if (fn === "round") {
    const val = resolve(args[0] || "0");
    return Array.isArray(val) ? val.map((v) => Math.round(Number(v))) : Math.round(Number(val));
  }
  if (fn === "sqrt") {
    const val = resolve(args[0] || "0");
    return Array.isArray(val) ? val.map((v) => Math.sqrt(Number(v))) : Math.sqrt(Number(val));
  }
  if (fn === "nz") {
    const val = resolve(args[0] || "0");
    const repl = args[1] !== undefined ? Number(resolve(args[1])) : 0;
    const replacement = isNaN(repl) ? 0 : repl;
    return Array.isArray(val)
      ? val.map((v) => (v === undefined || isNaN(Number(v)) ? replacement : Number(v)))
      : (val === undefined || isNaN(Number(val)) ? replacement : Number(val));
  }
  if (fn === "na") {
    const val = resolve(args[0] || "0");
    return Array.isArray(val) ? val.map((v) => isNaN(Number(v))) : isNaN(Number(val));
  }
  return undefined;
}

export function evalComparisonOp(op: string, left: any, right: any, n: number): boolean[] {
  const out = new Array<boolean>(n);
  for (let i = 0; i < n; i++) {
    const l = Array.isArray(left) ? left[i] : left;
    const r = Array.isArray(right) ? right[i] : right;
    if (op === ">") out[i] = Number(l) > Number(r);
    else if (op === "<") out[i] = Number(l) < Number(r);
    else if (op === ">=") out[i] = Number(l) >= Number(r);
    else if (op === "<=") out[i] = Number(l) <= Number(r);
    else if (op === "==") out[i] = l === r;
    else if (op === "!=") out[i] = l !== r;
  }
  return out;
}

export function evalBinaryOp(op: string, left: any, right: any, n: number): number[] {
  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    const l = Array.isArray(left) ? (left[i] ?? NaN) : left;
    const r = Array.isArray(right) ? (right[i] ?? NaN) : right;
    if (isNaN(l) || isNaN(r)) out[i] = NaN;
    else if (op === "+") out[i] = l + r;
    else if (op === "-") out[i] = l - r;
    else if (op === "*") out[i] = l * r;
    else if (op === "/") out[i] = r !== 0 ? l / r : NaN;
  }
  return out;
}

export function evaluateDrawings(
  candles: CandleData[],
  parsed: ParsedPineScript,
  context: Record<string, any>,
) {
  return executePineVM(candles, parsed, context);
}

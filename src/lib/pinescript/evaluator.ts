import type { CandleData, IndicatorPoint } from "../indicators/types";
import type { ParsedPineScript } from "./parser";
import type { PineEvaluationResult, PinePlot } from "./types";

function seriesSMA(src: number[], len: number): number[] {
  const res: number[] = new Array(src.length).fill(NaN);
  let sum = 0;
  for (let i = 0; i < src.length; i++) {
    const val = src[i] ?? 0;
    sum += val;
    if (i >= len) sum -= src[i - len] ?? 0;
    if (i >= len - 1) res[i] = sum / len;
  }
  return res;
}

function seriesEMA(src: number[], len: number): number[] {
  const res: number[] = new Array(src.length).fill(NaN);
  if (src.length < len) return res;
  const k = 2 / (len + 1);
  let sum = 0;
  for (let i = 0; i < len; i++) sum += src[i] ?? 0;
  let prev = sum / len;
  res[len - 1] = prev;
  for (let i = len; i < src.length; i++) {
    const val = src[i] ?? 0;
    prev = val * k + prev * (1 - k);
    res[i] = prev;
  }
  return res;
}

function seriesRSI(src: number[], len: number): number[] {
  const res: number[] = new Array(src.length).fill(NaN);
  if (src.length <= len) return res;
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= len; i++) {
    const curr = src[i] ?? 0;
    const prev = src[i - 1] ?? 0;
    const diff = curr - prev;
    if (diff > 0) avgGain += diff;
    else avgLoss += -diff;
  }
  avgGain /= len;
  avgLoss /= len;
  res[len] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = len + 1; i < src.length; i++) {
    const curr = src[i] ?? 0;
    const prev = src[i - 1] ?? 0;
    const diff = curr - prev;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (len - 1) + gain) / len;
    avgLoss = (avgLoss * (len - 1) + loss) / len;
    res[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return res;
}

function seriesATR(candles: CandleData[], len: number): number[] {
  const res: number[] = new Array(candles.length).fill(NaN);
  if (candles.length < len || !candles[0]) return res;
  const trs: number[] = [candles[0].high - candles[0].low];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const prev = candles[i - 1];
    if (!c || !prev) continue;
    const h = c.high;
    const l = c.low;
    const pc = prev.close;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  let sum = 0;
  for (let i = 0; i < len; i++) sum += trs[i] ?? 0;
  let prevVal = sum / len;
  res[len - 1] = prevVal;
  for (let i = len; i < candles.length; i++) {
    const tr = trs[i] ?? 0;
    prevVal = (prevVal * (len - 1) + tr) / len;
    res[i] = prevVal;
  }
  return res;
}

function seriesHighest(src: number[], len: number): number[] {
  const res: number[] = new Array(src.length).fill(NaN);
  for (let i = 0; i < src.length; i++) {
    if (i < len - 1) continue;
    let max = -Infinity;
    for (let j = 0; j < len; j++) {
      const v = src[i - j];
      if (v !== undefined && v > max) max = v;
    }
    res[i] = max;
  }
  return res;
}

function seriesLowest(src: number[], len: number): number[] {
  const res: number[] = new Array(src.length).fill(NaN);
  for (let i = 0; i < src.length; i++) {
    if (i < len - 1) continue;
    let min = Infinity;
    for (let j = 0; j < len; j++) {
      const v = src[i - j];
      if (v !== undefined && v < min) min = v;
    }
    res[i] = min;
  }
  return res;
}

export function evaluatePineScript(
  candles: CandleData[],
  parsed: ParsedPineScript,
  customInputs: Record<string, any> = {},
): PineEvaluationResult {
  if (candles.length === 0) return { plots: [], hlines: [] };
  if (parsed.errors.length > 0) {
    return { plots: [], hlines: [], error: parsed.errors[0] ?? "Script error" };
  }

  const n = candles.length;
  const context: Record<string, number[] | number> = {
    open: candles.map((c) => c.open),
    high: candles.map((c) => c.high),
    low: candles.map((c) => c.low),
    close: candles.map((c) => c.close),
    volume: candles.map((c) => c.volume ?? 0),
    hl2: candles.map((c) => (c.high + c.low) / 2),
    hlc3: candles.map((c) => (c.high + c.low + c.close) / 3),
    ohlc4: candles.map((c) => (c.open + c.high + c.low + c.close) / 4),
  };

  // Bind inputs
  for (const input of parsed.inputs) {
    const val = customInputs[input.id] ?? input.defval;
    context[input.id] = typeof val === "number" ? val : Number(val) || 0;
  }

  // Helper to resolve an expression to a series (number[]) or scalar (number)
  function resolve(expr: string): number[] | number {
    expr = expr.trim();
    const ctxVal = context[expr];
    if (ctxVal !== undefined) return ctxVal;
    const num = Number(expr);
    if (!isNaN(num)) return num;

    // ta.sma / ta.ema / ta.rsi / ta.atr / ta.highest / ta.lowest
    const fnMatch = expr.match(/^(?:ta\.)?(sma|ema|rsi|atr|highest|lowest)\s*\((.+)\)$/i);
    if (fnMatch && fnMatch[1] && fnMatch[2]) {
      const fn = fnMatch[1].toLowerCase();
      const args = fnMatch[2].split(",").map((s) => s.trim());
      const srcArg = args.length > 1 ? (args[0] ?? "close") : "close";
      const lenArg = args.length > 1 ? (args[1] ?? "14") : (args[0] ?? "14");
      const srcSeries = (Array.isArray(resolve(srcArg)) ? resolve(srcArg) : context.close) as number[];
      const len = Math.max(1, Math.round(Number(resolve(lenArg)) || 14));

      if (fn === "sma") return seriesSMA(srcSeries, len);
      if (fn === "ema") return seriesEMA(srcSeries, len);
      if (fn === "rsi") return seriesRSI(srcSeries, len);
      if (fn === "atr") return seriesATR(candles, len);
      if (fn === "highest") return seriesHighest(srcSeries, len);
      if (fn === "lowest") return seriesLowest(srcSeries, len);
    }

    // Binary operations: +, -, *, /
    for (const op of ["+", "-", "*", "/"]) {
      let depth = 0;
      let opIdx = -1;
      for (let i = expr.length - 1; i >= 0; i--) {
        const ch = expr[i];
        if (ch === ")") depth++;
        else if (ch === "(") depth--;
        else if (depth === 0 && ch === op && i > 0 && expr[i - 1] !== "(") {
          opIdx = i;
          break;
        }
      }
      if (opIdx !== -1) {
        const left = resolve(expr.substring(0, opIdx));
        const right = resolve(expr.substring(opIdx + 1));
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
    }

    return new Array<number>(n).fill(NaN);
  }

  // Execute assignments
  for (const assign of parsed.assignments) {
    try {
      context[assign.varName] = resolve(assign.expr);
    } catch {
      context[assign.varName] = new Array<number>(n).fill(NaN);
    }
  }

  // Generate plots
  const plots: PinePlot[] = [];
  parsed.plots.forEach((p, idx) => {
    try {
      const vals = resolve(p.expr);
      const points: IndicatorPoint[] = [];
      for (let i = 0; i < n; i++) {
        const v = Array.isArray(vals) ? (vals[i] ?? NaN) : vals;
        const c = candles[i];
        if (c && !isNaN(v) && isFinite(v)) {
          points.push({ time: c.time, value: v });
        }
      }
      plots.push({
        id: `plot_${idx}`,
        title: p.title,
        color: p.color,
        lineWidth: p.lineWidth,
        values: points,
      });
    } catch {}
  });

  const hlines = parsed.hlines.map((h, i) => ({
    id: `hline_${i}`,
    price: h.price,
    title: h.title,
    color: h.color,
  }));

  return { plots, hlines };
}

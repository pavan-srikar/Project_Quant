import type { CandleData, IndicatorPoint } from "../indicators/types";
import type { ParsedPineScript } from "./parser";
import type { PineEvaluationResult, PinePlot } from "./types";
import { seriesLag, seriesMACD } from "./mathFunctions";
import { evalBinaryOp, evalComparisonOp, evalTAFunction, evalMathOrSpecialFunction, evaluateDrawings } from "./evaluatorHelpers";
import { splitArgs } from "./parserHelpers";
import { runPineTS } from "./pineTSRunner";

export function evaluatePineScript(
  candles: CandleData[],
  parsed: ParsedPineScript,
  customInputs: Record<string, any> = {},
): PineEvaluationResult {
  if (candles.length === 0) return { plots: [], hlines: [] };
  if (parsed.errors.length > 0 && parsed.plots.length === 0 && parsed.hlines.length === 0 && !parsed.hasBoxesOrLines) {
    return { plots: [], hlines: [], error: parsed.errors[0] ?? "Script error" };
  }

  const n = candles.length;
  const barIndex = candles.map((_, i) => i);

  const context: Record<string, any> = {
    open: candles.map((c) => c.open),
    high: candles.map((c) => c.high),
    low: candles.map((c) => c.low),
    close: candles.map((c) => c.close),
    volume: candles.map((c) => c.volume ?? 0),
    hl2: candles.map((c) => (c.high + c.low) / 2),
    hlc3: candles.map((c) => (c.high + c.low + c.close) / 3),
    ohlc4: candles.map((c) => (c.open + c.high + c.low + c.close) / 4),
    bar_index: barIndex,
    na: NaN,
  };

  for (const input of parsed.inputs) {
    context[input.id] = customInputs[input.id] ?? input.defval;
  }

  function resolve(expr: string): any {
    expr = expr.trim();
    if (!expr) return NaN;

    const strMatch = expr.match(/^["']([^"']*)["']$/);
    if (strMatch && strMatch[1] !== undefined) return strMatch[1];

    if (context[expr] !== undefined) return context[expr];
    if (expr === "true") return true;
    if (expr === "false") return false;
    if (expr === "na") return NaN;

    const num = Number(expr);
    if (!isNaN(num)) return num;

    if (/^not\s+/i.test(expr)) {
      const inner = resolve(expr.replace(/^not\s+/i, ""));
      return Array.isArray(inner) ? inner.map((v) => !v) : !inner;
    }

    const lagMatch = expr.match(/^([a-zA-Z_]\w*)\[(\d+)\]$/);
    if (lagMatch && lagMatch[1] && lagMatch[2]) {
      const target = resolve(lagMatch[1]);
      return Array.isArray(target) ? seriesLag(target, parseInt(lagMatch[2], 10)) : NaN;
    }

    // Ternary operator: cond ? then : else
    let qDepth = 0;
    let qIdx = -1;
    let colIdx = -1;
    for (let i = 0; i < expr.length; i++) {
      const ch = expr[i];
      if (ch === "(" || ch === "[") qDepth++;
      else if (ch === ")" || ch === "]") qDepth--;
      else if (qDepth === 0) {
        if (ch === "?" && qIdx === -1) qIdx = i;
        else if (ch === ":" && qIdx !== -1 && colIdx === -1) {
          colIdx = i;
          break;
        }
      }
    }
    if (qIdx !== -1 && colIdx !== -1) {
      const cond = resolve(expr.substring(0, qIdx));
      const thenVal = resolve(expr.substring(qIdx + 1, colIdx));
      const elseVal = resolve(expr.substring(colIdx + 1));
      const out = new Array<any>(n);
      for (let i = 0; i < n; i++) {
        const c = Array.isArray(cond) ? cond[i] : cond;
        const isTrue = Boolean(c) && c !== 0 && !isNaN(c);
        out[i] = isTrue ? (Array.isArray(thenVal) ? thenVal[i] : thenVal) : (Array.isArray(elseVal) ? elseVal[i] : elseVal);
      }
      return out;
    }

    // Logical AND / OR
    for (const logOp of [" or ", " and "]) {
      let depth = 0;
      let opIdx = -1;
      for (let i = expr.length - 1; i >= 0; i--) {
        const ch = expr[i];
        if (ch === ")") depth++;
        else if (ch === "(") depth--;
        else if (depth === 0 && expr.substring(i - logOp.length + 1, i + 1).toLowerCase() === logOp) {
          opIdx = i - logOp.length + 1;
          break;
        }
      }
      if (opIdx !== -1) {
        const left = resolve(expr.substring(0, opIdx));
        const right = resolve(expr.substring(opIdx + logOp.length));
        const isAnd = logOp.trim() === "and";
        const out = new Array<boolean>(n);
        for (let i = 0; i < n; i++) {
          const l = Array.isArray(left) ? Boolean(left[i]) : Boolean(left);
          const r = Array.isArray(right) ? Boolean(right[i]) : Boolean(right);
          out[i] = isAnd ? l && r : l || r;
        }
        return out;
      }
    }

    // TA & Math functions
    const fnMatch = expr.match(/^(?:ta\.)?(sma|ema|rma|rsi|atr|highest|lowest|stdev|macd|cross|crossover|crossunder)\s*\(([\s\S]+)\)$/i);
    if (fnMatch && fnMatch[1] && fnMatch[2]) {
      const fn = fnMatch[1].toLowerCase();
      const args = splitArgs(fnMatch[2]);
      const res = evalTAFunction(fn, args, resolve, candles, context.close as number[]);
      if (res) return res;
    }

    const mathMatch = expr.match(/^(?:(?:math\.)?(abs|max|min|round|sqrt)|(nz|na))\s*\(([\s\S]+)\)$/i);
    if (mathMatch && mathMatch[3]) {
      const fn = (mathMatch[1] || mathMatch[2])!.toLowerCase();
      const args = splitArgs(mathMatch[3]);
      const res = evalMathOrSpecialFunction(fn, args, resolve, n);
      if (res !== undefined) return res;
    }

    // Comparisons
    const compMatch = expr.match(/\s*(==|!=|>=|<=|>|<)\s*/);
    if (compMatch && compMatch.index !== undefined && compMatch[1]) {
      const left = resolve(expr.substring(0, compMatch.index));
      const right = resolve(expr.substring(compMatch.index + compMatch[0].length));
      return evalComparisonOp(compMatch[1], left, right, n);
    }

    // Binary arithmetic
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
        return evalBinaryOp(op, resolve(expr.substring(0, opIdx)), resolve(expr.substring(opIdx + 1)), n);
      }
    }

    return new Array<number>(n).fill(NaN);
  }

  // Execute assignments
  for (const assign of parsed.assignments) {
    if (parsed.inputs.some((inp) => inp.id === assign.varName)) continue;
    try {
      if (assign.isTuple && assign.tupleVars) {
        const macdCall = assign.expr.match(/^(?:ta\.)?macd\s*\((.+)\)$/i);
        if (macdCall && macdCall[1]) {
          const args = macdCall[1].split(",").map((s) => s.trim());
          const src = (Array.isArray(resolve(args[0] || "close")) ? resolve(args[0] || "close") : context.close) as number[];
          const res = seriesMACD(
            src,
            Number(resolve(args[1] || "12")) || 12,
            Number(resolve(args[2] || "26")) || 26,
            Number(resolve(args[3] || "9")) || 9,
          );
          if (assign.tupleVars[0]) context[assign.tupleVars[0]] = res.macd;
          if (assign.tupleVars[1]) context[assign.tupleVars[1]] = res.signal;
          if (assign.tupleVars[2]) context[assign.tupleVars[2]] = res.hist;
          continue;
        }
      }
      context[assign.varName] = resolve(assign.expr);
    } catch {
      context[assign.varName] = new Array<number>(n).fill(NaN);
    }
  }

  // Bar-by-bar trend episode reference stabilization
  if (context.uptrend !== undefined && context.downtrend !== undefined) {
    const upArr = Array.isArray(context.uptrend) ? (context.uptrend as boolean[]) : new Array(n).fill(true);
    const dnArr = Array.isArray(context.downtrend) ? (context.downtrend as boolean[]) : new Array(n).fill(false);
    const closeArr = context.close as number[];
    let upP = closeArr[0] ?? 0;
    let dnP = closeArr[0] ?? 0;
    const upInit = new Array<number>(n);
    const dnInit = new Array<number>(n);
    const initVal = new Array<number>(n);
    for (let i = 0; i < n; i++) {
      if (upArr[i] && (i === 0 || !upArr[i - 1])) upP = closeArr[i]!;
      if (dnArr[i] && (i === 0 || !dnArr[i - 1])) dnP = closeArr[i]!;
      upInit[i] = upP;
      dnInit[i] = dnP;
      initVal[i] = upArr[i] ? upP : dnP;
    }
    context.uptrend_init_price = upInit;
    context.downtrend_init_price = dnInit;
    context.init_value = initVal;
  }

  // Generate plots
  const plots: PinePlot[] = [];
  parsed.plots.forEach((p, idx) => {
    try {
      let vals = resolve(p.expr);
      if (!Array.isArray(vals) || vals.every((v) => isNaN(v))) {
        vals = context[p.expr] ?? [];
      }

      const isRef = p.title === "Reference Price" || /init_value/i.test(p.expr);
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
        color: isRef ? "#787b86" : p.color,
        lineWidth: isRef ? 1 : p.lineWidth,
        values: points,
        displayNone: p.displayNone,
        style: p.style,
      });
    } catch {}
  });

  const hlines = parsed.hlines.map((h, i) => ({ id: `hline_${i}`, price: h.price, title: h.title, color: h.color }));
  const { polylines, fills, boxes, lines, labels } = evaluateDrawings(candles, parsed, context);
  return { plots, hlines, polylines, fills, boxes, lines, labels };
}

export async function evaluatePineScriptAsync(
  candles: CandleData[],
  parsed: ParsedPineScript,
  customInputs: Record<string, any> = {},
  rawCode?: string,
): Promise<PineEvaluationResult> {
  const code = rawCode || parsed.rawCode;
  if (code) {
    const tsRes = await runPineTS(candles, code, customInputs);
    if (
      tsRes &&
      (tsRes.plots.length > 0 ||
        (tsRes.boxes && tsRes.boxes.length > 0) ||
        (tsRes.lines && tsRes.lines.length > 0) ||
        (tsRes.labels && tsRes.labels.length > 0) ||
        (tsRes.polylines && tsRes.polylines.length > 0) ||
        (tsRes.tables && tsRes.tables.length > 0))
    ) {
      return tsRes;
    }
    if (typeof window !== "undefined" && typeof Worker !== "undefined") {
      await new Promise<void>((r) => setTimeout(r, 0));
      if (parsed.hasForecastPolyline || parsed.isLiquiditySwings || parsed.isLiquiditySweeps || parsed.plots.length <= 4) {
        return evaluatePineScript(candles, parsed, customInputs);
      }
      return { plots: [], hlines: [], error: "Complex indicator evaluation timed out in worker" };
    }
  }
  return evaluatePineScript(candles, parsed, customInputs);
}

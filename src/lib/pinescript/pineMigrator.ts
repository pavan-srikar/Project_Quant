/**
 * Universal Pine Script v4 -> v5 Transpiler & Sanitizer
 * Automatically upgrades legacy Pine Script syntax (v1-v4) to v5:
 * - Version header & study -> indicator conversion
 * - Built-in function namespacing (ta.*, math.*, str.*)
 * - Typed inputs (input.int, input.float, input.bool, input.string, input.color, input.source)
 * - Series history call hoisting (close[call(...)] -> hoisted temp variable)
 */

export function migratePineSource(pine: string): string {
  let res = pine;

  // 1. Version header & indicator declaration
  if (/\/\/@version=[1-4]/i.test(res)) {
    res = res.replace(/\/\/@version=[1-4]/gi, "//@version=5");
  } else if (!/\/\/@version=/i.test(res)) {
    res = "//@version=5\n" + res;
  }
  res = res.replace(/\bstudy\s*\(/g, "indicator(");

  // 2. Namespaced Technical Analysis functions (ta.*)
  const taFuncs = [
    "rsi", "macd", "mom", "cci", "stoch", "sma", "ema", "wma", "vwma", "rma",
    "atr", "tr", "mfi", "pivothigh", "pivotlow", "crossover", "crossunder", "cross",
    "highest", "lowest", "highestbars", "lowestbars", "cum", "wpr", "bb", "bbw",
    "kc", "kcw", "supertrend", "sar", "vwap", "tsi", "cog", "dev", "stdev", "variance"
  ];
  for (const fn of taFuncs) {
    const re = new RegExp(`(?<!ta\\.)\\b${fn}\\s*\\(`, "g");
    res = res.replace(re, `ta.${fn}(`);
  }
  res = res.replace(/(?<!ta\.)\bobv\b/g, "ta.obv");

  // 3. Namespaced Math functions (math.*)
  const mathFuncs = [
    "abs", "pow", "max", "min", "round", "ceil", "floor", "sign", "sqrt",
    "log", "log10", "exp", "sin", "cos", "tan", "asin", "acos", "atan"
  ];
  for (const fn of mathFuncs) {
    const re = new RegExp(`(?<!math\\.)\\b${fn}\\s*\\(`, "g");
    res = res.replace(re, `math.${fn}(`);
  }

  // 4. Namespaced String functions (str.*)
  res = res.replace(/(?<!str\.)\btostring\s*\(/g, "str.tostring(");

  // 5. Upgrade untyped input(...) to typed input.<type>(...)
  res = res.replace(/\binput\s*\(([^)]*)\)/g, (_match, args) => {
    if (/options\s*=|"/.test(args) && !/minval|maxval/.test(args)) {
      if (/options\s*=|defval\s*=\s*"/.test(args)) return `input.string(${args})`;
    }
    if (/minval|maxval|step/.test(args)) {
      if (/\b\d+\.\d+\b/.test(args)) return `input.float(${args})`;
      return `input.int(${args})`;
    }
    if (/\b(true|false)\b/i.test(args)) return `input.bool(${args})`;
    if (/color\./i.test(args)) return `input.color(${args})`;
    if (/\b(close|open|high|low|hl2|hlc3|ohlc4)\b/.test(args)) return `input.source(${args})`;
    return `input(${args})`;
  });

  // 6. Hoist function calls and array accesses inside series history brackets [expr]
  res = hoistNestedSeriesIndices(res);

  return res;
}

/**
 * Hoists complex function calls inside series history indexing [expr]
 * e.g. close[array.get(all_divs, x)] -> __h_idx = array.get(all_divs, x); close[__h_idx]
 * Prevents PineTS ClosedWorldViolation scoping bug on nested call properties.
 */
function hoistNestedSeriesIndices(pine: string): string {
  const lines = pine.split(/\r?\n/);
  const statements: Array<{ isCommentOrEmpty?: boolean; raw?: string; indent: string; lines: string[] }> = [];
  let currentStmt: { indent: string; lines: string[] } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!;
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith("//")) {
      if (currentStmt) {
        statements.push(currentStmt);
        currentStmt = null;
      }
      statements.push({ isCommentOrEmpty: true, raw, indent: "", lines: [raw] });
      continue;
    }

    const matchIndent = raw.match(/^(\s*)/);
    const indent = matchIndent ? matchIndent[1]! : "";

    let isContinuation = false;
    if (currentStmt) {
      const prevLine = currentStmt.lines[currentStmt.lines.length - 1]!.trim();
      const prevEndsWithOp = /[,(\?:=+\-*\/]$/.test(prevLine);
      const isBlockHeader = /^(for|if|while|switch)\b/.test(currentStmt.lines[0]!.trim());
      if (prevEndsWithOp || (!isBlockHeader && indent.length > currentStmt.indent.length)) {
        isContinuation = true;
      }
    }

    if (isContinuation && currentStmt) {
      currentStmt.lines.push(raw);
    } else {
      if (currentStmt) statements.push(currentStmt);
      currentStmt = { indent, lines: [raw] };
    }
  }
  if (currentStmt) statements.push(currentStmt);

  let hoistedCounter = 0;
  const resultLines: string[] = [];
  const re = /(\b[a-zA-Z_]\w*\s*\[\s*)([a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)?\s*\([^\]\[]+\))(\s*\])/g;

  for (const stmt of statements) {
    if (stmt.isCommentOrEmpty) {
      resultLines.push(stmt.raw!);
      continue;
    }
    const fullText = stmt.lines.join("\n");
    const calls = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = re.exec(fullText)) !== null) {
      calls.add(m[2]!);
    }
    if (calls.size === 0) {
      resultLines.push(...stmt.lines);
      continue;
    }

    let modifiedText = fullText;
    const preamble: string[] = [];
    for (const callExpr of calls) {
      const varName = `__h_idx_${hoistedCounter++}`;
      preamble.push(`${stmt.indent}${varName} = ${callExpr}`);
      const escaped = callExpr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const replaceRe = new RegExp(`(\\b[a-zA-Z_]\\w*\\s*\\[\\s*)${escaped}(\\s*\\])`, "g");
      modifiedText = modifiedText.replace(replaceRe, `$1${varName}$2`);
    }
    resultLines.push(...preamble);
    resultLines.push(...modifiedText.split("\n"));
  }

  return resultLines.join("\n");
}

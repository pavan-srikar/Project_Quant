import type { PineHLine, PineInputDef } from "./types";
import { foldLines, parsePineColor, splitArgs } from "./parserHelpers";

export interface ParsedPinePlot {
  expr: string;
  title: string;
  color: string;
  lineWidth: number;
  displayNone?: boolean;
  style?: "columns" | "histogram" | "line" | "area" | "circles" | "cross";
}

export interface ParsedPineAssignment {
  varName: string;
  expr: string;
  isTuple?: boolean;
  tupleVars?: string[];
}

export interface ParsedPineFill {
  plot1: string;
  plot2: string;
  topValueExpr?: string;
  bottomValueExpr?: string;
  topColorExpr?: string;
  bottomColorExpr?: string;
}

export interface ParsedPineScript {
  title: string;
  overlay: boolean;
  inputs: PineInputDef[];
  assignments: ParsedPineAssignment[];
  plots: ParsedPinePlot[];
  hlines: PineHLine[];
  fills: ParsedPineFill[];
  hasForecastPolyline: boolean;
  hasBoxesOrLines: boolean;
  isLiquiditySweeps: boolean;
  isLiquiditySwings: boolean;
  errors: string[];
  rawCode?: string;
}

export function parsePineScript(code: string): ParsedPineScript {
  const result: ParsedPineScript = {
    title: "Custom Indicator",
    overlay: true,
    inputs: [],
    assignments: [],
    plots: [],
    hlines: [],
    fills: [],
    hasForecastPolyline: false,
    hasBoxesOrLines: false,
    isLiquiditySweeps: false,
    isLiquiditySwings: false,
    errors: [],
    rawCode: code,
  };

  if (/liquidity\s+sweeps/i.test(code)) {
    result.isLiquiditySweeps = true;
    result.hasBoxesOrLines = true;
  }
  if (/liquidity\s+swings/i.test(code)) {
    result.isLiquiditySwings = true;
    result.hasBoxesOrLines = true;
  }

  const lines = foldLines(code);

  for (const line of lines) {
    if (/polyline\.new|method\s+forecast/i.test(line)) {
      result.hasForecastPolyline = true;
    }
    if (/box\.new|line\.new|max_boxes_count|max_lines_count/i.test(line)) {
      result.hasBoxesOrLines = true;
    }

    // 1. Header
    const hdr = line.match(/^(?:indicator|study)\s*\(([\s\S]*)\)$/i);
    if (hdr && hdr[1]) {
      const args = splitArgs(hdr[1]);
      const strMatch = (args[0] ?? "").match(/^["']([^"']+)["']/);
      if (strMatch && strMatch[1]) result.title = strMatch[1];
      for (const arg of args) {
        const ov = arg.match(/overlay\s*=\s*(true|false)/i);
        if (ov && ov[1]) result.overlay = ov[1].toLowerCase() === "true";
      }
      continue;
    }

    if (/^type\s+\w+/i.test(line) || /^method\s+\w+/i.test(line)) continue;

    // 2. Inputs: varName = input[.(int|float|bool|string|color|timeframe|...)]
    const inp = line.match(
      /^(?:(?:var|varip)\s+)?([a-zA-Z_]\w*)\s*=\s*input(?:\.([a-zA-Z_]\w*))?\s*\(([\s\S]*)\)$/i,
    );
    if (inp && inp[1] && inp[3] !== undefined) {
      const varName = inp[1];
      const specifiedType = inp[2]?.toLowerCase();
      const args = splitArgs(inp[3]);
      const rawDefval = (args[0] || "14").replace(/^defval\s*=\s*/, "").trim();

      let title = varName;
      let group: string | undefined;
      let inline: string | undefined;
      let min: number | undefined;
      let max: number | undefined;
      let options: string[] | undefined;

      for (let i = 1; i < args.length; i++) {
        const a = args[i]!;
        const gMatch = a.match(/group\s*=\s*["']([^"']+)["']/i);
        if (gMatch && gMatch[1]) group = gMatch[1];

        const inlMatch = a.match(/inline\s*=\s*["']([^"']+)["']/i);
        if (inlMatch && inlMatch[1]) inline = inlMatch[1];

        const minMatch = a.match(/(?:minval|min)\s*=\s*([0-9.-]+)/i);
        if (minMatch && minMatch[1]) min = parseFloat(minMatch[1]);

        const maxMatch = a.match(/(?:maxval|max)\s*=\s*([0-9.-]+)/i);
        if (maxMatch && maxMatch[1]) max = parseFloat(maxMatch[1]);

        const optMatch = a.match(/options\s*=\s*\[([^\]]+)\]/i);
        if (optMatch && optMatch[1]) {
          options = optMatch[1]
            .split(",")
            .map((s) => s.trim().replace(/^["']|["']$/g, ""))
            .filter(Boolean);
        }

        const tMatch = a.match(/^(?:title\s*=\s*)?["']([^"']*)["']/i);
        if (tMatch && tMatch[1] !== undefined && !a.startsWith("group") && !a.startsWith("inline")) {
          title = tMatch[1];
        }
      }

      let typeStr: "int" | "float" | "bool" | "string" | "color" = "string";
      if (specifiedType === "int") typeStr = "int";
      else if (specifiedType === "float") typeStr = "float";
      else if (specifiedType === "bool") typeStr = "bool";
      else if (specifiedType === "color") typeStr = "color";
      else if (specifiedType === "string" || specifiedType === "timeframe" || specifiedType === "symbol" || specifiedType === "resolution" || specifiedType === "session" || specifiedType === "source") typeStr = "string";
      else if (!specifiedType) {
        if (/^true|false$/i.test(rawDefval)) typeStr = "bool";
        else if (/^["'].*["']$/.test(rawDefval)) typeStr = "string";
        else if (rawDefval.startsWith("#") || rawDefval.startsWith("color.")) typeStr = "color";
        else if (rawDefval.includes(".")) typeStr = "float";
        else typeStr = "int";
      }

      let defval: number | boolean | string = rawDefval;
      if (typeStr === "int") {
        const p = parseInt(rawDefval, 10);
        defval = isNaN(p) ? 14 : p;
      } else if (typeStr === "float") {
        const p = parseFloat(rawDefval);
        defval = isNaN(p) ? 1.0 : p;
      } else if (typeStr === "bool") {
        defval = rawDefval.toLowerCase() === "true";
      } else if (typeStr === "color") {
        defval = parsePineColor(rawDefval);
      } else if (typeStr === "string") {
        defval = rawDefval.replace(/^["']|["']$/g, "");
      }

      result.inputs.push({ id: varName, type: typeStr, defval, title, group, inline, min, max, options });
      continue;
    }


    // 3. Plots: [var =] plot(...)
    const plt = line.match(/^(?:(?:var|varip)\s+)?(?:([a-zA-Z_]\w*)\s*=\s*)?plot\s*\(([\s\S]*)\)$/i);
    if (plt && plt[2] !== undefined) {
      const assignedVar = plt[1];
      const args = splitArgs(plt[2]);
      if (args.length > 0 && args[0]) {
        const rawExpr = args[0].replace(/^series\s*=\s*/, "").trim();
        let plotTitle = assignedVar || result.title;
        let plotColor = "#2962ff";
        let plotWidth = 1.5;
        let displayNone = false;
        let plotStyle: "columns" | "histogram" | "line" | "area" | "circles" | "cross" | undefined;

        for (let i = 1; i < args.length; i++) {
          const a = args[i]!;
          if (/display\s*=\s*display\.none/i.test(a)) displayNone = true;
          const t = a.match(/^(?:title\s*=\s*)?["']([^"']+)["']/i);
          if (t && t[1] && !a.startsWith("color") && !a.startsWith("linewidth") && !a.startsWith("display") && !a.startsWith("style")) {
            plotTitle = t[1];
          }
          const c = a.match(/(?:color\s*=\s*)?((?:color\.[a-z]+|#[0-9a-fA-F]{3,8}|color\.new\([^)]+\)))/i);
          if (c && c[1]) plotColor = parsePineColor(c[1]);
          const w = a.match(/(?:linewidth\s*=\s*)(\d+)/i);
          if (w && w[1]) plotWidth = parseInt(w[1], 10);
          const st = a.match(/(?:style\s*=\s*)plot\.style_(columns|histogram|line|area|circles|cross)/i);
          if (st && st[1]) plotStyle = st[1].toLowerCase() as any;
        }

        result.plots.push({ expr: rawExpr, title: plotTitle, color: plotColor, lineWidth: plotWidth, displayNone, style: plotStyle });
        if (assignedVar) result.assignments.push({ varName: assignedVar, expr: rawExpr });
        continue;
      }
    }

    // 4. Fill directives: fill(plot1, plot2, ...)
    const fl = line.match(/^fill\s*\(([\s\S]*)\)$/i);
    if (fl && fl[1]) {
      const args = splitArgs(fl[1]);
      if (args.length >= 2 && args[0] && args[1]) {
        const plot1 = args[0].trim();
        const plot2 = args[1].trim();
        let topColorExpr: string | undefined;
        let bottomColorExpr: string | undefined;
        let topValueExpr: string | undefined;
        let bottomValueExpr: string | undefined;

        for (let i = 2; i < args.length; i++) {
          const a = args[i]!;
          const tc = a.match(/top_color\s*=\s*(.+)/i);
          if (tc && tc[1]) topColorExpr = tc[1].trim();
          const bc = a.match(/bottom_color\s*=\s*(.+)/i);
          if (bc && bc[1]) bottomColorExpr = bc[1].trim();
          const tv = a.match(/top_value\s*=\s*(.+)/i);
          if (tv && tv[1]) topValueExpr = tv[1].trim();
          const bv = a.match(/bottom_value\s*=\s*(.+)/i);
          if (bv && bv[1]) bottomValueExpr = bv[1].trim();
        }

        result.fills.push({ plot1, plot2, topValueExpr, bottomValueExpr, topColorExpr, bottomColorExpr });
        continue;
      }
    }

    // 5. Hlines
    const hln = line.match(/^(?:(?:[a-zA-Z_]\w*)\s*=\s*)?hline\s*\(([\s\S]*)\)$/i);
    if (hln && hln[1]) {
      const args = splitArgs(hln[1]);
      const price = parseFloat(args[0]?.replace(/^price\s*=\s*/, "") || "0");
      let hTitle = "";
      let hColor = "#787b86";

      for (let i = 1; i < args.length; i++) {
        const a = args[i]!;
        const t = a.match(/^(?:title\s*=\s*)?["']([^"']+)["']/i);
        if (t && t[1]) hTitle = t[1];
        const c = a.match(/^(?:color\s*=\s*)?((?:color\.[a-z]+|#[0-9a-fA-F]{3,8}))/i);
        if (c && c[1]) hColor = parsePineColor(c[1]);
      }
      result.hlines.push({ id: `hline_${result.hlines.length}`, price, title: hTitle, color: hColor });
      continue;

    }

    // 6. Tuple destructuring: [a, b, c] = ...
    const tup = line.match(/^\[([a-zA-Z_0-9,\s_]+)\]\s*=\s*(.+)$/);
    if (tup && tup[1] && tup[2]) {
      const tupleVars = tup[1].split(",").map((s) => s.trim()).filter((s) => s && s !== "_");
      result.assignments.push({ varName: tupleVars[0] || "tuple_res", expr: tup[2].trim(), isTuple: true, tupleVars });
      continue;
    }

    // 7. Regular assignments
    const asg = line.match(/^(?:(?:var|varip)\s+)?([a-zA-Z_]\w*)\s*(?::=|=)\s*(.+)$/);
    if (asg && asg[1] && asg[2]) {
      result.assignments.push({ varName: asg[1], expr: asg[2].trim() });
    }
  }

  if (result.plots.length === 0 && result.hlines.length === 0 && !result.hasForecastPolyline && !result.hasBoxesOrLines) {
    if (result.assignments.length > 0) {
      const last = result.assignments[result.assignments.length - 1]!;
      result.plots.push({ expr: last.varName, title: result.title || last.varName, color: "#2962ff", lineWidth: 1.5 });
    } else {
      result.errors.push("No plot(...) or hline(...) directives found in Pine Script.");
    }
  }

  return result;
}

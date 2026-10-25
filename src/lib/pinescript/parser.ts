import type { PineInputDef } from "./types";

export interface ParsedPineScript {
  title: string;
  overlay: boolean;
  inputs: PineInputDef[];
  assignments: { varName: string; expr: string }[];
  plots: { expr: string; title: string; color: string; lineWidth: number }[];
  hlines: { price: number; title: string; color: string; lineStyle?: number }[];
  errors: string[];
}

export function parsePineColor(raw: string): string {
  const clean = raw.trim().toLowerCase();
  const COLOR_MAP: Record<string, string> = {
    "color.blue": "#2962ff",
    "color.yellow": "#f0b90b",
    "color.red": "#f23645",
    "color.green": "#089981",
    "color.purple": "#ab47bc",
    "color.orange": "#ff9800",
    "color.gray": "#787b86",
    "color.white": "#ffffff",
    "color.black": "#131722",
    "color.aqua": "#00bcd4",
    "color.teal": "#009688",
    "color.lime": "#00e676",
  };
  if (COLOR_MAP[clean]) return COLOR_MAP[clean];
  if (clean.startsWith("#") || clean.startsWith("rgb")) return raw.trim();
  return "#2962ff";
}

export function parsePineScript(code: string): ParsedPineScript {
  const result: ParsedPineScript = {
    title: "Custom Indicator",
    overlay: true,
    inputs: [],
    assignments: [],
    plots: [],
    hlines: [],
    errors: [],
  };

  const lines = code.split(/\r?\n/);

  for (let idx = 0; idx < lines.length; idx++) {
    const rawLine = lines[idx];
    if (!rawLine) continue;
    let line = rawLine.trim();
    // Strip comments
    if (line.startsWith("//") || line.length === 0) continue;
    const commentIdx = line.indexOf("//");
    if (commentIdx !== -1) {
      line = line.substring(0, commentIdx).trim();
    }

    // 1. Header: indicator("Title", overlay=true/false) or study(...)
    const headerMatch = line.match(/(?:indicator|study)\s*\(\s*(?:title\s*=\s*)?["']([^"']+)["'](?:[^)]*overlay\s*=\s*(true|false))?/i);
    if (headerMatch && headerMatch[1]) {
      result.title = headerMatch[1];
      if (headerMatch[2] != null) {
        result.overlay = headerMatch[2].toLowerCase() === "true";
      }
      continue;
    }

    // 2. Inputs: varName = input[.type](defval, "Title")
    const inputMatch = line.match(/^([a-zA-Z_]\w*)\s*=\s*input(?:\.(int|float|bool|string|color))?\s*\(\s*([^,)]+)(?:,\s*(?:title\s*=\s*)?["']([^"']*)["'])?/i);
    if (inputMatch && inputMatch[1] && inputMatch[3]) {
      const varName = inputMatch[1];
      const typeStr = (inputMatch[2] || "int").toLowerCase();
      const rawDefval = inputMatch[3].trim();
      const title = inputMatch[4] || varName;
      let defval: number | boolean | string = rawDefval;

      if (typeStr === "int") defval = parseInt(rawDefval, 10) || 14;
      else if (typeStr === "float") defval = parseFloat(rawDefval) || 1.0;
      else if (typeStr === "bool") defval = rawDefval.toLowerCase() === "true";
      else if (typeStr === "color") defval = parsePineColor(rawDefval);

      result.inputs.push({
        id: varName,
        type: typeStr as any,
        defval,
        title,
      });
      result.assignments.push({ varName, expr: String(defval) });
      continue;
    }

    // 3. plot(expr, "Title", color, width)
    const plotMatch = line.match(/^plot\s*\(\s*([^,)]+)(?:,\s*(?:title\s*=\s*)?["']([^"']*)["'])?(?:,\s*(?:color\s*=\s*)?([^,)]+))?(?:,\s*(?:linewidth\s*=\s*)?(\d+))?/i);
    if (plotMatch && plotMatch[1]) {
      const expr = plotMatch[1].trim();
      const plotTitle = plotMatch[2] || result.title;
      const plotColor = plotMatch[3] ? parsePineColor(plotMatch[3]) : "#2962ff";
      const plotWidth = plotMatch[4] ? parseInt(plotMatch[4], 10) : 1.5;
      result.plots.push({
        expr,
        title: plotTitle,
        color: plotColor,
        lineWidth: plotWidth,
      });
      continue;
    }

    // 4. hline(price, "Title", color)
    const hlineMatch = line.match(/^hline\s*\(\s*([-\d.]+)(?:,\s*(?:title\s*=\s*)?["']([^"']*)["'])?(?:,\s*(?:color\s*=\s*)?([^,)]+))?/i);
    if (hlineMatch && hlineMatch[1]) {
      const price = parseFloat(hlineMatch[1]);
      const hTitle = hlineMatch[2] || "";
      const hColor = hlineMatch[3] ? parsePineColor(hlineMatch[3]) : "#787b86";
      result.hlines.push({ price, title: hTitle, color: hColor });
      continue;
    }

    // 5. Assignments: varName = expression
    const assignMatch = line.match(/^([a-zA-Z_]\w*)\s*=\s*(.+)$/);
    if (assignMatch && assignMatch[1] && assignMatch[2]) {
      result.assignments.push({
        varName: assignMatch[1],
        expr: assignMatch[2].trim(),
      });
      continue;
    }
  }

  if (result.plots.length === 0 && result.hlines.length === 0) {
    result.errors.push("No plot(...) or hline(...) directives found in Pine Script.");
  }

  return result;
}

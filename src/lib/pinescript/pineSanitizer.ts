import { migratePineSource } from "./pineMigrator";

export function boostPineHeader(code: string): string {
  const m = code.match(/\b(indicator|study)\s*\(/);
  if (!m || m.index === undefined) return code;
  const start = m.index + m[0].length;
  let depth = 1, inStr = false, strChar = "", i = start;
  while (i < code.length && depth > 0) {
    const ch = code[i];
    if (inStr) {
      if (ch === strChar && code[i - 1] !== "\\") inStr = false;
    } else {
      if (ch === "\"" || ch === "'") { inStr = true; strChar = ch; }
      else if (ch === "(") depth++;
      else if (ch === ")") depth--;
    }
    if (depth === 0) break;
    i++;
  }
  if (depth !== 0) return code;
  const args = code.substring(start, i);
  let modArgs = args
    .replace(/\bmax_boxes_count\s*=\s*\d+/g, "max_boxes_count = 500")
    .replace(/\bmax_lines_count\s*=\s*\d+/g, "max_lines_count = 500")
    .replace(/\bmax_labels_count\s*=\s*\d+/g, "max_labels_count = 500")
    .replace(/\bmax_bars_back\s*=\s*\d+/g, "max_bars_back = 500");
  if (!modArgs.includes("max_boxes_count")) modArgs += ", max_boxes_count = 500";
  if (!modArgs.includes("max_lines_count")) modArgs += ", max_lines_count = 500";
  if (!modArgs.includes("max_labels_count")) modArgs += ", max_labels_count = 500";
  if (!modArgs.includes("max_bars_back")) modArgs += ", max_bars_back = 500";
  return code.substring(0, start) + modArgs + code.substring(i);
}

export function sanitizePineCode(code: string): string {
  let cleaned = code.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-zA-Z0-9_-]*\r?\n/, "").replace(/\r?\n```$/, "");
  }
  const m = cleaned.match(/(\/\/[~=-]{5,}[^\n]*\n?)/g);
  if (m && m.length > 0) {
    const lastMatch = m[m.length - 1];
    if (lastMatch) {
      const lastIdx = cleaned.lastIndexOf(lastMatch);
      const after = cleaned.substring(lastIdx + lastMatch.length).trim();
      if (after && !after.includes("plot") && !after.includes("=") && !after.includes("alert")) {
        cleaned = cleaned.substring(0, lastIdx + lastMatch.length);
      }
    }
  }
  const lines = cleaned.split(/\r?\n/);
  while (lines.length > 0) {
    const last = lines[lines.length - 1]!.trim();
    if (!last) { lines.pop(); continue; }
    const isPineStmt = /^(indicator|strategy|library|var|varip|plot|plotcandle|plotchar|plotshape|plotarrow|plotbar|hline|fill|alert|alertcondition|table\.|box\.|line\.|label\.|polyline\.|array\.|matrix\.|map\.|if\b|for\b|while\b|switch\b|type\b|export\b|import\b|method\b|const\b|[a-zA-Z_]\w*\s*(\[.*?\])?\s*(\:?\=|\+=|-=|\*=|\/=)|[a-zA-Z_]\w*\s*\(|\[.*?\]\s*=|\/\/|\/\*|\})/i.test(last);
    const isDangling = /^(and|or|not|in|is|then|else|to|by|so|like|didnt|bro|why)\b/i.test(last);
    if (isDangling || !isPineStmt) lines.pop();
    else break;
  }
  cleaned = lines.join("\n");
  cleaned = cleaned.replace(/\bbarstate\.isconfirmed\b/g, "(barstate.isconfirmed or barstate.ishistory or true)");
  cleaned = cleaned.replace(/\bsyminfo\.mintick\b/g, "0.01");
  cleaned = cleaned.replace(/\[\s*([a-zA-Z_]\w*(?:\s*,\s*[a-zA-Z_]\w*)*)\s*\]\s*=\s*request\.security_lower_tf\s*\([^)]*\)/gs, (_, tv) => {
    const vars = tv.split(",").map((v: string) => v.trim()), map = ["high", "low", "volume", "close", "open"];
    return vars.map((v: string, i: number) => `${v} = ${map[i % map.length]}`).join(", ");
  });
  cleaned = cleaned.replace(/request\.security_lower_tf\s*\([^,]+,[^,]+,\s*([a-zA-Z_]\w*\(\))\s*\)/g, "$1");
  cleaned = cleaned.replace(/\b([a-zA-Z_]\w*)\s*=\s*request\.security_lower_tf\s*\([^)]*\)/g, "$1 = close");
  cleaned = cleaned.replace(/\buseLtf\s*=\s*ltfSec\s*<\s*chartSec\b/g, "useLtf = false");
  cleaned = migratePineSource(cleaned);
  cleaned = boostPineHeader(cleaned);
  return cleaned;
}

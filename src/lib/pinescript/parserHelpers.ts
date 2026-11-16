export function parsePineColor(colorStr: string): string {
  const s = colorStr.trim().toLowerCase();
  const named: Record<string, string> = {
    "color.red": "#f23645",
    "color.green": "#089981",
    "color.blue": "#2962ff",
    "color.yellow": "#f0b90b",
    "color.orange": "#ff9800",
    "color.purple": "#9c27b0",
    "color.white": "#ffffff",
    "color.black": "#000000",
    "color.gray": "#787b86",
    "color.teal": "#00897b",
    "color.aqua": "#00bcd4",
    "color.lime": "#00e676",
    "color.silver": "#b2b5be",
    "color.navy": "#1b263b",
    "color.maroon": "#880e4f",
    "color.olive": "#827717",
    "color.fuchsia": "#e040fb",
  };
  if (named[s]) return named[s];

  const colorNew = colorStr.match(/color\.new\s*\(([^,]+),\s*([^)]+)\)/i);
  if (colorNew && colorNew[1] && colorNew[2]) {
    const baseColor = parsePineColor(colorNew[1].trim());
    const transp = parseFloat(colorNew[2].trim()) || 0;
    const alpha = Math.max(0, Math.min(1, 1 - transp / 100));
    if (baseColor.startsWith("#")) {
      const hex = baseColor.slice(1);
      const r = parseInt(hex.substring(0, 2), 16) || 0;
      const g = parseInt(hex.substring(2, 4), 16) || 0;
      const b = parseInt(hex.substring(4, 6), 16) || 0;
      return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
    }
    return baseColor;
  }

  if (colorStr.startsWith("#")) return colorStr;
  return "#2962ff";
}

export function splitArgs(argsStr: string): string[] {
  const result: string[] = [];
  let current = "";
  let depth = 0;
  let inStr: false | '"' | "'" = false;

  for (let i = 0; i < argsStr.length; i++) {
    const ch = argsStr[i]!;
    if (inStr) {
      current += ch;
      if (ch === inStr && argsStr[i - 1] !== "\\") inStr = false;
    } else if (ch === '"' || ch === "'") {
      inStr = ch;
      current += ch;
    } else if (ch === "(" || ch === "[" || ch === "{") {
      depth++;
      current += ch;
    } else if (ch === ")" || ch === "]" || ch === "}") {
      depth = Math.max(0, depth - 1);
      current += ch;
    } else if (ch === "," && depth === 0) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) result.push(current.trim());
  return result;
}

export function foldLines(code: string): string[] {
  const rawLines = code.split("\n");
  const out: string[] = [];
  let pending = "";
  let parenDepth = 0;

  for (const raw of rawLines) {
    let line = raw.trim();
    if (line.startsWith("//") || !line) continue;

    let inStr: false | '"' | "'" = false;
    let commentIdx = -1;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]!;
      if (inStr) {
        if (ch === inStr && line[i - 1] !== "\\") inStr = false;
      } else if (ch === '"' || ch === "'") {
        inStr = ch;
      } else if (ch === "/" && i < line.length - 1 && line[i + 1] === "/") {
        commentIdx = i;
        break;
      }
    }
    if (commentIdx !== -1) line = line.substring(0, commentIdx).trim();
    if (!line) continue;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i]!;
      if (inStr) {
        if (ch === inStr && line[i - 1] !== "\\") inStr = false;
      } else if (ch === '"' || ch === "'") {
        inStr = ch;
      } else if (ch === "(" || ch === "[") {
        parenDepth++;
      } else if (ch === ")" || ch === "]") {
        parenDepth = Math.max(0, parenDepth - 1);
      }
    }

    pending = pending ? `${pending} ${line}` : line;
    const isCont = /(?:[,+\-*/?:=]|=>)$/.test(line);
    if (parenDepth === 0 && !isCont) {
      out.push(pending);
      pending = "";
    }
  }
  if (pending) out.push(pending);
  return out;
}

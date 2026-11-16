import { PineTS, Indicator } from "pinets";
import type { CandleData, IndicatorPoint } from "../indicators/types";
import type { PineEvaluationResult, PinePlot, PineFill } from "./types";
import { extractPineDrawings, extractPineTables } from "./pineTSExtractors";
import { migratePineSource } from "./pineMigrator";

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
  return cleaned;
}

const pineEvaluationCache = new Map<string, PineEvaluationResult>();
const MAX_CACHE_ENTRIES = 16;

export async function runPineTS(
  candles: CandleData[],
  code: string,
  customInputs: Record<string, any> = {},
): Promise<PineEvaluationResult | null> {
  if (!candles || candles.length === 0 || !code) return null;

  const lastTime = candles[candles.length - 1]?.time ?? 0;
  const cacheKey = `${code.length}_${code.slice(0, 40)}_${JSON.stringify(customInputs)}_${candles.length}_${lastTime}`;
  const cached = pineEvaluationCache.get(cacheKey);
  if (cached) return cached;

  try {
    const cleanCode = sanitizePineCode(code);
    const pinetsCandles = candles.map((c, i) => {
      const ms = c.time > 1e11 ? c.time : c.time * 1000;
      const nextMs = i < candles.length - 1
        ? (candles[i + 1]!.time > 1e11 ? candles[i + 1]!.time : candles[i + 1]!.time * 1000)
        : (candles.length > 1 ? ms + (ms - (candles[i - 1]!.time > 1e11 ? candles[i - 1]!.time : candles[i - 1]!.time * 1000)) : ms + 3600000);
      return { openTime: ms, closeTime: nextMs, time: ms, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume ?? 0 };
    });

    const p = new PineTS(pinetsCandles);
    await p.ready();

    const ind = new Indicator(cleanCode);
    const meta = ind.getInputsMeta() || [];
    for (const m of meta) {
      let val: any = undefined;
      if (m.varId && customInputs[m.varId] !== undefined) val = customInputs[m.varId];
      else if (m.name && customInputs[m.name] !== undefined) val = customInputs[m.name];
      else if (m.id && customInputs[m.id] !== undefined) val = customInputs[m.id];
      else if (m.title && customInputs[m.title] !== undefined) val = customInputs[m.title];
      if (val !== undefined) {
        if (m.type === "int") ind.inputs[m.id] = parseInt(String(val), 10);
        else if (m.type === "float") ind.inputs[m.id] = parseFloat(String(val));
        else if (m.type === "bool") ind.inputs[m.id] = typeof val === "boolean" ? val : String(val).toLowerCase() === "true";
        else ind.inputs[m.id] = val;
      }
    }

    const ctx = await p.run(ind);
    if (!ctx || !ctx.plots) return null;

    const { boxes, lines, labels, polylines } = extractPineDrawings(ctx);

    const plots: PinePlot[] = [], fills: PineFill[] = [], plotMap = new Map<string, any>();
    for (const [key, pObj] of Object.entries(ctx.plots)) {
      if (key.startsWith("__") || !pObj) continue;
      plotMap.set(key, pObj);
      const title = (pObj as any).title || key;
      plotMap.set(title, pObj);
      if ((pObj as any)._plotKey) plotMap.set((pObj as any)._plotKey, pObj);
      if ((pObj as any)._callsiteId) plotMap.set((pObj as any)._callsiteId, pObj);

      const pStyle = (pObj as any).options?.style, plotData = (pObj as any).data || [];
      if (pStyle === "candle") {
        for (let i = 0; i < plotData.length; i++) {
          const pt = plotData[i], val = pt?.value, col = pt?.options?.color || (pObj as any).options?.color;
          if (Array.isArray(val) && val.length === 4 && typeof col === "string" && col && !["na", "#00000000", "transparent"].includes(col) && !col.endsWith("00")) {
            const o = Number(val[0]), h = Number(val[1]), l = Number(val[2]), c = Number(val[3]);
            if (!isNaN(o) && !isNaN(h) && !isNaN(l) && !isNaN(c)) boxes.push({ id: `cdl_${key}_${i}`, left: i, right: i, top: Math.max(o, h, l, c), bottom: Math.min(o, h, l, c), bgColor: col });
          }
        }
        continue;
      }
      if (pStyle === "fill") continue;
      if (pStyle === "shape") {
        const shpType = String((pObj as any).options?.shape || "").toLowerCase();
        const isLabel = shpType.includes("label");
        const defSymbol = shpType.includes("diamond") ? "◆"
          : shpType.includes("circle") ? "●"
          : shpType.includes("square") ? "■"
          : (shpType.includes("cross") || shpType.includes("xcross")) ? "✖"
          : (shpType.includes("triangleup") || shpType.includes("up")) ? "▲"
          : (shpType.includes("triangledown") || shpType.includes("down")) ? "▼"
          : "◆";
        const loc = String((pObj as any).options?.location || "").toLowerCase();
        const sty = (loc.includes("above") || shpType.includes("down")) ? "down"
          : (loc.includes("below") || shpType.includes("up")) ? "up"
          : "center";
        const isForceOverlay = Boolean((pObj as any).options?.force_overlay || (pObj as any).options?.overlay);

        for (let i = 0; i < plotData.length; i++) {
          const pt = plotData[i], val = Number(pt?.value);
          if (!isNaN(val)) {
            const txt = pt?.options?.text || (isLabel ? ((pObj as any).title || "●") : defSymbol);
            const col = pt?.options?.color || (pObj as any).options?.color || "#2962ff";
            const txtCol = pt?.options?.textcolor || (pObj as any).options?.textcolor || (isLabel ? "#ffffff" : col);
            labels.push({
              id: `shp_${key}_${i}`,
              x: i,
              y: val,
              text: txt,
              color: txtCol,
              bgColor: isLabel ? col : undefined,
              style: sty,
              size: pt?.options?.size || (pObj as any).options?.size || "small",
              forceOverlay: isForceOverlay,
            });
          }
        }
        continue;
      }

      const values: IndicatorPoint[] = [];
      for (let i = 0; i < plotData.length; i++) {
        const pt = plotData[i], c = candles[i];
        if (c && pt && pt.value !== undefined && !isNaN(Number(pt.value))) {
          values.push({ time: c.time, value: Number(pt.value), color: typeof pt?.options?.color === "string" ? pt.options.color : undefined });
        }
      }

      const displayOpt = (pObj as any).options?.display;
      const isDisplayNone = displayOpt === "none" || displayOpt === 0 || (pObj as any).displayNone === true;
      const isRef = title === "Reference Price" || /init_value/i.test(key);
      const rawSty = String((pObj as any).options?.style || "").toLowerCase();
      const pSty = rawSty.includes("column") ? "columns"
        : rawSty.includes("hist") ? "histogram"
        : rawSty.includes("area") ? "area"
        : rawSty.includes("step") ? "stepline"
        : rawSty.includes("circle") ? "circles"
        : rawSty.includes("cross") ? "cross"
        : undefined;

      plots.push({
        id: key, title, color: (pObj as any).options?.color || (isRef ? "#787b86" : "#2962ff"),
        lineWidth: (pObj as any).options?.linewidth || (isRef ? 1 : 1.5), values, displayNone: isDisplayNone,
        style: pSty, forceOverlay: Boolean((pObj as any).options?.force_overlay || (pObj as any).options?.overlay),
      });
    }

    for (const [key, pObj] of Object.entries(ctx.plots)) {
      if ((pObj as any)?.options?.style !== "fill") continue;
      const p1 = plotMap.get((pObj as any).options?.plot1 || (pObj as any).plot1);
      const p2 = plotMap.get((pObj as any).options?.plot2 || (pObj as any).plot2);
      const fillPoints: { time: number; top: number; bottom: number; color?: string }[] = [];
      for (let i = 0; i < candles.length; i++) {
        const pt = (pObj as any).data?.[i];
        let top = Number(pt?.options?.top_value), bottom = Number(pt?.options?.bottom_value);
        if (isNaN(top) || isNaN(bottom)) {
          const v1 = Number(p1?.data?.[i]?.value), v2 = Number(p2?.data?.[i]?.value);
          if (!isNaN(v1) && !isNaN(v2)) { top = Math.max(v1, v2); bottom = Math.min(v1, v2); }
        }
        const fCol = pt?.options?.top_color || pt?.options?.color || (pObj as any).options?.color;
        const c = candles[i];
        if (c && !isNaN(top) && !isNaN(bottom) && typeof fCol === "string" && fCol && !["na", "#00000000"].includes(fCol) && !fCol.endsWith("00")) {
          fillPoints.push({ index: i, time: c.time, top: Math.max(top, bottom), bottom: Math.min(top, bottom), color: fCol } as any);
        }
      }
      if (fillPoints.length > 0) {
        fills.push({ id: `fill_${key}`, topColor: (pObj as any).options?.color || "rgba(8, 153, 129, 0.25)", bottomColor: (pObj as any).options?.color || "rgba(8, 153, 129, 0.25)", points: fillPoints });
      }
    }

    const tables = extractPineTables(ctx);
    const result: PineEvaluationResult = { plots, hlines: [], boxes, lines, labels, polylines, fills, tables };

    if (pineEvaluationCache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = pineEvaluationCache.keys().next().value;
      if (oldestKey) pineEvaluationCache.delete(oldestKey);
    }
    pineEvaluationCache.set(cacheKey, result);

    return result;
  } catch (err) {
    console.warn("[PineTSRunner] PineTS execution fallback:", err);
    return null;
  }
}

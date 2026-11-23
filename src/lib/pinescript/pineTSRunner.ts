import { PineTS, Indicator } from "pinets";
import type { CandleData } from "../indicators/types";
import type { PineEvaluationResult } from "./types";
import { sanitizePineCode, boostPineHeader } from "./pineSanitizer";
import { extractPineDrawings, extractPineTables } from "./pineTSExtractors";
import type { PineWorkerRequest, PineWorkerResponse } from "./pineWorker";

export { sanitizePineCode, boostPineHeader };

const pineEvaluationCache = new Map<string, PineEvaluationResult>();
let pineWorkerInstance: Worker | null = null;
const pendingWorkerRequests = new Map<string, { resolve: (val: any) => void; timer: any }>();

function getPineWorker(): Worker | null {
  if (typeof window === "undefined" || typeof Worker === "undefined") return null;
  if (!pineWorkerInstance) {
    try {
      pineWorkerInstance = new Worker(new URL("./pineWorker.ts", import.meta.url), { type: "module" });
      pineWorkerInstance.onmessage = (e: MessageEvent<PineWorkerResponse>) => {
        const { id, result, error } = e.data;
        const pending = pendingWorkerRequests.get(id);
        if (pending) {
          clearTimeout(pending.timer);
          pendingWorkerRequests.delete(id);
          if (error) console.warn("[PineWorker] Script error:", error);
          pending.resolve(result);
        }
      };
      pineWorkerInstance.onerror = (err) => {
        console.error("[PineWorker] Uncaught worker error:", err);
        for (const [, p] of pendingWorkerRequests) {
          clearTimeout(p.timer);
          p.resolve(null);
        }
        pendingWorkerRequests.clear();
        try { pineWorkerInstance?.terminate(); } catch {}
        pineWorkerInstance = null;
      };
    } catch (e) {
      console.warn("[PineWorker] Failed to initialize worker, falling back to main thread:", e);
      pineWorkerInstance = null;
    }
  }
  return pineWorkerInstance;
}

export async function runPineTS(
  candles: CandleData[],
  code: string,
  customInputs: Record<string, any> = {},
): Promise<PineEvaluationResult | null> {
  if (!candles || candles.length === 0 || !code) return null;

  const firstClose = candles[0]?.close ?? 0;
  const firstTime = candles[0]?.time ?? 0;
  const lastTime = candles[candles.length - 1]?.time ?? 0;
  const cacheKey = `${code.length}_${code.slice(0, 40)}_${JSON.stringify(customInputs)}_${firstTime}_${firstClose}_${candles.length}_${lastTime}`;
  const cached = pineEvaluationCache.get(cacheKey);
  if (cached) return cached;

  const worker = getPineWorker();
  if (worker) {
    const reqId = `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const result = await new Promise<PineEvaluationResult | null>((resolve) => {
      const timer = setTimeout(() => {
        pendingWorkerRequests.delete(reqId);
        resolve(null);
      }, 30000);
      pendingWorkerRequests.set(reqId, { resolve, timer });
      worker.postMessage({ id: reqId, candles, code, customInputs } satisfies PineWorkerRequest);
    });
    if (result) {
      if (pineEvaluationCache.size > 32) pineEvaluationCache.clear();
      pineEvaluationCache.set(cacheKey, result);
    }
    return result;
  }

  // In the real browser with Worker, never execute heavy PineTS AST on the main thread to prevent UI freezing
  if (typeof window !== "undefined" && typeof Worker !== "undefined") {
    return null;
  }

  // Fallback for tests/Node environment without Worker
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
    const plots: any[] = [], fills: any[] = [], plotMap = new Map<string, any>();
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
            if (!isNaN(o) && !isNaN(h) && !isNaN(l) && !isNaN(c)) {
              boxes.push({ id: `cdl_${key}_${i}`, left: i, right: i, top: Math.max(o, h, l, c), bottom: Math.min(o, h, l, c), bgColor: col });
            }
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
          if (!isNaN(val) && val !== 0 && (pt?.value as any) !== false) {
            const c = candles[i];
            let y = val;
            if (c) {
              if (loc.includes("above") || sty === "down") y = c.high;
              else if (loc.includes("below") || sty === "up") y = c.low;
              else if (val === 1 || val === -1) y = val > 0 ? c.high : c.low;
            }
            const txt = pt?.options?.text || (isLabel ? ((pObj as any).title || "●") : defSymbol);
            const col = pt?.options?.color || (pObj as any).options?.color || "#2962ff";
            const txtCol = pt?.options?.textcolor || (pObj as any).options?.textcolor || (isLabel ? "#ffffff" : col);
            labels.push({
              id: `shp_${key}_${i}`,
              x: i,
              y,
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

      const values: any[] = [];
      for (let i = 0; i < plotData.length; i++) {
        const pt = plotData[i], c = candles[i];
        if (c && pt && pt.value !== undefined && !isNaN(Number(pt.value))) {
          values.push({ time: c.time, value: Number(pt.value), color: typeof pt?.options?.color === "string" ? pt.options.color : undefined });
        }
      }

      const displayOpt = (pObj as any).options?.display;
      const isDisplayNone = displayOpt === "none" || displayOpt === 0 || (pObj as any).displayNone === true;
      const rawSty = String((pObj as any).options?.style || "").toLowerCase();
      const pSty = rawSty.includes("column") ? "columns"
        : rawSty.includes("hist") ? "histogram"
        : rawSty.includes("area") ? "area"
        : rawSty.includes("step") ? "stepline" : "line";

      plots.push({
        id: (pObj as any)._plotKey || (pObj as any)._callsiteId || key,
        title,
        color: (pObj as any).options?.color || "#2962ff",
        lineWidth: Number((pObj as any).options?.linewidth) || 1.5,
        values,
        displayNone: isDisplayNone,
        style: pSty,
        forceOverlay: Boolean((pObj as any).options?.force_overlay || (pObj as any).options?.overlay),
      });
    }

    const rawLineFills = ctx.plots.__linefills__?.data?.[0]?.value || [];
    for (const lf of rawLineFills) {
      if (lf._deleted) continue;
      const p1 = plotMap.get(lf.plot1), p2 = plotMap.get(lf.plot2);
      if (!p1 || !p2) continue;
      const d1 = p1.data || [], d2 = p2.data || [];
      const pts: { time: number; top: number; bottom: number; color?: string }[] = [];
      for (let i = 0; i < Math.min(d1.length, d2.length); i++) {
        const c = candles[i], v1 = Number(d1[i]?.value), v2 = Number(d2[i]?.value);
        if (c && !isNaN(v1) && !isNaN(v2)) {
          pts.push({ time: c.time, top: Math.max(v1, v2), bottom: Math.min(v1, v2) });
        }
      }
      if (pts.length > 1) {
        fills.push({ id: `fill_${lf.id}`, plot1Id: lf.plot1, plot2Id: lf.plot2, topColor: lf.color || "rgba(41, 98, 255, 0.2)", bottomColor: lf.color || "rgba(41, 98, 255, 0.2)", points: pts });
      }
    }

    const hasFillDirective = /fill\s*\(/i.test(code);
    if (fills.length === 0 && hasFillDirective && plots.length >= 2) {
      const p1 = plots[0]!, p2 = plots[1]!;
      const vMap1 = new Map<number, number>(p1.values.map((v: any) => [v.time, v.value]));
      const pts: { time: number; top: number; bottom: number; color?: string }[] = [];
      for (const pt2 of p2.values) {
        const val1 = vMap1.get(pt2.time);
        if (typeof val1 === "number" && !isNaN(val1) && !isNaN(pt2.value)) {
          const isBull = val1 >= pt2.value;
          pts.push({
            time: pt2.time,
            top: Math.max(val1, pt2.value),
            bottom: Math.min(val1, pt2.value),
            color: isBull ? "rgba(0, 230, 15, 0.22)" : "rgba(128, 0, 11, 0.22)",
          });
        }
      }
      if (pts.length > 1) {
        fills.push({ id: `fill_${p1.id}_${p2.id}`, topColor: "rgba(0, 230, 15, 0.22)", bottomColor: "rgba(128, 0, 11, 0.22)", points: pts });
      }
    }

    const tables = extractPineTables(ctx);
    const result: PineEvaluationResult = { plots, hlines: [], polylines, fills, boxes, lines, labels, tables };
    if (pineEvaluationCache.size > 32) pineEvaluationCache.clear();
    pineEvaluationCache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.warn("[runPineTS] Evaluation fallback error:", err);
    return null;
  }
}

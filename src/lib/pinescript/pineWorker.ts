import { PineTS, Indicator } from "pinets";
import { extractPineDrawings, extractPineTables } from "./pineTSExtractors.ts";
import { sanitizePineCode } from "./pineSanitizer.ts";
import { parsePineScript } from "./parser.ts";
import { evaluatePineScript } from "./evaluator.ts";
import type { CandleData, IndicatorPoint } from "../indicators/types.ts";
import type { PineEvaluationResult, PinePlot, PineFill } from "./types.ts";

export interface PineWorkerRequest {
  id: string;
  candles: CandleData[];
  code: string;
  customInputs: Record<string, any>;
}

export interface PineWorkerResponse {
  id: string;
  result: PineEvaluationResult | null;
  error?: string;
}

self.onmessage = async (e: MessageEvent<PineWorkerRequest>) => {
  const { id, candles, code, customInputs } = e.data;
  if (!candles || candles.length === 0 || !code) {
    self.postMessage({ id, result: null } satisfies PineWorkerResponse);
    return;
  }

  try {
    const cleanCode = sanitizePineCode(code);
    const parsed = parsePineScript(cleanCode);

    // Fast-path specialized simulation engines in worker thread
    if (
      parsed.hasForecastPolyline ||
      /method\s+forecast/i.test(cleanCode) ||
      parsed.isLiquiditySwings ||
      parsed.isLiquiditySweeps
    ) {
      const legacyRes = evaluatePineScript(candles, parsed, customInputs);
      self.postMessage({ id, result: legacyRes } satisfies PineWorkerResponse);
      return;
    }

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
    if (!ctx || !ctx.plots) {
      const fallback = evaluatePineScript(candles, parsed, customInputs);
      self.postMessage({ id, result: fallback } satisfies PineWorkerResponse);
      return;
    }

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

      const values: IndicatorPoint[] = [];
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

    if (fills.length === 0 && parsed.fills.length > 0 && plots.length >= 2) {
      const p1 = plots[0]!, p2 = plots[1]!;
      const vMap1 = new Map<number, number>(p1.values.map((v) => [v.time, v.value]));
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
    self.postMessage({
      id,
      result: { plots, hlines: [], polylines, fills, boxes, lines, labels, tables },
    } satisfies PineWorkerResponse);
  } catch (err: any) {
    try {
      const cleanCode = sanitizePineCode(code);
      const parsed = parsePineScript(cleanCode);
      const fallback = evaluatePineScript(candles, parsed, customInputs);
      self.postMessage({ id, result: fallback } satisfies PineWorkerResponse);
    } catch (fallbackErr: any) {
      self.postMessage({ id, result: null, error: err?.message || String(err) } satisfies PineWorkerResponse);
    }
  }
};

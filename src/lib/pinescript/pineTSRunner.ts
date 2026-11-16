import { PineTS, Indicator } from "pinets";
import type { CandleData, IndicatorPoint } from "../indicators/types";
import type { PineEvaluationResult, PineBox, PineLine, PineLabel, PinePlot, PinePolyline, PineFill } from "./types";

export function sanitizePineCode(code: string): string {
  let cleaned = code.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-zA-Z0-9_-]*\r?\n/, "").replace(/\r?\n```$/, "");
  }
  // Strip trailing non-code text after closing Pine comment blocks if user pasted notes
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
  // TradingView Pine Script barstate.isconfirmed is true on historical bars.
  // In pinets, barstate.isconfirmed defaults to false across history, so we evaluate it true for historical calculation.
  cleaned = cleaned.replace(/\bbarstate\.isconfirmed\b/g, "(barstate.isconfirmed or barstate.ishistory or true)");

  // Provide realistic mintick default (pinets does not set syminfo.mintick)
  cleaned = cleaned.replace(/\bsyminfo\.mintick\b/g, "0.01");

  // Replace request.security_lower_tf(sym, tf, fn()) with fn()
  cleaned = cleaned.replace(
    /request\.security_lower_tf\s*\([^,]+,[^,]+,\s*([a-zA-Z_]\w*\(\))\s*\)/g,
    "$1",
  );
  // Replace standalone request.security_lower_tf calls
  cleaned = cleaned.replace(
    /\[\s*([a-zA-Z_]\w*)\s*,\s*([a-zA-Z_]\w*)\s*,\s*([a-zA-Z_]\w*)\s*\]\s*=\s*request\.security_lower_tf\s*\([^)]*\)/g,
    "$1 = high, $2 = low, $3 = volume",
  );
  return cleaned;
}

export async function runPineTS(
  candles: CandleData[],
  code: string,
  customInputs: Record<string, any> = {},
): Promise<PineEvaluationResult | null> {
  if (!candles || candles.length === 0 || !code) return null;

  try {
    const cleanCode = sanitizePineCode(code);
    const pinetsCandles = candles.map((c) => ({
      time: c.time > 1e11 ? c.time : c.time * 1000,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume ?? 0,
    }));

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

    // 1. Boxes - filter out deleted, invisible or na boxes
    const rawBoxes = ctx.plots.__boxes__?.data?.[0]?.value || [];
    const boxes: PineBox[] = (Array.isArray(rawBoxes) ? rawBoxes : [])
      .filter((b: any) => !b._deleted)
      .map((b: any, idx: number) => {
        const bg = typeof b.bgcolor === "string" && b.bgcolor && b.bgcolor !== "na" && b.bgcolor !== "#00000000" && b.bgcolor !== "transparent" ? b.bgcolor : undefined;
        const border = typeof b.border_color === "string" && b.border_color && b.border_color !== "na" && b.border_color !== "#00000000" && isNaN(Number(b.border_color)) ? b.border_color : undefined;
        return {
          id: `bx_${b.id ?? idx}`,
          left: Number(b.left),
          top: Number(b.top),
          right: Number(b.right),
          bottom: Number(b.bottom),
          bgColor: bg,
          borderColor: border,
          borderWidth: Number(b.border_width) || 1,
        };
      })
      .filter((b) => b.bgColor || (b.borderColor && b.borderWidth));

    // 2. Lines - ONLY render lines that have valid visible color
    const rawLines = ctx.plots.__lines__?.data?.[0]?.value || [];
    const lines: PineLine[] = (Array.isArray(rawLines) ? rawLines : [])
      .filter((l: any) => !l._deleted && l.color && l.color !== "na" && l.color !== "#00000000" && l.color !== "transparent")
      .map((l: any, idx: number) => ({
        id: `ln_${l.id ?? idx}`,
        x1: Number(l.x1),
        y1: Number(l.y1),
        x2: Number(l.x2),
        y2: Number(l.y2),
        color: l.color,
        width: Number(l.width) || 1,
        style: String(l.style).includes("dashed") ? "dashed" : String(l.style).includes("dotted") ? "dotted" : "solid",
      }));

    // 3. Labels - map color (badge), textcolor, size, and style
    const rawLabels = ctx.plots.__labels__?.data?.[0]?.value || [];
    const labels: PineLabel[] = (Array.isArray(rawLabels) ? rawLabels : [])
      .filter((l: any) => !l._deleted && l.text !== undefined && String(l.text).trim() !== "")
      .map((l: any, idx: number) => {
        const hasBg = typeof l.color === "string" && l.color && l.color !== "na" && l.color !== "#00000000" && !l.color.endsWith("00");
        const txtCol = typeof l.textcolor === "string" && l.textcolor && l.textcolor !== "na" && l.textcolor !== "#00000000"
          ? l.textcolor
          : hasBg ? "#ffffff" : "#b2b5be";
        const sty = l.style === "style_label_down" ? "down" : l.style === "style_label_up" ? "up" : "center";
        return {
          id: `lbl_${l.id ?? idx}`,
          x: Number(l.x),
          y: Number(l.y),
          text: String(l.text || ""),
          color: txtCol,
          bgColor: hasBg ? l.color : undefined,
          style: sty,
          size: l.size || "normal",
        };
      });

    // 4. Polylines
    const rawPolys = ctx.plots.__polylines__?.data?.[0]?.value || [];
    const polylines: PinePolyline[] = (Array.isArray(rawPolys) ? rawPolys : [])
      .filter((poly: any) => !poly._deleted && Array.isArray(poly.points))
      .map((poly: any, idx: number) => ({
        id: `poly_${poly.id ?? idx}`,
        points: poly.points.map((pt: any) => ({
          index: Number(pt.x ?? pt.index ?? 0),
          price: Number(pt.y ?? pt.price ?? 0),
        })),
        lineColor: typeof poly.line_color === "string" ? poly.line_color : undefined,
        fillColor: typeof poly.fill_color === "string" ? poly.fill_color : undefined,
        lineWidth: Number(poly.line_width) || 1.5,
      }));

    // 5. Plots, Candles & Fills
    const plots: PinePlot[] = [];
    const fills: PineFill[] = [];
    const plotMap = new Map<string, any>();

    for (const [key, pObj] of Object.entries(ctx.plots)) {
      if (key.startsWith("__") || !pObj) continue;
      plotMap.set(key, pObj);
      const title = (pObj as any).title || key;
      plotMap.set(title, pObj);
      if ((pObj as any)._plotKey) plotMap.set((pObj as any)._plotKey, pObj);
      if ((pObj as any)._callsiteId) plotMap.set((pObj as any)._callsiteId, pObj);

      const pStyle = (pObj as any).options?.style;
      const plotData = (pObj as any).data || [];

      // A. Candle plots -> map to bar-level boxes for corridor/footprint rendering
      if (pStyle === "candle") {
        for (let i = 0; i < plotData.length; i++) {
          const pt = plotData[i];
          const val = pt?.value;
          const col = pt?.options?.color || (pObj as any).options?.color;
          if (Array.isArray(val) && val.length === 4 && typeof col === "string" && col && col !== "na" && col !== "#00000000" && !col.endsWith("00")) {
            const o = Number(val[0]), h = Number(val[1]), l = Number(val[2]), c = Number(val[3]);
            if (!isNaN(o) && !isNaN(h) && !isNaN(l) && !isNaN(c)) {
              boxes.push({
                id: `cdl_${key}_${i}`,
                left: i,
                right: i,
                top: Math.max(o, h, l, c),
                bottom: Math.min(o, h, l, c),
                bgColor: col,
              });
            }
          }
        }
        continue;
      }

      // B. Fill plots -> processed below once plotMap is populated
      if (pStyle === "fill") continue;

      // C. Standard curve / line / histogram plots
      const values: IndicatorPoint[] = [];
      for (let i = 0; i < plotData.length; i++) {
        const pt = plotData[i];
        const c = candles[i];
        if (c && pt && pt.value !== undefined && !isNaN(Number(pt.value))) {
          values.push({ time: c.time, value: Number(pt.value) });
        }
      }

      const displayOpt = (pObj as any).options?.display;
      const isDisplayNone =
        displayOpt === "none" ||
        displayOpt === 0 ||
        (pObj as any).displayNone === true;

      const isRef = title === "Reference Price" || /init_value/i.test(key);

      plots.push({
        id: key,
        title,
        color: (pObj as any).options?.color || (isRef ? "#787b86" : "#2962ff"),
        lineWidth: (pObj as any).options?.linewidth || (isRef ? 1 : 1.5),
        values,
        displayNone: isDisplayNone,
      });
    }

    // Process fills between series
    for (const [key, pObj] of Object.entries(ctx.plots)) {
      if ((pObj as any)?.options?.style !== "fill") continue;
      const p1Key = (pObj as any).options?.plot1 || (pObj as any).plot1;
      const p2Key = (pObj as any).options?.plot2 || (pObj as any).plot2;
      const p1 = plotMap.get(p1Key);
      const p2 = plotMap.get(p2Key);

      const fillPoints: { time: number; top: number; bottom: number; color?: string }[] = [];
      const len = candles.length;
      for (let i = 0; i < len; i++) {
        const pt = (pObj as any).data?.[i];
        let top = Number(pt?.options?.top_value);
        let bottom = Number(pt?.options?.bottom_value);
        if (isNaN(top) || isNaN(bottom)) {
          const v1 = Number(p1?.data?.[i]?.value);
          const v2 = Number(p2?.data?.[i]?.value);
          if (!isNaN(v1) && !isNaN(v2)) {
            top = Math.max(v1, v2);
            bottom = Math.min(v1, v2);
          }
        }
        const fCol = pt?.options?.top_color || pt?.options?.color || (pObj as any).options?.color;
        const c = candles[i];
        if (c && !isNaN(top) && !isNaN(bottom) && typeof fCol === "string" && fCol && fCol !== "na" && fCol !== "#00000000" && !fCol.endsWith("00")) {
          fillPoints.push({
            time: c.time,
            top: Math.max(top, bottom),
            bottom: Math.min(top, bottom),
            color: fCol,
          });
        }
      }

      if (fillPoints.length > 0) {
        fills.push({
          id: `fill_${key}`,
          topColor: (pObj as any).options?.color || "rgba(8, 153, 129, 0.25)",
          bottomColor: (pObj as any).options?.color || "rgba(8, 153, 129, 0.25)",
          points: fillPoints,
        });
      }
    }

    return {
      plots,
      hlines: [],
      boxes,
      lines,
      labels,
      polylines,
      fills,
    };
  } catch (err) {
    console.warn("[PineTSRunner] PineTS execution fallback:", err);
    return null;
  }
}

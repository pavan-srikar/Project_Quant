import type { IChartApi, ISeriesApi } from "lightweight-charts";
import { LineStyle, LineType } from "lightweight-charts";
import type { PineEvaluationResult, PineTable } from "../../lib/pinescript/types.ts";
import { PineRendererPrimitive } from "../../lib/chart-plugins/pine-primitive";
import type { CandleData } from "../../lib/indicators/types.ts";

export interface ApplyPineResultParams {
  type: string;
  isOverlay: boolean;
  curSettings: any;
  cacheKey: string;
  evalRes: PineEvaluationResult;
  indCandles: CandleData[];
  chart: IChartApi;
  candleSeries: ISeriesApi<"Candlestick">;
  setOrAdd: (
    key: string,
    values: { time: number; value: number }[],
    opts: any,
    dataKey?: string,
  ) => void;
  pinePrimitivesRef: React.MutableRefObject<Map<string, PineRendererPrimitive>>;
  hadForecastRef: React.MutableRefObject<boolean>;
  tablesAcc: PineTable[];
}

export function applyPineEvaluationResult({
  type,
  isOverlay,
  curSettings,
  cacheKey,
  evalRes,
  indCandles,
  chart,
  candleSeries,
  setOrAdd,
  pinePrimitivesRef,
  hadForecastRef,
  tablesAcc,
}: ApplyPineResultParams): void {
  if (isOverlay) {
    evalRes.plots.forEach((plot: any) => {
      if (plot.displayNone || plot.forceOverlay === false) return;
      const isRef = /reference/i.test(plot.title) || /init_value/i.test(plot.id) || /init_value/i.test(plot.title);
      if (curSettings?.plotVisibility?.[plot.id] === false || curSettings?.plotVisibility?.[plot.title] === false) return;
      const pColor = curSettings?.plotColors?.[plot.id] ?? curSettings?.plotColors?.[plot.title] ?? (isRef ? "#787b86" : plot.color);
      const pWidth = curSettings?.plotLineWidths?.[plot.id] ?? curSettings?.plotLineWidths?.[plot.title] ?? (isRef ? 1 : ((plot.lineWidth as any) || 1.5));
      const pStyle = curSettings?.plotStyles?.[plot.id] ?? curSettings?.plotStyles?.[plot.title];
      const lineStyle = pStyle === "dashed" ? LineStyle.Dashed : pStyle === "dotted" ? LineStyle.Dotted : pStyle === "solid" ? LineStyle.Solid : (isRef ? LineStyle.Dashed : LineStyle.Solid);
      setOrAdd(`${type}_${plot.id}`, plot.values, {
        color: pColor, lineWidth: pWidth, lineStyle, lineType: isRef ? LineType.WithSteps : LineType.Simple,
        priceScaleId: "right", priceLineVisible: Boolean(curSettings?.labelsOnPriceScale),
        lastValueVisible: (curSettings?.labelsOnPriceScale !== false) && !isRef,
      }, `${cacheKey}_${plot.id}`);
    });
  }

  const targetBoxes = (isOverlay ? evalRes.boxes : evalRes.boxes?.filter((b: any) => b.forceOverlay)) || [];
  const targetLines = (isOverlay ? evalRes.lines : evalRes.lines?.filter((l: any) => l.forceOverlay)) || [];
  const targetLabels = (isOverlay ? evalRes.labels : evalRes.labels?.filter((l: any) => l.forceOverlay)) || [];
  const targetPolys = isOverlay ? (evalRes.polylines || []) : [];
  const targetFills = isOverlay ? (evalRes.fills || []) : [];
  const showPolys = curSettings?.showPolylines !== false, showFills = curSettings?.showFills !== false;
  const showBoxes = curSettings?.showBoxes !== false, showLines = curSettings?.showLines !== false, showLabels = curSettings?.showLabels !== false;
  const hasData = (targetPolys.length > 0 && showPolys) || (targetFills.length > 0 && showFills) || (targetBoxes.length > 0 && showBoxes) || (targetLines.length > 0 && showLines) || (targetLabels.length > 0 && showLabels);

  if (hasData) {
    let prim = pinePrimitivesRef.current.get(type);
    if (!prim) {
      prim = new PineRendererPrimitive();
      candleSeries.attachPrimitive(prim);
      pinePrimitivesRef.current.set(type, prim);
    }
    prim.updateData(
      showPolys ? targetPolys : [], showFills ? targetFills : [],
      showBoxes ? targetBoxes : [], showLines ? targetLines : [],
      showLabels ? targetLabels : [],
    );

    if (targetPolys.length > 0 && !hadForecastRef.current) {
      hadForecastRef.current = true;
      const ts = chart.timeScale();
      const fcastBars = Math.min(80, Math.max(45, (evalRes.polylines?.[0]?.points?.length ?? 50) - 1));
      ts.applyOptions({ rightOffset: fcastBars });
      const curRange = ts.getVisibleLogicalRange(), span = curRange ? (curRange.to - curRange.from) : 80;
      if (!curRange || (curRange.to >= indCandles.length - 5 && curRange.to < indCandles.length + 20)) {
        const newTo = indCandles.length + fcastBars;
        ts.setVisibleLogicalRange({ from: Math.max(0, newTo - span), to: newTo });
      }
    }
  } else {
    const prim = pinePrimitivesRef.current.get(type);
    if (prim) {
      prim.updateData([], [], [], [], []);
      try { candleSeries.detachPrimitive(prim); } catch {}
      pinePrimitivesRef.current.delete(type);
      try { chart.timeScale().applyOptions({}); } catch {}
    }
  }

  if (evalRes.tables && evalRes.tables.length > 0) {
    evalRes.tables.forEach((tbl: PineTable, i: number) => {
      tablesAcc.push({ ...tbl, id: `${type}_${tbl.id || i}` });
    });
  }
}

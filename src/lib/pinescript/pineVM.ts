import type { CandleData } from "../indicators/types";
import type { ParsedPineScript } from "./parser";
import type { PineBox, PineLine, PineLabel, PinePolyline, PineFill } from "./types";
import { PineDrawingHeap } from "./pineRuntime";
import { computeLiquiditySwings } from "./liquiditySwingsEngine";
import { computeLiquiditySweeps } from "./liquiditySweepsEngine";
import { computeForecastAndFills } from "./forecastEngine";

export interface PineVMOptions {
  maxBoxes?: number;
  maxLines?: number;
  maxLabels?: number;
}

export class PineVirtualMachine {
  public heap: PineDrawingHeap;

  constructor() {
    this.heap = new PineDrawingHeap();
  }

  public run(
    candles: CandleData[],
    parsed: ParsedPineScript,
    context: Record<string, any>,
  ): {
    polylines?: PinePolyline[];
    fills?: PineFill[];
    boxes?: PineBox[];
    lines?: PineLine[];
    labels?: PineLabel[];
  } {
    const n = candles.length;
    let polylines: PinePolyline[] | undefined;
    let fills: PineFill[] | undefined;
    let boxes: PineBox[] | undefined;
    let lines: PineLine[] | undefined;
    let labels: PineLabel[] | undefined;

    // 1. Forecast & Polylines VM runtime
    if (parsed.hasForecastPolyline || (parsed.fills.length > 0 && /forecast/i.test(parsed.title || ""))) {
      const uptrend = Array.isArray(context.uptrend) ? (context.uptrend as boolean[]) : new Array(n).fill(true);
      const upInit = Array.isArray(context.uptrend_init_price) ? (context.uptrend_init_price as number[]) : (context.close as number[]);
      const dnInit = Array.isArray(context.downtrend_init_price) ? (context.downtrend_init_price as number[]) : (context.close as number[]);
      const fRes = computeForecastAndFills(candles, uptrend, upInit, dnInit, {
        maxMemory: Number(context.maxMemory) || 50,
        fcast: Number(context.fcast) || 100,
        upPer: Number(context.upPer) || 80,
        midPer: Number(context.midPer) || 50,
        dnPer: Number(context.dnPer) || 20,
        upLine: typeof context.upLine === "string" ? context.upLine : undefined,
        dnLine: typeof context.dnLine === "string" ? context.dnLine : undefined,
        upArea: typeof context.upArea === "string" ? context.upArea : undefined,
        dnArea: typeof context.dnArea === "string" ? context.dnArea : undefined,
        signalBull: typeof context.signalBull === "string" ? context.signalBull : undefined,
        signalBear: typeof context.signalBear === "string" ? context.signalBear : undefined,
        signalArea: context.signalArea !== false,
      });
      polylines = fRes.polylines;
      fills = fRes.fills;
    }

    // 2. Generic Drawing & Swings VM runtime
    if (parsed.isLiquiditySwings) {
      const swings = computeLiquiditySwings(candles, {
        length: Number(context.length) || 14,
        area: typeof context.area === "string" ? context.area : "Wick Extremity",
        filterOptions: typeof context.filterOptions === "string" ? context.filterOptions : "Count",
        filterValue: Number(context.filterValue) || 0,
        showTop: context.showTop !== false,
        topCss: typeof context.topCss === "string" ? context.topCss : undefined,
        topAreaCss: typeof context.topAreaCss === "string" ? context.topAreaCss : undefined,
        showBtm: context.showBtm !== false,
        btmCss: typeof context.btmCss === "string" ? context.btmCss : undefined,
        btmAreaCss: typeof context.btmAreaCss === "string" ? context.btmAreaCss : undefined,
      });
      boxes = swings.boxes;
      lines = swings.lines;
      labels = swings.labels;
    } else if (parsed.isLiquiditySweeps) {
      const sweeps = computeLiquiditySweeps(candles, {
        len: Number(context.len) || 5,
        opt: typeof context.opt === "string" ? context.opt : "Only Wicks",
        colBl: typeof context.colBl === "string" ? context.colBl : undefined,
        colBr: typeof context.colBr === "string" ? context.colBr : undefined,
        colBl2: typeof context.colBl2 === "string" ? context.colBl2 : undefined,
        colBr2: typeof context.colBr2 === "string" ? context.colBr2 : undefined,
        colBl3: typeof context.colBl3 === "string" ? context.colBl3 : undefined,
        colBr3: typeof context.colBr3 === "string" ? context.colBr3 : undefined,
        extend: context.extend !== false,
        maxB: Number(context.maxB) || 300,
      });
      boxes = sweeps.boxes;
      lines = sweeps.lines;
    }

    return { polylines, fills, boxes, lines, labels };
  }
}

export function executePineVM(
  candles: CandleData[],
  parsed: ParsedPineScript,
  context: Record<string, any>,
): {
  polylines?: PinePolyline[];
  fills?: PineFill[];
  boxes?: PineBox[];
  lines?: PineLine[];
  labels?: PineLabel[];
} {
  const vm = new PineVirtualMachine();
  return vm.run(candles, parsed, context);
}

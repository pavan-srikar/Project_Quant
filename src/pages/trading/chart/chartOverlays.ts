import {
  type IPriceLine,
  type ISeriesApi,
  LineStyle,
  type SeriesMarker,
  type Time,
} from "lightweight-charts";
import type { Order, Position } from "../../../services/schemas.ts";
import type { Timeframe } from "../constants.ts";
import { getCandleBucketTime } from "../utils.ts";
import type {
  ChartColors,
  OverlayOpts,
  ReplayTradeEvent,
  SlTpField,
  SlTpMap,
} from "./types.ts";

export function clearPriceLines(
  series: ISeriesApi<"Candlestick">,
  list: IPriceLine[],
): void {
  for (const pl of list) {
    try {
      series.removePriceLine(pl);
    } catch {
      /* ignore */
    }
  }
}

// One SL or TP line for a position, registered in the drag-to-edit map.
export function addSlTpLine(
  series: ISeriesApi<"Candlestick">,
  pos: Position,
  field: SlTpField,
  price: number,
  pnl: number,
  out: IPriceLine[],
  map: SlTpMap,
  colors: ChartColors,
): void {
  const isTp = field === "takeProfit";
  const line = series.createPriceLine({
    price,
    color: isTp ? colors.tpLine : colors.slLine,
    lineWidth: 2,
    lineStyle: LineStyle.Dashed,
    axisLabelVisible: true,
    title: `${isTp ? "TP" : "SL"}  ${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`,
  });
  out.push(line);
  map.set(`${pos.id}:${isTp ? "tp" : "sl"}`, {
    line,
    price,
    positionId: pos.id,
    field,
    side: pos.side,
    entryPrice: pos.entryPrice,
    quantity: pos.quantity,
  });
}

export function addPositionOverlay(
  series: ISeriesApi<"Candlestick">,
  pos: Position,
  opts: OverlayOpts,
  out: IPriceLine[],
  map: SlTpMap,
): void {
  if (pos.symbolName !== opts.symbol || !Number.isFinite(pos.entryPrice)) return;
  const entryLine = series.createPriceLine({
    price: pos.entryPrice,
    color:
      pos.side === "LONG" ? opts.colors.positionLong : opts.colors.positionShort,
    lineWidth: 1,
    lineStyle: LineStyle.Dotted,
    axisLabelVisible: true,
    title: `${pos.side === "LONG" ? "BUY" : "SELL"} ${pos.quantity.toFixed(2)} (Drag to set SL/TP)`,
  });
  out.push(entryLine);
  map.set(`${pos.id}:entry`, {
    line: entryLine,
    price: pos.entryPrice,
    positionId: pos.id,
    field: "entry",
    side: pos.side,
    entryPrice: pos.entryPrice,
    quantity: pos.quantity,
  });

  const direction = pos.side === "LONG" ? 1 : -1;
  const pnlAt = (target: number) =>
    parseFloat(
      (
        (target - pos.entryPrice) *
        direction *
        pos.quantity *
        opts.contractSize
      ).toFixed(2),
    );
  if (typeof pos.takeProfit === "number" && Number.isFinite(pos.takeProfit)) {
    addSlTpLine(
      series,
      pos,
      "takeProfit",
      pos.takeProfit,
      pnlAt(pos.takeProfit),
      out,
      map,
      opts.colors,
    );
  }
  if (typeof pos.stopLoss === "number" && Number.isFinite(pos.stopLoss)) {
    addSlTpLine(
      series,
      pos,
      "stopLoss",
      pos.stopLoss,
      pnlAt(pos.stopLoss),
      out,
      map,
      opts.colors,
    );
  }
}

export function addOrderOverlay(
  series: ISeriesApi<"Candlestick">,
  ord: Order,
  symbol: string,
  orderColor: string,
  out: IPriceLine[],
): void {
  if (
    ord.symbolName !== symbol ||
    ord.status !== "PENDING" ||
    !Number.isFinite(ord.price as number)
  ) {
    return;
  }
  out.push(
    series.createPriceLine({
      price: ord.price as number,
      color: orderColor,
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: `[P] ${ord.side} ${ord.type} ${ord.quantity}`,
    }),
  );
}

export function entryMarker(
  ev: ReplayTradeEvent,
  time: Time,
): SeriesMarker<Time> {
  const isBuy = ev.side === "BUY";
  return {
    time,
    position: isBuy ? "belowBar" : "aboveBar",
    color: isBuy ? "#2196F3" : "#FF9800",
    shape: isBuy ? "arrowUp" : "arrowDown",
    text: isBuy ? "B" : "S",
  };
}

export function exitMarker(
  ev: ReplayTradeEvent,
  time: Time,
): SeriesMarker<Time> {
  const profit = ev.pnl != null && ev.pnl >= 0;
  const text =
    ev.pnl != null
      ? `${ev.pnl >= 0 ? "+" : ""}$${Math.abs(ev.pnl).toFixed(0)}`
      : "Exit";
  return {
    time,
    position: profit ? "aboveBar" : "belowBar",
    color: profit ? "#0ecb81" : "#f6465d",
    shape: "circle",
    text,
  };
}

export function buildReplayMarker(
  ev: ReplayTradeEvent,
  timeframe: Timeframe,
): SeriesMarker<Time> | null {
  const evMs = new Date(ev.timestamp).getTime();
  if (Number.isNaN(evMs)) return null;
  const time = getCandleBucketTime(evMs, timeframe) as Time;
  if (ev.type === "entry") return entryMarker(ev, time);
  if (ev.type === "exit") return exitMarker(ev, time);
  return {
    time,
    position: "aboveBar",
    color: "#FF1744",
    shape: "square",
    text: ev.ruleCode ?? "Rule",
  };
}

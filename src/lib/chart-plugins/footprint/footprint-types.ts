import type { Time } from "lightweight-charts";

export interface FootprintLevel {
  price: number;
  sellVol: number;
  buyVol: number;
  totalVol: number;
  delta: number;
  isPoc: boolean;
  isBuyImbalance?: boolean;
  isSellImbalance?: boolean;
}

export interface FootprintBar {
  time: Time;
  timeSec: number;
  open: number;
  high: number;
  low: number;
  close: number;
  totalVolume: number;
  totalBuyVol: number;
  totalSellVol: number;
  delta: number;
  pocPrice: number;
  levels: FootprintLevel[];
}

export interface FootprintRenderData {
  bars: FootprintBar[];
  minTick: number;
}

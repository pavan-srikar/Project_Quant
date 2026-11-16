import type { IndicatorPoint } from "../indicators/types";

export interface PinePlot {
  id: string;
  title: string;
  color: string;
  lineWidth: number;
  values: IndicatorPoint[];
  displayNone?: boolean;
  style?: "columns" | "histogram" | "line" | "area" | "circles" | "cross";
}

export interface PineHLine {
  id?: string;
  price: number;
  title: string;
  color: string;
  lineStyle?: number;
}


export interface PineInputDef {
  id: string;
  type: "int" | "float" | "bool" | "string" | "color";
  defval: number | boolean | string;
  title: string;
  min?: number;
  max?: number;
  step?: number;
  group?: string;
  options?: string[];
  inline?: string;
}

export interface PinePolyline {
  id: string;
  points: { index: number; price: number; time?: number }[];
  lineColor?: string;
  fillColor?: string;
  lineWidth?: number;
}

export interface PineBox {
  id: string;
  left: number; // bar index
  top: number; // price
  right: number; // bar index
  bottom: number; // price
  bgColor?: string;
  borderColor?: string;
  borderWidth?: number;
}

export interface PineLine {
  id: string;
  x1: number; // bar index
  y1: number; // price
  x2: number; // bar index
  y2: number; // price
  color?: string;
  width?: number;
  style?: "solid" | "dashed" | "dotted";
}

export interface PineLabel {
  id: string;
  x: number; // bar index
  y: number; // price
  text: string;
  color?: string;
  style?: "up" | "down" | "center";
  bgColor?: string;
  size?: "tiny" | "small" | "normal" | "large" | "huge" | string;
}

export interface PineFill {
  id: string;
  plot1Id?: string;
  plot2Id?: string;
  topColor: string;
  bottomColor: string;
  fillColor?: string;
  points?: { time: number; top: number; bottom: number; color?: string }[];
}

export interface CustomPineIndicator {
  id: string; // e.g. "pine_172987123"
  name: string;
  code: string;
  overlay: boolean;
  color: string;
  inputs?: Record<string, any>;
  createdAt: number;
}

export interface PineEvaluationResult {
  plots: PinePlot[];
  hlines: PineHLine[];
  polylines?: PinePolyline[];
  fills?: PineFill[];
  boxes?: PineBox[];
  lines?: PineLine[];
  labels?: PineLabel[];
  error?: string;
}

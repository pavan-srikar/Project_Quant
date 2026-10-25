import type { IndicatorPoint } from "../indicators/types";

export interface PinePlot {
  id: string;
  title: string;
  color: string;
  lineWidth: number;
  values: IndicatorPoint[];
}

export interface PineHLine {
  id: string;
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
  error?: string;
}

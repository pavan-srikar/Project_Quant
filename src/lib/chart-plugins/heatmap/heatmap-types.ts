export type LeverageTier = 10 | 25 | 50 | 100;

export interface LiquidationBand {
  id: string;
  side: "long" | "short";
  leverage: LeverageTier;
  entryPrice: number;
  liqPrice: number;
  volume: number;
  startTime: number;
  endTime: number | null;
  isSwept: boolean;
}

export interface ResolvedLiquidationBand {
  band: LiquidationBand;
  startX: number;
  endX: number;
  y: number;
  height: number;
  intensity: number; // 0 to 1
}

export interface HeatmapRenderData {
  bands: ResolvedLiquidationBand[];
  minPrice: number;
  maxPrice: number;
  maxVolume: number;
}

export type HeatmapColorMap = "viridis" | "plasma" | "inferno";
export type SensitivityPreset = "high" | "medium" | "low";

export interface HeatmapSettings {
  brightness: number;
  bandHeight: number;
  minOpacity: number;
  colorMap: HeatmapColorMap;
  sensitivity: SensitivityPreset;
  thresholdRatio?: number;
  ceilingRatio?: number;
}

export interface HeatmapGridData {
  times: number[];
  minPrice: number;
  maxPrice: number;
  bucketStep: number;
  rowCount: number;
  colCount: number;
  grid: Float32Array; // row-major: col * rowCount + row
  maxVol: number;
  threshold: number;
  ceiling: number;
}

export interface HoveredHeatmapPoint {
  x: number;
  y: number;
  time: number;
  price: number;
  volume: number;
}

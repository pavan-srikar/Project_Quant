// ── Trading Page Constants ────────────────────────────────────────────────────

export const TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w"] as const;
export type Timeframe = (typeof TIMEFRAMES)[number];

/**
 * Master switch for session replay (HUD + scrubber). Disabled on the live
 * terminal until the feature is fully QA'd — flip to `true` to re-enable the
 * replay controls everywhere they mount.
 */
export const REPLAY_ENABLED = false;

export const CHART_COLORS = {
  dark: {
    background: "#0b0e14",
    text: "#9298a5",
    grid: "#151923",
    crosshair: "#555c68",
    up: "#d1d4dc",
    down: "#5d606b",
    volumeUp: "rgba(209, 212, 220, 0.4)",
    volumeDown: "rgba(93, 96, 107, 0.4)",
    bidLine: "#0ecb81",
    askLine: "#f6465d",
    bidLabelBg: "#0ecb81",
    askLabelBg: "#f6465d",
    watermark: "rgba(255, 255, 255, 0.03)",
    lastPriceUp: "#d1d4dc",
    lastPriceDown: "#5d606b",
    orderLine: "#f0b90b",
    positionLong: "#3179f5",
    positionShort: "#ec407a",
    tpLine: "#3179f5",
    slLine: "#ec407a",
  },
  light: {
    background: "#ffffff",
    text: "#5d6068",
    grid: "#f0f2f5",
    crosshair: "#999",
    up: "#d1d4dc",
    down: "#5d606b",
    volumeUp: "rgba(209, 212, 220, 0.4)",
    volumeDown: "rgba(93, 96, 107, 0.4)",
    bidLine: "#0ecb81",
    askLine: "#f6465d",
    bidLabelBg: "#0ecb81",
    askLabelBg: "#f6465d",
    watermark: "rgba(0, 0, 0, 0.03)",
    lastPriceUp: "#d1d4dc",
    lastPriceDown: "#5d606b",
    orderLine: "#f0b90b",
    positionLong: "#3179f5",
    positionShort: "#ec407a",
    tpLine: "#3179f5",
    slLine: "#ec407a",
  },
};

export type ChartColors = (typeof CHART_COLORS)["dark"];

/**
 * Per-user color overrides (Chart Settings → Colors). Empty string = use the
 * theme default. Keys map 1:1 onto `ChartColors` fields via COLOR_OVERRIDE_MAP.
 */
export interface ChartColorOverrides {
  colorBackground: string;
  colorGrid: string;
  colorScaleText: string;
  colorCrosshair: string;
  colorBidLine: string;
  colorAskLine: string;
  colorPositionLong: string;
  colorPositionShort: string;
  colorOrderLine: string;
  colorTpLine: string;
  colorSlLine: string;
  /** Candle body colors (also drive wicks/borders unless overridden). */
  candleUpColor: string;
  candleDownColor: string;
}

const COLOR_OVERRIDE_MAP: ReadonlyArray<[keyof ChartColorOverrides, keyof ChartColors]> = [
  ["colorBackground", "background"],
  ["colorGrid", "grid"],
  ["colorScaleText", "text"],
  ["colorCrosshair", "crosshair"],
  ["colorBidLine", "bidLine"],
  ["colorAskLine", "askLine"],
  ["colorPositionLong", "positionLong"],
  ["colorPositionShort", "positionShort"],
  ["colorOrderLine", "orderLine"],
  ["colorTpLine", "tpLine"],
  ["colorSlLine", "slLine"],
  ["candleUpColor", "up"],
  ["candleDownColor", "down"],
];

/** Theme colors with the user's non-empty overrides applied on top. */
export function mergeChartColors(theme: ChartColors, overrides: ChartColorOverrides): ChartColors {
  const merged = { ...theme };
  for (const [overrideKey, themeKey] of COLOR_OVERRIDE_MAP) {
    const value = overrides[overrideKey];
    if (value) merged[themeKey] = value;
  }
  return merged;
}

/**
 * Armable tools. Some are placement-only aliases that commit a different stored
 * `type`: "ray"/"extended" store a "trendline" with extend flags;
 * "long-position"/"short-position" store a "position" with `side`; "measure" is
 * a transient gesture that never commits.
 */
export type DrawingTool =
  | "none"
  | "trendline"
  | "horizontal"
  | "fibonacci"
  | "rectangle"
  | "vertical"
  | "ray"
  | "extended"
  | "channel"
  | "text"
  | "fibextension"
  | "ellipse"
  | "arrow"
  | "triangle"
  | "position"
  | "long-position"
  | "short-position"
  | "measure"
  | "fixed-range-volume-profile";

/** Stored drawing kinds (excludes placement-only aliases). */
export type DrawingType = Exclude<
  DrawingTool,
  "none" | "ray" | "extended" | "long-position" | "short-position" | "measure"
>;

export type DrawingLineStyle = "solid" | "dashed" | "dotted";

/** Magnet snapping mode: off, weak (snap within a few px), or strong (always). */
export type MagnetMode = "none" | "weak" | "strong";

export interface DrawingLine {
  id: string;
  type: DrawingType;
  price: number;
  price2?: number;
  time?: number;
  time2?: number;
  /** Third anchor — parallel-channel offset line. */
  price3?: number;
  time3?: number;
  color: string;
  // v2 style/behavior fields — all optional so v1 drawings load unchanged
  /** Line width in px (default 2). */
  width?: number;
  lineStyle?: DrawingLineStyle;
  /** Locked drawings can be selected but not moved or resized. */
  locked?: boolean;
  /** Trendline only: extend the line to the pane edges. */
  extendLeft?: boolean;
  extendRight?: boolean;
  /** Hidden drawings stay in the object tree but don't render or hit-test. */
  hidden?: boolean;
  /** Render order — higher draws on top. Defaults to creation order. */
  zIndex?: number;
  /** Timeframe the drawing was created on (used by visibility "tf"). */
  createdTf?: string;
  /** "all" (default) shows on every timeframe; "tf" only on createdTf. */
  visibility?: "all" | "tf";
  // ── Styling depth (Tier 4) ──
  /** Fill colour for shapes / channel / fib bands (defaults to `color`). */
  fillColor?: string;
  /** Fill opacity 0–1 (defaults per drawing kind). */
  fillOpacity?: number;
  /** Arrowheads on line ends (trendline / arrow). */
  arrowStart?: boolean;
  arrowEnd?: boolean;
  /** Text content + size for text/callout drawings and attachable labels. */
  text?: string;
  fontSize?: number;
  /** Bold / italic styling for text drawings. */
  bold?: boolean;
  italic?: boolean;
  /** Optional text-box background (text drawings). */
  textBg?: boolean;
  textBgColor?: string;
  /** Optional text-box border (text drawings). */
  textBorder?: boolean;
  textBorderColor?: string;
  /** Custom fibonacci levels (fractions); defaults applied when absent. */
  fibLevels?: number[];
  // ── Position tool (long/short risk-reward) ──
  side?: "long" | "short";
  /** Stop-loss price (position tool). */
  stopPrice?: number;
  /** Take-profit price (position tool). */
  targetPrice?: number;
  /** % of account equity risked — drives size/$ readout (default 1). */
  riskPct?: number;
  /** Target/profit color override (defaults to #3179f5). */
  targetColor?: string;
  /** Stop/loss color override (defaults to #ec407a). */
  stopColor?: string;
  /** Middle entry separator line color override (defaults to #787b86). */
  entryLineColor?: string;
  // ── Price alerts on lines ──
  /** When set, the platform alerts when price crosses this line. */
  alertEnabled?: boolean;
  alertMessage?: string;
  // ── Fixed Range Volume Profile ──
  /** Value Area percentage (fraction, defaults to 0.70). */
  vaPct?: number;
  /** Number of price buckets (defaults to 70). */
  numRows?: number;
  /** Up (buy) volume bar color. */
  upColor?: string;
  /** Down (sell) volume bar color. */
  downColor?: string;
  /** Point of control line color. */
  pocColor?: string;
}

/** Swatch palette for the floating drawing toolbar (TradingView-style). */
export const DRAWING_COLORS = [
  "#2196F3",
  "#f0b90b",
  "#0ecb81",
  "#f6465d",
  "#9c27b0",
  "#ff9800",
  "#787b86",
  "#ffffff",
] as const;

export const DRAWING_WIDTHS = [1, 2, 3, 4] as const;

/** Timeframe interval in milliseconds */
export const TF_INTERVAL_MS: Record<Timeframe, number> = {
  "1m": 60_000,
  "5m": 5 * 60_000,
  "15m": 15 * 60_000,
  "30m": 30 * 60_000,
  "1h": 60 * 60_000,
  "4h": 4 * 60 * 60_000,
  "1d": 24 * 60 * 60_000,
  "1w": 7 * 24 * 60 * 60_000,
};

export const KNOWN_CURRENCIES = [
  "EUR",
  "USD",
  "GBP",
  "JPY",
  "AUD",
  "NZD",
  "CAD",
  "CHF",
  "CNY",
  "HKD",
  "SGD",
  "SEK",
  "NOK",
  "MXN",
  "ZAR",
  "TRY",
  "PLN",
  "CZK",
  "HUF",
  "DKK",
];

# Indicators Subsystem (`BottomIndicatorsPanel.tsx` & `indicators.ts`)

This document covers the technical architecture, mathematical calculations, rendering pipelines, and synchronization mechanics of Project_Quant' technical indicators.

---

## 1. Indicator Categories: Overlay vs. Sub-Chart (Pane Below)

In Project_Quant, indicators are categorized into two architectural tiers:

| Category | Indicators | Target Pane | Render Mechanism |
|---|---|---|---|
| **Overlay** | SMA, EMA, Bollinger Bands (BOLL), VWAP | Main Chart Pane | Added directly to `mainChart` as `LineSeries` or custom primitive plugins. |
| **Sub-Chart** (Oscillators) | RSI, MACD, Stochastic (STOCH), ATR, CCI, Williams %R (WR) | Bottom Oscillator Pane | Rendered in a dedicated Lightweight Charts instance inside `BottomIndicatorsPanel.tsx`. |

---

## 2. Mathematical Calculations (`src/lib/indicators.ts`)

All indicator calculations are pure functions that operate on an array of `CandleData` (`{ time, open, high, low, close, volume }`):

### A. Simple & Exponential Moving Averages (SMA / EMA)
- **SMA**: Rolling sum over `period` divided by `period`.
- **EMA**: Seeded with initial SMA; multiplier \( k = \frac{2}{\text{period} + 1} \).  
  Formula: \( \text{EMA}_t = \text{Close}_t \times k + \text{EMA}_{t-1} \times (1 - k) \).

### B. Relative Strength Index (RSI)
- Standard 14-period Wilder's smoothed RSI.
- Calculates average gain and average loss.
- Overbought (70) and oversold (30) reference price lines created as dashed lines (`LineStyle.Dashed`).

### C. Moving Average Convergence Divergence (MACD)
- Fast EMA (default 12), Slow EMA (default 26), Signal EMA (default 9).
- **MACD Line**: \( \text{EMA}_{12} - \text{EMA}_{26} \).
- **Signal Line**: 9-period EMA of MACD Line.
- **Histogram**: \( \text{MACD Line} - \text{Signal Line} \). Rendered as `HistogramSeries` colored green (`#26a69a`) when \(\ge 0\) and red (`#ef5350`) when \(< 0\).

### D. Stochastic Oscillator (STOCH)
- **%K (Fast)**: \( \frac{\text{Close} - \text{Lowest Low}_{14}}{\text{Highest High}_{14} - \text{Lowest Low}_{14}} \times 100 \).
- **%D (Slow)**: 3-period SMA of %K.
- Rendered as dual line series (%K blue `#2962ff`, %D orange `#ff6d00`).

### E. Average True Range (ATR)
- True Range = \( \max(\text{High} - \text{Low}, |\text{High} - \text{PrevClose}|, |\text{Low} - \text{PrevClose}|) \).
- Smoothed using Wilder's 14-period moving average.

### F. Commodity Channel Index (CCI) & Williams %R (WR)
- **CCI**: Measures deviation from statistical mean over 20 periods with Lambert's 0.015 constant.
- **WR**: Momentum oscillator bounded from -100 to 0 with overbought (-20) and oversold (-80) levels.

---

## 3. Sub-Chart Zero-Lag Synchronization

Because oscillator indicators reside in a separate chart instance below `mainChart`, they must maintain **exact horizontal time alignment** and **matching price scale margin widths**.

### A. Logical Range Synchronization
Both charts share the same time scale logical range. When the user scrolls or zooms, `setVisibleLogicalRange` keeps both canvases moving together at 60 FPS:

```ts
const syncRange = (from: IChartApi, to: IChartApi) => {
  if (isSyncing) return;
  const fromRange = from.timeScale().getVisibleLogicalRange();
  if (!fromRange) return;
  const toRange = to.timeScale().getVisibleLogicalRange();
  if (
    toRange &&
    Math.abs(toRange.from - fromRange.from) < 0.001 &&
    Math.abs(toRange.to - fromRange.to) < 0.001
  ) {
    return;
  }
  isSyncing = true;
  try {
    to.timeScale().setVisibleLogicalRange(fromRange);
  } finally {
    isSyncing = false;
  }
};
```

### B. Master-Replica Interaction Protection
A critical failure mode occurs if a sub-chart pushes its range back to `mainChart` during initial loads or series re-creation (e.g., when calling `fitContent()`).

To prevent this, `BottomIndicatorsPanel.tsx` enforces a **one-way master-to-replica** flow unless the user is actively interacting with the sub-chart:
```ts
const isSubInteractingRef = useRef(false);

// Listen to pointerdown / wheel on sub-chart container
const onStart = () => { isSubInteractingRef.current = true; };
const onEnd = () => { isSubInteractingRef.current = false; };
container.addEventListener("pointerdown", onStart);
container.addEventListener("wheel", onStart);

// Sub-chart ONLY pushes to mainChart when actively dragged by user!
const onSubRangeChange = () => {
  if (isSubInteractingRef.current) {
    syncRange(chart, mainChart);
  }
};

// Main chart ALWAYS syncs down to sub-chart
const onMainRangeChange = () => syncRange(mainChart, chart);
```

### C. Pixel-Perfect Price Scale Width Alignment
If `mainChart` has an 80px right price scale and `subChart` has a 60px right price scale, the vertical crosshairs will not align vertically.
`BottomIndicatorsPanel.tsx` measures `mainChart.priceScale("right").width()` and sets:
```ts
chart.applyOptions({ rightPriceScale: { minimumWidth: mainWidth } });
```
This guarantees timestamps align to the exact pixel between both charts.

---

## 4. In-Place Series Updates (Zero Recreation)

When live ticks or candle updates arrive:
- The sub-chart instance is **never destroyed and recreated**.
- If `indicatorData.type` matches the current series, `series.setData(...)` is called directly on the existing `ISeriesApi` instance.
- This produces 0ms latency, zero DOM flicker, and preserves the user's zoom level.

---

## 5. Indicator Rail & Bottom UI UX

1. **Left Indicator Rail**:
   - A vertical pill strip displaying active sub-chart indicators (e.g. circular badges `RSI`, `MACD`, `STO`).
   - Clicking a pill switches the active sub-chart view.
   - Generous vertical padding (`pt-2 pb-2`) prevents focus rings and top edges from clipping.
2. **Settings & Customization**:
   - Right-clicking or double-clicking an indicator pill opens `IndicatorSettingsModal.tsx`.
   - Users can customize period length, smoothing constants, line colors, line widths, and overbought/oversold levels.
   - Settings are persisted in `localStorage` via `useIndicatorSettings.ts`.
3. **Video-Game Style HUD Tooltips**:
   - Hovering over indicator pills presents a compact, dark-themed HUD tooltip displaying the full indicator title, current parameters, and quick shortcut hints.

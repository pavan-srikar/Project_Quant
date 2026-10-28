# Indicators Subsystem (`src/lib/indicators/` & `src/pages/trading/bottom-indicators/`)

This document covers the technical architecture, mathematical calculations, rendering pipelines, and synchronization mechanics of Project Quant' technical indicators.

---

## 1. Indicator Categories & Architecture

| Category | Indicators | Target Viewport | Implementation |
| :--- | :--- | :--- | :--- |
| **Overlay** | SMA, EMA, VWAP, Bollinger Bands (BOLL), Volume (VOL), Custom Pine Scripts (`overlay=true`) | Main Chart Pane (`ChartPanel`) | Rendered directly on `mainChart` as `LineSeries`, `HistogramSeries`, or custom shaded primitives (`bands-primitive.ts`). |
| **Sub-Chart** (Oscillators) | RSI, MACD, Stochastic (STOCH), ATR, CCI, Williams %R (WR), Custom Pine Scripts (`overlay=false`) | Bottom Oscillator Pane (`BottomIndicatorsPanel`) | Rendered in dedicated Lightweight Charts instances synchronized horizontally with `mainChart`. |

---

## 2. Mathematical Calculations (`src/lib/indicators/`)

All indicator calculations are pure functions operating on candlestick arrays with zero DOM dependencies:

```
src/lib/indicators/
├── index.ts             # Central barrel re-export
├── types.ts             # Data interfaces and indicator configuration types
├── moving-averages.ts   # SMA, EMA, and VWAP formulas
├── oscillators.ts       # RSI, MACD, Stochastic, ATR, CCI, Williams %R formulas
└── bands.ts             # Bollinger Bands (middle, upper, lower bands)
```

### A. Simple & Exponential Moving Averages (`moving-averages.ts`)
- **SMA**: Rolling sum over period $N$ divided by $N$.
- **EMA (Multi-EMA)**: Seeded with initial SMA; smoothing multiplier $k = \frac{2}{N + 1}$.  
  $$\text{EMA}_t = \text{Close}_t \times k + \text{EMA}_{t-1} \times (1 - k)$$
  Supports up to 5 individual EMAs simultaneously within a single indicator entry. Users can tick/untick individual EMAs (EMA 1 to EMA 5), set distinct periods (e.g. 20, 50, 100, 200, 9), and customize colors for each line independently.
- **VWAP**: Cumulative volume-weighted typical price:
  $$\text{Typical Price} = \frac{\text{High} + \text{Low} + \text{Close}}{3}, \quad \text{VWAP} = \frac{\sum (\text{Typical Price} \times \text{Volume})}{\sum \text{Volume}}$$

### B. Oscillators (`oscillators.ts`)
- **RSI**: Standard Wilder's 14-period smoothed Relative Strength Index bounded $[0, 100]$ with overbought (70) and oversold (30) levels.
- **MACD**: Fast EMA (12) minus Slow EMA (26). Signal line is a 9-period EMA of MACD. Histogram is MACD minus Signal, rendered as green ($\ge 0$) or red ($< 0$) bars.
- **Stochastic Oscillator**:
  $$\%K = \frac{\text{Close} - \text{Lowest Low}_{14}}{\text{Highest High}_{14} - \text{Lowest Low}_{14}} \times 100, \quad \%D = \text{SMA}_3(\%K)$$
- **ATR**: 14-period Wilder's smoothing of True Range:
  $$\text{TR} = \max(\text{High} - \text{Low}, |\text{High} - \text{Close}_{\text{prev}}|, |\text{Low} - \text{Close}_{\text{prev}}|)$$
- **CCI**: Deviation from statistical mean with Lambert's 0.015 scaling constant.
- **Williams %R**: Momentum oscillator bounded $[-100, 0]$ with levels at $-20$ and $-80$.

### C. Bollinger Bands (`bands.ts`)
- Middle line: 20-period SMA of Close.
- Upper / Lower bands: Middle line $\pm (2 \times \sigma)$ where $\sigma$ is rolling standard deviation.

---

## 3. Sub-Chart Panel Implementation (`src/pages/trading/bottom-indicators/`)

```
src/pages/trading/bottom-indicators/
├── BottomIndicatorsPanel.tsx     # Coordinator component rendering stacked panes (<100 lines)
├── IndicatorPane.tsx             # Individual stacked sub-chart pane container (<100 lines)
├── IndicatorHeader.tsx           # TradingView-style overlay header with title, parameters, real-time crosshair values & hover actions
├── IndicatorContextMenu.tsx      # Context menu for resetting, customizing, or removing indicators
├── indicatorDataAlignment.ts     # Data alignment and timestamp padding
├── seriesBuilders.ts             # Series creation factory (LineSeries, HistogramSeries)
├── seriesUpdate.ts               # Updates existing series data on candle changes
├── useChartSync.ts               # Synchronizes visible logical range and crosshair with main chart
├── useIndicatorChart.ts          # Mounts and resizes Lightweight Charts instances with timeScale
├── useIndicatorCalculation.ts    # Memoized indicator calculation runner
├── useIndicatorSeries.ts         # Manages addition and removal of indicator series
└── types.ts                      # Sub-chart configuration and sync types
```

### Zero-Lag Subchart Synchronization (`useChartSync.ts`)
Oscillator indicators reside in separate Lightweight Charts instances below `mainChart`. To ensure exact horizontal alignment during panning and zooming:
1. `mainChart.timeScale().subscribeVisibleLogicalRangeChange((range) => { ... })`
2. `subChart.timeScale().setVisibleLogicalRange(range)`
3. Margin widths are matched on both charts via `minimumWidth: 80` on the right price scale.
4. Crosshairs are bi-directionally tracked so scrubbing across any pane displays corresponding bar values on all panes.
5. **Wheel Interaction Debounce (`useIndicatorChart.ts`)**: Mouse wheel zoom and pan events on sub-chart oscillator panes engage a 1500ms debounce timer on `isSubInteractingRef`, isolating user-driven subchart interactions and preventing reciprocal range feedback loops with `mainChart`.

---

## 4. Multi-Pane Vertically Stacked Architecture (`IndicatorPane.tsx`)

Oscillator indicators (RSI, MACD, STOCH, ATR, CCI, WR) are rendered simultaneously in separate, vertically stacked panes rather than requiring tabs:

1. **Dedicated Panes**:
   Each sub-chart indicator runs in an isolated `IndicatorPane` component with its own Lightweight Charts instance, calculation cache, and series managers.
2. **Dynamic Time Scale**:
   Only the bottom-most pane renders the time/date scale (`showTimeScale = index === activeBelow.length - 1`). All upper panes have `timeScale: { visible: false, borderVisible: false }`, ensuring a single clean date axis at the bottom.
3. **High-Contrast Pane Dividers**:
   Stacked panes are separated by a 1px TradingView brand-blue dividing line (`divide-y divide-[#2962ff]`) for visual isolation.
4. **Empty State**:
   When no below indicators are active, `BottomIndicatorsPanel` displays centered non-interactive guidance text:
   *"No indicators active. Add indicators from the Indicators menu on the top toolbar."*

---

## 5. Indicator Persistence & Memory

Active indicators (both overlay lines and sub-chart oscillators) are persisted across page refreshes and browser sessions:

1. **Storage Pipeline**:
   - `useChartPreferences.ts` defines `activeIndicators: IndicatorType[]` in `ChartPreferences`.
   - Synchronously loaded on startup from user preferences with fallback to `localStorage.getItem("project_quant_active_indicators")`.
   - Updated via `updateChartPreferences({ activeIndicators: next })` which immediately saves to `localStorage` and dispatches `chart-preferences-updated`.
2. **State Sync (`useTradingChartControls.ts`)**:
   - `activeIndicators` initializes from persistent storage, validated against `INDICATOR_REGISTRY`.
   - Adding/removing indicators or applying layout templates automatically updates the persistent store.
3. **Smart Bottom Panel Uncollapse (`useTradingLayoutResize.ts`)**:
   - If no explicit panel collapse state is set in `localStorage`, the bottom panel automatically uncollapses if any active indicator belongs to the below-chart pane, ensuring restored indicators are visible immediately upon refresh.

---

## 6. Custom Pine Script Engine (`src/lib/pinescript/`)

Users can import TradingView Pine Script (v4/v5) files (`.pine`, `.txt`) or paste script code directly into the terminal:

```
src/lib/pinescript/
├── index.ts        # Central re-export of parser, evaluator, storage, samples
├── types.ts        # AST structures, plot/hline representations, input definitions
├── parser.ts       # Parses indicator declaration, inputs, assignments, and series expressions
├── evaluator.ts    # Mathematical evaluation engine for series functions & expressions
├── storage.ts      # LocalStorage persistence & cross-component event bus
└── samples.ts      # Built-in templates: Dual SMA, Custom RSI, ATR Bands, MACD Momentum
```

### Supported Pine Script Directives & Functions
- **Declarations**: `indicator("Name", overlay=true/false)`, `study("Name", overlay=true/false)`.
- **Inputs**: `input.int(default, "Title")`, `input.float()`, `input.bool()`, `input.color()`, `input()`.
- **Series Functions**: `ta.sma()`, `sma()`, `ta.ema()`, `ema()`, `ta.rsi()`, `rsi()`, `ta.atr()`, `atr()`, `ta.highest()`, `highest()`, `ta.lowest()`, `lowest()`.
- **Rendering Directives**:
  - `plot(series, title="...", color=..., linewidth=...)`
  - `hline(price, title="...", color=..., linestyle=...)`
- **Arithmetic**: Full numeric expression support (`+`, `-`, `*`, `/`, ternary conditions `condition ? val1 : val2`).
- **Pane Resolution**:
  - Scripts with `overlay=true` render directly as dynamic LineSeries on `mainChart` via `useIndicators.ts`.
  - Scripts with `overlay=false` dynamically mount as stacked sub-chart panes in `BottomIndicatorsPanel.tsx`.

---

## 7. Indicator Menu UI & Search (`src/pages/trading/chart-toolbar/IndicatorMenu.tsx`)

1. **Fixed-Length Scrollable Viewport**: The menu has a capped height (`max-h-72 overflow-y-auto`) so dozens of indicators and imported custom scripts can be browsed without overflowing the screen.
2. **Real-Time Search Bar**: Instant text filtering by indicator name, acronym (e.g. "RSI", "VOL"), or description.
3. **Category Filtering**: Tabs filter between "All", "Overlay", "Oscillators", and "Pine" custom indicators.
4. **Pine Script Import Action**: "Import Pine Script" button opens a minimal, distraction-free `PineScriptImportModal.tsx` allowing direct drag-and-drop file upload or raw code pasting with instant syntax checking, with zero pre-filled template clutter.
5. **Volume Control & Custom Styling**: Volume (`VOL`) is fully integrated into the indicator catalog, allowing users to toggle it on/off just like any other technical indicator and independently customize Bullish (Up) and Bearish (Down) histogram bar colors in settings.


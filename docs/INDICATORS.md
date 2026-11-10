# Indicators & Pine Script Subsystem

This document covers the technical architecture, mathematical calculations, rendering pipelines, Pine Script execution VM, and configuration interfaces for Project Quant' indicators.

---

## 1. Directory Structure

```
src/
├── lib/
│   ├── indicators/                   # Pure calculation library (<200 lines each)
│   │   ├── index.ts                  # Central barrel export
│   │   ├── types.ts                  # Indicator definitions, settings & data types
│   │   ├── moving-averages.ts        # SMA, EMA (multi-slot), VWAP
│   │   ├── oscillators.ts            # RSI, MACD, Stochastic, ATR, CCI, Williams %R
│   │   └── bands.ts                  # Bollinger Bands (middle, upper, lower)
│   └── pinescript/                   # Custom Pine Script VM & Parser (<250 lines each)
│       ├── index.ts                  # Central barrel export
│       ├── types.ts                  # AST types, plot/hline nodes, input specs
│       ├── parser.ts                 # Tokenizer & parser for Pine Script v4/v5
│       ├── evaluator.ts              # Mathematical AST evaluation VM over candles
│       ├── storage.ts                # LocalStorage sync & event dispatcher
│       └── samples.ts                # Built-in templates: Dual SMA, RSI, ATR Bands
├── pages/trading/
│   ├── bottom-indicators/            # Multi-pane stacked oscillator sub-chart system
│   │   ├── BottomIndicatorsPanel.tsx # Coordinator rendering stacked sub-chart panes
│   │   ├── IndicatorPane.tsx         # Individual sub-chart container with chart instance
│   │   ├── IndicatorHeader.tsx       # TradingView-style header (title, params, values)
│   │   ├── IndicatorContextMenu.tsx  # Context menu for pane actions & removal
│   │   ├── indicatorDataAlignment.ts # Timestamp alignment with main chart candles
│   │   ├── seriesBuilders.ts         # LineSeries and HistogramSeries builder factory
│   │   ├── seriesUpdate.ts           # Updates active series data on candle tick
│   │   ├── useChartSync.ts           # Horizontal logical range & crosshair sync
│   │   ├── useIndicatorChart.ts      # Mounts and resizes Lightweight Charts instances
│   │   ├── useIndicatorCalculation.ts# Cached indicator math evaluation runner
│   │   ├── useIndicatorSeries.ts     # Series addition, removal, and styling
│   │   └── types.ts                  # Configuration and pane state contracts
│   └── chart-toolbar/
│       ├── IndicatorMenu.tsx         # Dropdown with search, categories, and Pine action
│       └── PineScriptImportModal.tsx # Script editor, syntax validator & import modal
└── components/indicator-settings/     # Indicator settings modal dialog
    ├── IndicatorSettingsModal.tsx    # Modal coordinator for inputs & styling
    ├── IndicatorInputsTab.tsx        # Numeric inputs (periods, fast/slow lengths)
    ├── EmaSlotsSection.tsx           # Multi-EMA configuration (5 slots with toggles)
    ├── IndicatorStyleTab.tsx         # Color pickers, line widths, and dash styles
    └── types.ts                      # Settings tab and form contracts
```

---

## 2. Indicator Categories & Viewport Targets

| Category | Indicators | Target Viewport | Implementation |
| :--- | :--- | :--- | :--- |
| **Overlay** | SMA, EMA (up to 5 lines), VWAP, Bollinger Bands (BOLL), Volume (VOL), Custom Pine Scripts (`overlay=true`) | Main Chart Pane (`ChartPanel`) | Rendered directly on `mainChart` as `LineSeries`, `HistogramSeries`, or custom shaded primitives (`bands-indicator.ts`). |
| **Sub-Chart** (Oscillators) | RSI, MACD, Stochastic (STOCH), ATR, CCI, Williams %R (WR), Custom Pine Scripts (`overlay=false`) | Bottom Oscillator Pane (`BottomIndicatorsPanel`) | Rendered in dedicated Lightweight Charts instances synchronized horizontally with `mainChart`. |

---

## 3. Mathematical Calculations (`src/lib/indicators/`)

All calculations are pure functions with zero DOM or React dependencies:

### A. Moving Averages (`moving-averages.ts`)
- **SMA**: Rolling arithmetic mean over period $N$.
- **EMA (Multi-EMA)**: Multiplier $k = \frac{2}{N + 1}$.  
  $$\text{EMA}_t = \text{Close}_t \times k + \text{EMA}_{t-1} \times (1 - k)$$
  Supports up to 5 independent EMAs simultaneously within a single indicator entry. Users can tick/untick individual EMAs (EMA 1 to EMA 5), set distinct periods (e.g. 20, 50, 100, 200, 9), and customize colors independently.
- **VWAP**: Cumulative volume-weighted typical price:
  $$\text{Typical Price} = \frac{\text{High} + \text{Low} + \text{Close}}{3}, \quad \text{VWAP} = \frac{\sum (\text{Typical Price} \times \text{Volume})}{\sum \text{Volume}}$$

### B. Oscillators (`oscillators.ts`)
- **RSI**: Wilder's 14-period smoothed Relative Strength Index bounded $[0, 100]$ with overbought (70) and oversold (30) levels.
- **MACD**: Fast EMA (12) minus Slow EMA (26). Signal line is 9-period EMA of MACD. Histogram is MACD minus Signal.
- **Stochastic Oscillator**:
  $$\%K = \frac{\text{Close} - \text{Lowest Low}_{14}}{\text{Highest High}_{14} - \text{Lowest Low}_{14}} \times 100, \quad \%D = \text{SMA}_3(\%K)$$
- **ATR**: 14-period Wilder's smoothing of True Range $\max(H - L, |H - C_{\text{prev}}|, |L - C_{\text{prev}}|)$.
- **CCI**: Deviation from statistical mean with Lambert's 0.015 scaling constant.
- **Williams %R**: Momentum oscillator bounded $[-100, 0]$ with levels at $-20$ and $-80$.

### C. Bollinger Bands (`bands.ts`)
- Middle line: 20-period SMA of Close.
- Upper / Lower bands: Middle line $\pm (2 \times \sigma)$ where $\sigma$ is rolling standard deviation.

---

## 4. Sub-Chart Panel Implementation (`src/pages/trading/bottom-indicators/`)

Oscillator indicators are rendered in vertically stacked panes below the main chart:

1. **Zero-Lag Subchart Synchronization (`useChartSync.ts`)**:
   - `mainChart.timeScale().subscribeVisibleLogicalRangeChange((range) => { ... })` synchronizes all sub-chart ranges at 60 FPS.
   - Right price scale margins are matched on both charts via `minimumWidth: 80`.
   - Crosshairs are bidirectionally tracked across all panes.
   - User wheel interactions on subcharts engage a 1500ms debounce timer on `isSubInteractingRef`, preventing reciprocal range feedback loops.
2. **Single Bottom Date Axis**:
   - Only the bottom-most active pane renders the time scale (`showTimeScale = index === activeBelow.length - 1`). Upper panes have `timeScale: { visible: false, borderVisible: false }`.
3. **High-Contrast Dividers & Empty State**:
   - Stacked panes are separated by a 1px brand-blue dividing line (`divide-y divide-[#2962ff]`).
   - When no below indicators are active, displays clean centered guidance text.

---

## 5. Custom Pine Script Engine (`src/lib/pinescript/`)

Traders can import TradingView Pine Script (v4/v5) files or paste code into the terminal:

1. **Parser (`parser.ts`)**: Tokenizes and parses declarations (`indicator`, `study`), inputs, assignments, and series functions.
2. **Evaluator VM (`evaluator.ts`)**: Executes AST statements across candle history:
   - Supported functions: `ta.sma`, `ta.ema`, `ta.rsi`, `ta.atr`, `ta.highest`, `ta.lowest`, `plot`, `hline`.
   - Full arithmetic expressions and ternary conditions (`cond ? a : b`).
3. **Pane Routing**:
   - `overlay=true`: Injected as dynamic `LineSeries` on the main candlestick chart.
   - `overlay=false`: Dynamically mounts as an isolated pane in `BottomIndicatorsPanel`.
4. **Editor Modal (`PineScriptImportModal.tsx`)**: Syntax highlighting, validation against active candles, and template samples.

---

## 6. Indicator Settings & Customization (`src/components/indicator-settings/`)

- `IndicatorSettingsModal.tsx`: Coordinates tabs for Inputs and Style.
- `IndicatorInputsTab.tsx`: Form fields for numeric periods, fast/slow lengths, and standard deviations.
- `EmaSlotsSection.tsx`: Specialized multi-slot EMA manager allowing independent toggle, period, and color per slot.
- `IndicatorStyleTab.tsx`: Palette swatches, RGB spectrum picker, line width sliders (1-4px), and line styles (solid, dashed, dotted).
- Persistence: Settings are persisted in `localStorage` under `project_quant_indicator_settings` and reactively broadcast.

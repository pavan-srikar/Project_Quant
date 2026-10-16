# Indicators Subsystem (`src/lib/indicators/` & `src/pages/trading/bottom-indicators/`)

This document covers the technical architecture, mathematical calculations, rendering pipelines, and synchronization mechanics of Project Quant' technical indicators.

---

## 1. Indicator Categories & Architecture

| Category | Indicators | Target Viewport | Implementation |
| :--- | :--- | :--- | :--- |
| **Overlay** | SMA, EMA, VWAP, Bollinger Bands (BOLL) | Main Chart Pane (`ChartPanel`) | Rendered directly on `mainChart` as `LineSeries` or custom shaded primitives (`bands-primitive.ts`). |
| **Sub-Chart** (Oscillators) | RSI, MACD, Stochastic (STOCH), ATR, CCI, Williams %R (WR) | Bottom Oscillator Pane (`BottomIndicatorsPanel`) | Rendered in dedicated Lightweight Charts instances synchronized horizontally with `mainChart`. |

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
- **EMA**: Seeded with initial SMA; smoothing multiplier $k = \frac{2}{N + 1}$.  
  $$\text{EMA}_t = \text{Close}_t \times k + \text{EMA}_{t-1} \times (1 - k)$$
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


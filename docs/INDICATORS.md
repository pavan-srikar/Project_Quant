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
│   └── pinescript/                   # Custom Pine Script VM & Parser (<270 lines each)
│       ├── index.ts                  # Central barrel export
│       ├── types.ts                  # AST types, plot/hline nodes, input specs
│       ├── parser.ts                 # Tokenizer & parser with multi-line folding & tuple support
│       ├── evaluator.ts              # Mathematical AST evaluation VM over candles
│       ├── pineVM.ts                 # Universal Pine Script Virtual Machine & Drawing Coordinator
│       ├── pineRuntime.ts            # Dynamic drawing heap (boxes, lines, labels) & series cache
│       ├── pineMigrator.ts           # Universal Pine Script v4 -> v5 transpiler & series call hoisting
│       ├── pineTSRunner.ts           # PineTS runner, LRU execution caching & plot/drawing pipeline
│       ├── pineTSExtractors.ts       # Drawing extractors (boxes, lines, labels, polylines, tables)
│       ├── mathFunctions.ts          # Pure series TA math (SMA, EMA, RSI, MACD, Stdev, Cross, PivotHigh/Low)
│       ├── forecastEngine.ts         # LuxAlgo MACD price forecasting simulation & percentile cloud
│       ├── liquiditySweepsEngine.ts  # LuxAlgo Liquidity Sweeps box/line simulation & breakout detection
│       ├── liquiditySwingsEngine.ts  # LuxAlgo Liquidity Swings pivot boxes & level lines simulation
│       ├── indicatorTemplates.ts     # Pine Script v5 code generator for built-in indicators
│       ├── storage.ts                # LocalStorage sync, in-place updates & event dispatcher
│       └── samples.ts                # Built-in templates: Dual SMA, RSI, ATR Bands
├── pages/trading/
│   ├── bottom-indicators/            # Multi-pane stacked oscillator sub-chart system
│   │   ├── BottomIndicatorsPanel.tsx # Coordinator rendering stacked sub-chart panes
│   │   ├── IndicatorPane.tsx         # Individual sub-chart container with chart instance
│   │   ├── IndicatorHeader.tsx       # TradingView-style header (title, params, values)
│   │   ├── IndicatorContextMenu.tsx  # Context menu for pane actions & removal
│   │   ├── indicatorDataAlignment.ts # Timestamp alignment with main chart candles
│   │   ├── seriesBuilders.ts         # LineSeries and HistogramSeries builder factory
│   │   ├── seriesBuilderHelpers.ts   # 4-color MACD histogram & multi-plot builder helpers
│   │   ├── seriesUpdate.ts           # Updates active series data on candle tick
│   │   ├── useChartSync.ts           # Horizontal logical range & crosshair sync
│   │   ├── useIndicatorChart.ts      # Mounts and resizes Lightweight Charts instances
│   │   ├── useIndicatorCalculation.ts# Cached indicator math evaluation runner
│   │   ├── useIndicatorSeries.ts     # Series addition, removal, and styling
│   │   └── types.ts                  # Configuration and pane state contracts
│   └── chart-toolbar/
│       ├── IndicatorMenu.tsx         # Dropdown with search, categories, and {/} Pine action
│       ├── PineScriptEditorModal.tsx # Universal script editor, syntax validator & runner
│       └── PineScriptImportModal.tsx # Backward-compatible facade for Pine imports
└── components/indicator-settings/     # Indicator settings modal dialog
    ├── IndicatorSettingsModal.tsx    # Modal coordinator with real-time live chart preview & revert
    ├── IndicatorInputsTab.tsx        # Numeric steppers and Pine input delegator
    ├── PineScriptInputsSection.tsx   # TV-grade inline grouping, interactive color swatches & steppers
    ├── NumberStepper.tsx             # Stepper with increment/decrement buttons and direct editing
    ├── ColorPickerOverlay.tsx        # Responsive desktop side-panel and mobile color picker overlay
    ├── EmaSlotsSection.tsx           # Multi-EMA configuration (5 slots with toggles)
    ├── IndicatorStyleTab.tsx         # Color pickers, line widths, and Pine Script plot styles
    ├── PineScriptStyleSection.tsx    # TradingView-grade plot controls, polylines, precision & status line toggles
    ├── IndicatorVisibilityTab.tsx    # Resolution and timeframe visibility configuration tab
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
- **RSI**: Wilder's 14-period smoothed Relative Strength Index bounded $[0, 100]$ with overbought (70), midline (50), and oversold (30) levels.
- **MACD**: Fast EMA (12) minus Slow EMA (26). Signal line is 9-period EMA of MACD. Histogram is MACD minus Signal rendered using TradingView's 4-color momentum palette (`#26a69a` expanding bull, `rgba(38, 166, 154, 0.45)` waning bull, `#ef5350` expanding bear, `rgba(239, 83, 80, 0.45)` waning bear) anchored with a 0 baseline.
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

## 5. Custom Pine Script Engine (`src/lib/pinescript/` & `src/lib/chart-plugins/pine-primitive/`)

Traders can import TradingView Pine Script (v4/v5) files or paste code into the terminal:

1. **Parser (`parser.ts`, `parserHelpers.ts`)**:
   - Tokenizes and parses declarations (`indicator`, `study`), inputs, assignments, and series functions.
   - Extracts grouped input metadata: `group`, `options` dropdown lists, `minval`/`maxval`, `step`, and `inline` styling.
   - Supports multi-line statement continuations across parentheses and operator bounds.
   - Supports plot style directives: `plot.style_columns`, `plot.style_histogram`, `plot.style_line`, `plot.style_area`.
   - Supports variable-assigned `plot(...)` calls (`init_plot = plot(...)`, `price_plot = plot(...)`) and keyword arguments.
   - Accurately respects `display = display.none`, suppressing hidden plots from drawing redundant visible line series.
   - Captures `fill(...)` directives and forward-projecting `polyline.new(...)` calls.
   - Supports tuple destructuring (`[macd, signal, _] = ta.macd(...)`), `var` / `varip` state declarations, and `:=` re-assignments.
2. **Universal Pine Script Engine (`pineTSRunner.ts`) & Evaluator VM (`evaluator.ts`)**:
   - **PineTS Transpiler & Runtime**: Powered by LuxAlgo's official `pinets` engine, executing native Pine Script v5/v6 code directly with 1:1 bar-by-bar AST execution, historical series indexing (`[1]`), dynamic variable scoping (`var`/`varip`), user-defined types (UDTs), methods, and drawing heaps.
   - **Universal Historical Barstate & Syminfo Shims**:
     - Evaluates `barstate.isconfirmed` as true for historical candle calculation, strictly adhering to TradingView's specification where historical bars are closed and confirmed.
     - Automatically supplies a robust price tick resolution fallback for `syminfo.mintick`, preventing `NaN` arithmetic cascades in volatility corridors, rolling profiles, and breakout filters.
     - Multi-variable tuple de-structuring and graceful shimming for `request.security_lower_tf` (supporting 1-tuple, 3-tuple, and 5-tuple forms like `[io, ih, il, ic, iv]`).
     - Supplies standard Kline timestamps (`openTime` and `closeTime`), unlocking native Pine Script date/session functions (`timeframe.change("D")`, `timeframe.change("W")`, `timeframe.change("M")`, `time_close`, and session anchor resets).
     - Automatic trailing garbage/stray keyword truncation for pasted user notes or dangling connector keywords.
   - **Universal Graphical Primitives Extraction**:
     - **Candle Corridors & Profiles (`plotcandle`)**: Directly maps `plotcandle` layers (such as Zeiierman rolling candle pressure corridors and volume delta heatmaps) into bar-aligned bounding boxes with exact alpha tinting and background colors.
     - **Shaded Ribbon Polygon Fills (`fill`)**: Extracts `fill(...)` directives between plot series and hlines, mapping top and bottom values into continuous polygon bands with support for custom alpha and gradient values.
     - **Dynamic Labels & Badges (`label.new`)**: Maps labels with rounded pill badge backgrounds or clean floating text with dark drop shadows, white or custom text colors, vertical styles (`style_label_up`, `style_label_down`, `style_label_center`), and dynamic font sizing (`tiny` to `huge`).
     - **Lines & Level Boxes**: Seamlessly extracts and maps native `box.new`, `line.new`, and `polyline.new` objects with exact colors, widths, styles, and text into chart primitives. Automatically suppresses default `#2962ff` borders when no border is specified and skips collapsed 0-width boxes.
   - **Input Overrides Integration**: Seamlessly maps reactive settings overrides (`customInputs`) to input definitions before execution.
   - **Supported TA functions**: `ta.sma`, `ta.ema`, `ta.rma` (Wilder's Running Moving Average), `ta.rsi`, `ta.atr`, `ta.highest`, `ta.lowest`, `ta.macd`, `ta.stdev`, `ta.cross`, `ta.crossover`, `ta.crossunder`, `ta.pivothigh`, `ta.pivotlow`.
   - **Supported Math & utility functions**: `math.abs`, `math.max`, `math.min`, `math.round`, `math.sqrt`, `nz`, `na`.
   - **Percentile Price Forecasting (`forecastEngine.ts`)**: Tracks historical episode memory across trend durations (`upMemory`, `dnMemory`), computes linear percentile interpolation (`percentile_linear_interpolation`) across custom percentiles (top, average, bottom), and projects future cone bounds ($N \dots N+\text{fcast}$).
   - Synthesizes future polylines and shaded ribbon fill points between candle prices and reference lines.
3. **Canvas Primitive Renderer (`PineRendererPrimitive`)**:
   - Implements Lightweight Charts `ISeriesPrimitive<Time>` under `src/lib/chart-plugins/pine-primitive/`.
   - **Dual Z-Order Views**: Uses `PineRendererBgPaneView` with `zOrder: 'bottom'` to paint shaded boxes, blocks, and fills behind the candlestick bodies and wicks, and `PineRendererFgPaneView` with `zOrder: 'normal'` to draw crisp breakout lines, polyline strokes, and volume badges on top of candles.
   - **Native Drawing Rendering**: Renders exact `box` rectangles, `line` levels, and `label` badges directly produced by the Pine runtime with zero hardcoded approximations.
   - Projects bar indices (including future projection bars $N+1 \dots N+\text{fcast}$) to canvas $X$ coordinates via `timeScale.logicalToCoordinate()`.
   - Projects prices to canvas $Y$ coordinates via `series.priceToCoordinate()`.
   - Renders forward-projected **Forecast Cones** (shaded percentile cloud + upper/lower boundary strokes + trajectory midline) directly in future whitespace.
   - Automatically expands time scale `rightOffset` (45–80 bars) and adjusts visible logical range so the forward prediction is framed in full view without being clipped.
   - Decoupled `autoscaleInfo` ensures chart vertical scale is anchored exclusively to candlestick price action, preventing runaway drawing bounds from compressing candles.
   - Suppresses fills when one of the plots has `display = display.none` per Pine Script v5 specification.
4. **Pane Routing & Drawing Separation**:
   - `overlay=true`: Injected as dynamic series and canvas primitives on the main candlestick chart. Tables and overlay drawings render directly on the main chart viewport.
   - `overlay=false`: Dynamically mounts as an isolated pane in `BottomIndicatorsPanel`, rendering all visible plots (lines, columns, histograms, areas, and step-lines) with full PineTS AST execution and associated horizontal boundary levels (`hline`). Sub-chart shapes (`plotshape` / milestone circles, continuation diamonds, and exhaustion markers) are rendered directly inside the sub-chart canvas via a pane-level `PineRendererPrimitive`.
   - **Cross-Pane `force_overlay=true` Forwarding**: Any drawings created by sub-chart indicators with `force_overlay=true` (such as `Trend Exhaustion`'s 25 outer trend leg container boxes and birth/exhaustion diamonds) are automatically routed to the main chart candlestick primitive instead of polluting or distorting the oscillator's scale.
   - **Floating Pine Table HUD (`PineTablesOverlay.tsx`)**: Directly renders native Pine tables (`table.new`, `table.cell`, `table.merge_cells`) as clean TradingView-grade floating HUD cards (e.g. AlgoAlpha VWAP status dashboards and trend scanners) with exact positions (`top_right`, `bottom_left`, etc.), cell backgrounds, font sizes, text alignments, borders, and hover tooltips.
5. **Universal Editor Modal (`PineScriptEditorModal.tsx`)**: Syntax highlighting, validation against active candles, and direct save & apply changes.
6. **1:1 TradingView Primitive Rendering Fidelity & High-Performance Caching**:
   - `PineRendererPrimitive`: Renders boxes with column-width alignment (`halfBar` coverage), dashed/dotted level lines with accurate dash array patterns (`[4, 4]`), and clean floating labels with 6px vertical standoff, dark drop shadows, and exact TradingView style placement.
   - **Infinite RAF Loop Elimination**: `PineRendererPrimitive.dataUpdated` strictly updates internal views without invoking `this.requestUpdate()`, preventing cascading animation frame loops between series data updates and canvas redraws.
   - **Fill Band Viewport Culling**: Polyline ribbons and shaded fills index candle coordinates chronologically and cull points outside $[minBar - 5, maxBar + 5]$, eliminating redundant coordinate projections and reducing per-frame canvas operations by over 95%.
   - **Universal PineTS Evaluation LRU Cache**: `runPineTS` maintains a 16-slot AST evaluation cache keyed on script hash, inputs, candle count, and last bar timestamp, eliminating duplicate VM executions across overlay and sub-chart consumers.
   - **Line Series `setData` Deduplication**: Overlay series verify whether incoming data keys have changed before invoking `setData`, preventing redundant series recalculations.
   - **Stable Table Identity**: Floating table overlays compare cell counts and IDs before dispatching state updates, preventing React re-render thrashing.
   - **Polygon Bounding-Box Culling**: Evaluates whole-polygon bounding ranges against viewport logical bounds instead of culling individual vertices, preventing forecast cones and cloud fills from slicing or distorting into dark quadrilateral slabs.
   - `pineTSRunner` & `pineTSExtractors`: Automatically filters out deleted, uninitialized (`NaN`), collapsed 0-width, or transparent (`color = na`, `#00000000`) lines and boxes, while extracting both base and overlay heaps (`__boxes__` and `__boxes_overlay__`).
   - `ChartLegendHeader`: Displays active input parameters next to indicator titles (e.g. `Liquidity Swings [LuxAlgo] 11 Wick Extremity`), matching TradingView's legend format.

---

## 6. Indicator Settings & Dynamic Pine Inputs (`src/components/indicator-settings/`)

- `IndicatorSettingsModal.tsx`:
  - Coordinates tabs for Inputs and Style, with a `{/}` header shortcut to inspect and edit the indicator's Pine Script.
  - **Live Real-Time Background Preview (`onPreview`)**: As parameters, steppers, dropdowns, or colors change, updates are previewed live on the chart in real time. Closing or canceling the modal reverts back to initial settings, while clicking "Apply" commits changes permanently.
  - **Pine Script Defaults Reset**: The "Defaults" button dynamically reads AST default values from the parsed script and restores them with live preview.
- `PineScriptInputsSection.tsx`:
  - **TV-Grade Inline Grouping**: Detects inputs sharing identical `inline` tokens (e.g. `inline = 'css'`, `inline = 'areas'`, `inline = 'signal'`) and renders them side-by-side on a single row with unified label and swatches.
  - **Interactive Color Swatches**: Renders 28x28px swatches with transparency pattern and opacity support. Clicking any swatch opens the responsive `RgbPickerPanel` popout overlay.
  - **Numeric Steppers (`NumberStepper.tsx`)**: Replaces plain inputs with TradingView-style decrement/increment stepper buttons (`−` / `+`) and direct numeric inputs.
  - **Persistent Storage**: Preserves custom Pine indicators and built-in settings in `useIndicatorSettings`, broadcasting `CUSTOM_PINE_UPDATED_EVENT` and settings events across main chart overlay primitives and oscillator sub-chart panes.
- `EmaSlotsSection.tsx`: Specialized multi-slot EMA manager allowing independent toggle, period, and color per slot.
- `IndicatorStyleTab.tsx`: Palette swatches, RGB spectrum picker, line width sliders (1-4px), and line styles (solid, dashed, dotted).

---

## 7. Universal `{/}` Pine Script Indicator Editor

Every indicator in Project Quant features a `{/}` icon button allowing traders to inspect and edit its underlying Pine Script v5 source code:
- **Available Entry Points**:
  1. Main Chart Overlay Legend HUD (`ChartLegendHeader.tsx`)
  2. Sub-chart Oscillator Pane Header (`IndicatorHeader.tsx`)
  3. Indicators Dropdown Menu (`IndicatorMenu.tsx`)
  4. Indicator Settings Dialog (`IndicatorSettingsModal.tsx`)
- **Built-in Indicator Templates (`indicatorTemplates.ts`)**: Automatically synthesizes real-time Pine Script v5 code matching the indicator's active parameters (periods, standard deviations, colors).
- **In-Place Updates & Conversion**: Custom scripts are updated in place, while edited built-in indicators convert seamlessly to customized instances and apply directly to the chart.


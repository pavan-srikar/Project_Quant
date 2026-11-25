# Chart Engine & Viewport Lifecycle (`src/pages/trading/chart/`)

This document details the inner workings of Project Quant' core charting engine, powered by TradingView's **Lightweight Charts (v4.2.0)** and decomposed into modular single-responsibility units under `src/pages/trading/chart/`.

---

## 1. Modular Subsystem Layout

```
src/pages/trading/chart/
├── ChartPanel.tsx               # Master viewport coordinator (<270 lines)
├── chartConfig.ts               # Options factory (theme, scales, grid, layout)
├── chartSeriesInit.ts           # Initializes CandlestickSeries & VolumeHistogram
├── chartFraming.ts              # Mathematical framing of latest bars + right margin
├── chartPluginManager.ts        # Attaches / detaches custom chart primitives
├── chartHistoryLoader.ts        # Bidirectional continuous pagination (backward & forward)
├── chartWheelHandler.ts         # Wheel zoom handler preventing bar collapse
├── chartOverlays.ts             # Manages SMA, EMA, VWAP, Bollinger overlay lines
├── ChartOverlaysContainer.tsx   # Floating DOM layer for OHLC legend & countdown
├── ChartLegendHeader.tsx        # Top-left OHLC legend with indicator eye icons
├── ChartPanelDialogs.tsx        # Mounts settings and context menu modals
├── DragPriceTooltip.tsx         # Floating price delta tooltip during TP/SL drag
├── bidAskLines.ts               # Real-time dashed bid/ask spread lines
├── drawingManagerInit.ts        # Instantiates DrawingToolsManager
├── realtimeFeed.ts              # Subscribes to tick feed and updates series in real time
├── types.ts                     # TypeScript interfaces for chart lifecycle & refs
├── useCandleCountdown.ts        # Calculates seconds until current bar closes
├── useCandlesMerge.ts           # Merges historical candles with in-flight live bar
├── useChartContextMenuActions.ts# Context menu actions (reset scale, add alert)
├── useChartDataPipeline.ts      # Feeds normalized, deduplicated data to series
├── useChartIndicatorSettingsState.ts # Indicator settings modal state
├── useChartLifecycle.ts         # Mount, resize observer, and unmount cleanup
├── useChartOptionSync.ts        # Syncs user theme/grid changes to chart options
├── useChartOverlaysIntegration.ts# Syncs overlay lines when candle data updates
├── useChartPluginAttachment.ts  # Attaches session breaks & delta tooltip plugins
├── useFootprintAttachment.ts    # Attaches order flow footprint volume cluster primitive
├── useHeatmapAttachment.ts      # Attaches liquidation heatmap primitive & manages visibility
├── useChartStateRefs.ts         # Stable refs preventing stale closure bugs
├── useDrawingManagerRefs.ts     # Links drawing manager callbacks to React state
├── useDrawingSelectionState.ts  # Tracks active selected and hovered drawing IDs
├── useLineCrossAlerts.ts        # Checks candle price crossings against alert lines
├── useRealtimeEffects.ts        # Binds live tick subscribers to update series
├── useReplayMarkers.ts          # Places execution markers during historical replay
└── useStalenessWatchdog.ts      # Detects frozen feeds and triggers refresh
```

---

## 2. Lightweight Charts Initialization (`chartConfig.ts` & `chartSeriesInit.ts`)

1. **Instantiation**:
   `chartConfig.ts` creates the chart instance using `createChart(container, options)`:
   - `layout`: Background color from `theme.css`, mono font (`11px`).
   - `rightPriceScale`: Auto-scaling enabled with margins `{ top: 0.06, bottom: 0.18 }` to leave space for volume.
   - `timeScale`: Minimum bar spacing `1.5px` to prevent sub-pixel bar collapse.
2. **Series Construction**:
   `chartSeriesInit.ts` adds:
   - Primary `CandlestickSeries` with `#d1d4dc` (ash grey bullish) and `#5d606b` (dark grey bearish) styling.
   - Secondary `HistogramSeries` for volume on an overlay scale with `scaleMargins: { top: 0.82, bottom: 0 }`, matching the ash grey (`rgba(209, 212, 220, 0.4)`) and dark grey (`rgba(93, 96, 107, 0.4)`) theme colors. Visibility in `useChartOptionSync.ts` respects both active indicator membership (`"VOL"`) and the per-indicator eye toggle (`indicatorSettings.VOL.visible !== false`).
   - Dashed Bid and Ask price lines created on `candleSeries.createPriceLine` (disabled by default unless toggled on).

---

## 3. Real-Time Candle Pipeline (`useChartDataPipeline.ts` & `useCandlesMerge.ts`)

Prices update across three distinct layers:
1. **Raw Ticks (~50ms)**: Merged into the active bar via `series.update()` in `realtimeFeed.ts`.
2. **Server Kline Events (1-5s)**: Authoritative server candle overwrites the tick-aggregated bar.
3. **Historical Refresh (30s)**: Full dataset refresh via `series.setData()` through `useChartDataPipeline.ts`.

### Strict Monotonic Timestamp Guarantee
Lightweight Charts throws an unrecoverable exception if timestamps are not strictly increasing.
- All timestamps are converted to integer seconds: `Math.floor(ms / 1000)`.
- `useChartDataPipeline.ts` deduplicates bars and sorts ascending before passing to `series.setData()`.

### Fast & Smooth Cross-Instrument Switching (`useChartViewportController.ts` & `ChartPanel.tsx`)
- **Single-Batch Load Invariant**: Initial candle queries request at most 1,000 bars (`candleLimit = 1_000`). Because Binance limits single responses to 1,000 klines, this resolves in a single round-trip HTTP request (~120ms) instead of sequential multi-batch fetches, accelerating symbol switching by 3x. Continuous pagination in `chartHistoryLoader.ts` streams deeper history on demand.
- **Debounced Background Prefetching**: Prefetching secondary timeframes is debounced with a 1,500ms cooldown so the active chart has exclusive network bandwidth during coin switches, avoiding concurrent connection flooding and Binance HTTP 429 rate limits.
- **Visual Transition Skeleton**: While `chartData.length === 0` during symbol transition, `ChartPanel.tsx` displays a sleek, non-intrusive backdrop loading indicator (`Loading <Symbol>...`) preventing blank void flashes.

---

## 4. Viewport Framing Mathematics (`chartFraming.ts`)

When switching symbols, `frameLatestCandles` frames the latest 80 candles cleanly without forcing autoscale unless configured:
```ts
export function frameLatestCandles(
  chart: IChartApi | null,
  barCount: number,
  autoScale: boolean = false,
): void {
  if (!chart || barCount <= 0) return;
  const ts = chart.timeScale();
  const visibleBars = Math.min(barCount, 80);
  const from = Math.max(0, barCount - visibleBars);
  const to = barCount + 8; // 8 bars right margin for comfortable forward view
  ts.setVisibleLogicalRange({ from, to });
  if (autoScale) chart.priceScale("right").applyOptions({ autoScale: true });
}
```
A second pass runs on `requestAnimationFrame` to ensure correct framing after the browser DOM layout pass.
When switching instruments (`selectedSymbol`), `autoScale: true` is momentarily triggered to fit the price range of the new instrument (e.g. from Bitcoin's $60k+ to Solana's $72), and then locked to `autoScale: false` on requestAnimationFrame unless the user has explicitly enabled `autoScale` in chart preferences.
When loading older historical candles (going back in time via continuous pagination), the chart's price scale remains completely untouched and never automatically turns on `autoScale: true`, ensuring auto-scale ("fits data to screen") remains strictly off by default unless manually enabled by the user in the context menu.
When switching timeframes on the *same symbol* (whether viewing live edge candles or historical bars), the visible Y-axis price range (e.g. 56k to 100k set by user drag/adjustment) is preserved using `getChartPriceRange()` and restored via `setChartPriceRange()`. Automatic re-scaling (`autoScale: true`) is avoided so the price range remains consistent regardless of the timeframe switch (4H -> 1H, 4H -> 30m, etc.), matching TradingView behavior.

### Timeframe Switching & Historical Viewport Pinning Architecture

When a user switches timeframes (e.g. from `4h` to `30m`) while viewing historical candles (e.g. from last year), the system maintains three core visual invariants:
1. **The rightmost visible historical candle remains fixed in place** at the right edge (or exact margin offset) of the viewport.
2. **The zoom ratio (`barSpacing`) is preserved** so candles do not collapse or expand violently.
3. **The Y-axis price range (`{ min, max }`) is locked** without triggering auto-scale.
4. **The chart NEVER jumps to today's live edge** when looking at past history.

#### The 5 Invariants Making Timeframe Switching Work (Do Not Alter)

1. **Array Synchronization (`TradingPage.tsx` $\to$ `useChartViewportController.ts`)**:
   - `TradingPage` MUST pass the live `allCandles: Candle[]` array to `useChartViewportController`, NOT just `allCandles.length`.
   - `allCandles` contains both the initial limit and older historical bars prepended by `chartHistoryLoader.ts`.
   - The controller determines `displayCandles = allCandles.length > 0 ? allCandles : candles`.
   - Indexing `displayCandles[rightBarIdx]` guarantees the exact historical candle is retrieved, rather than clamping to the end of a truncated live array.

2. **Timestamp-Based Live Edge Predicate**:
   - Never determine `isAtLiveEdge` by array index alone (which can be desynchronized or clamped).
   - `useChartViewportController` computes `isHistoricalTime = vrToSec > 0 && (nowSec - vrToSec > 86400 * 3)`.
   - If the visible right edge is more than 3 days in the past, `isAtLiveEdge` is **strictly false**.
   - `anchor.fromTime`, `anchor.toTime`, and `anchor.centerTime` remain set to the historical timestamps, and `historicalTargetTime` is passed to the query.

3. **Time-Boundary Invariance Across Resolutions (`lastVisibleEndTime`)**:
   - A candle on higher timeframe $TF_1$ (e.g. 4h) spans $[T, T + TF_1]$. The right edge of that candle is $T + TF_1$.
   - `getChartTimeScaleState` and `useChartViewportController` capture `lastVisibleEndTime = candleAtRight.time + TF_SECONDS[oldTf]`.
   - In `frameHistoricalViewport`, the target open time for the new timeframe $TF_2$ is computed as:
     $$\text{anchorTime} = \text{lastVisibleEndTime} - \text{TF\_SECONDS}[newTf]$$
   - This guarantees that whether switching from 4h $\to$ 30m, 1d $\to$ 1h, or 15m $\to$ 4h, the rightmost edge of the candle aligns to the exact second.

4. **In-Flight Query Protection in `useRealtimeEffects.ts`**:
   - When switching timeframes, TanStack Query fetches the new timeframe's historical window.
   - If an in-flight background query or live tick arrives before this query resolves, `useRealtimeEffects` checks:
     `isHistoricalData = Number(chartData[0]!.time) <= anchor.toTime + 86400 * 30`.
   - If incoming `chartData` is stale live edge data, `useRealtimeEffects` **retains the anchor in the store** and does NOT frame to live. Only when genuine historical data arrives does it execute `frameHistoricalViewport` and clear the anchor.

5. **Options Ordering in Lightweight Charts**:
   - In `chartFraming.ts` (`frameHistoricalViewport` and `frameLatestCandles`), `timeScale.applyOptions({ barSpacing, rightOffset })` must execute **before** `timeScale.setVisibleLogicalRange({ from, to })`.
   - Applying options after setting the logical range causes Lightweight Charts to re-compute logical boundaries, displacing the pinned candle. Applying options first ensures the explicit logical range takes precedence.

---

## 5. Bidirectional Infinite Historical Loading (`chartHistoryLoader.ts`)

The charting engine implements seamless bidirectional infinite pagination:

1. **Backward Pagination (Older Data)**:
   - Monitors `timeScale.subscribeVisibleLogicalRangeChange()`.
   - When `logicalRange.from <= LOAD_MORE_THRESHOLD (20)` AND the user is actively panning/zooming (`hasUserPannedOrZoomedRef.current === true`), fires `fetchOlderRange()`.
   - Older bars are prepended to the series and logical range is adjusted by the prepended bar count, maintaining the user's visual position.

2. **Forward Pagination (Newer Data / Toward Live Edge)**:
   - Evaluated by `isLoadForwardEligible(logicalRange, totalBars, newestBarMs)`:
     - Triggers when `barsAfter <= 25` (scrolling toward the right edge of loaded history).
     - ONLY triggers if the newest loaded bar is genuinely in the past (`newestBarMs < Date.now() - 2 * intervalMs`).
   - Calls `fetchNewerRange()`, which requests contiguous subsequent klines via `candleRepository.fetchNewer()`.
   - Bars are appended to the series via `onLoaded(bars, isForward = true)`. Because forward-loaded bars extend into the right void without shifting existing bar indices, no synthetic offset is applied to `logicalRange`, completely eliminating voids when scrolling or switching timeframes.

---

## 6. Live Edge Isolation & Protection (`realtimeFeed.ts`)

To prevent artificial candle corruption when viewing historical datasets:
- **Predicate `isSeriesAtLiveEdge(lastBarTimeSec, timeframe)`**: Verifies whether the last bar of the series is within interval tolerance (plus weekend forex allowance) of current UTC time.
- **Selective Tick Suppression**:
  - If `!isSeriesAtLiveEdge`, incoming live WebSocket ticks and polling updates **do not** mutate or append to the candlestick series.
  - Bid/Ask horizontal price lines and header ticker badges continue to reflect real-time live prices.
  - Stale refetch watchdogs are bypassed for historical datasets, preventing infinite 1.5s React Query refetch loops.
- Once the user scrolls back to the live edge, real-time candle aggregation and updates resume automatically.

---

## 7. Loop Prevention & Multi-Chart Isolation

1. **Historical Target Single-Consumption**:
   - `pendingHistoricalTargetRef.current` in `useRealtimeEffects.ts` is cleared (`= null`) immediately upon applying `frameHistoricalViewport`.
   - Prevents recursive re-framing loops where incoming data triggers `useRealtimeEffects`, which re-frames the target, triggering range changes, and re-fetching data in an endless 500ms cycle.
2. **Timeframe Switch Cooldown Window & Interaction Reset (`useChartLifecycle.ts`)**:
   - On timeframe change, `isUserInteractingRef.current` is immediately reset to `false` and any active wheel debounce timers are cleared.
   - `tfCooldownUntilRef.current = Date.now() + 1500` enforces a 1500ms moratorium during which `isLoadMoreEligible` and `makeHistoryLoader` completely suppress historical pagination.
   - Prevents stale wheel/pointer interactions from triggering infinite backward pagination loops when the newly framed viewport places candles near the left edge.
3. **Fresh User Gesture Invariant on Pagination (`onLoaded`)**:
   - When a historical chunk arrives, `prependedCount` is calculated from the exact count of unique bars strictly older than the series' oldest bar.
   - `isUserInteractingRef.current` is reset to `false` upon injecting older bars. Each pagination step requires a fresh, deliberate user gesture (scroll wheel flick or pointer drag) and cannot auto-chain into unattended recursive loops.
4. **Sub-Chart Indicator Interaction Debounce**:
   - In `useIndicatorChart.ts`, mouse wheel events on sub-chart oscillator panes set `isSubInteractingRef.current = true` with a 1500ms debounce reset.
   - Prevents sub-chart interactions from permanently latching and causing crosshair jitter or reciprocal range feedback to the main chart.

---

## 8. Viewport Preservation Across Timeframe Switches (`chartFraming.ts` & `useChartViewportController.ts`)

When switching timeframes on the same symbol (e.g. 4H → 1H, 4H → 30m), TradingView-grade viewport consistency is maintained:
1. **Y-Axis Price Range Preservation**:
   - `getChartPriceRange(chart)` captures current visible `{ min, max }` from Lightweight Charts' price scale.
   - `setChartPriceRange(chart, range)` locks `autoScale: false` and sets the exact price range across timeframe transitions.
2. **Rightmost Candle Locking & Zoom Ratio Preservation**:
   - `getChartTimeScaleState(chart)` extracts `{ barSpacing, rightOffset, visibleBars, scrollPosition, lastVisibleTime }`.
   - `frameLatestCandles` and `frameHistoricalViewport` re-apply `barSpacing` (candle pixel width / zoom ratio) and pin the rightmost candle at its exact offset on the screen.
   - Clamping to artificial bounds (e.g. 80 or 150 bars) is eliminated, faithfully preserving the user's zoom whether zoomed in to a few candles or zoomed out to hundreds of bars.
3. **Symbol Switch Zoom Preservation**:
   - Before destroying a chart on symbol change, `useChartLifecycle.ts` captures the active `ChartTimeScaleState` (`barSpacing`, `visibleBars`, `rightOffset`) into `preservedTimeScaleRef`.
   - `resolvePreservedTimeScale` in `useChartStateRefs.ts` carries over the zoom ratio (excluding `lastVisibleTime` and historical `scrollPosition`) so `frameLatestCandles` preserves the user's exact candle zoom across coin switches while price-scale `autoScale` remains governed by `chartPrefs.autoScale`.
4. **Primary Timeframe Background Prefetching**:
   - `useChartViewportController` prefetches primary intervals (`15m`, `30m`, `1h`, `4h`, `1d`) via `prefetchCandles(queryClient, ...)`.
   - On the very first timeframe switch, candles are already cached in TanStack Query memory, guaranteeing zero-flash instant transitions.
5. **High-Timeframe Multiplier-Safe Live Edge Detection**:
   - On `1d` charts, normal mouse wheel zoom shifts scroll position by -3 to -10 bars without leaving the current market view.
   - Live edge detection verifies whether the latest bar (`totalBars - 1`) is within the visible viewport bounds or within 30 bars of the right edge, preventing accidental historical anchoring.
6. **Infinite Re-render Loop & CPU Glitch Elimination (`useRealtimeEffects.ts` & `ChartPanel.tsx`)**:
   - `makeRtCtx` Reference Stability: The `refs` wrapper object is excluded from the `useCallback` dependency array (`[colors, timeframe, selectedSymbol, queryClient]`) because all ref members are stable `useRef` instances, preventing function reference changes on every render.
   - Gated `setLegend`: `setLegend(legendFromSeries(...))` is strictly gated inside the `if (isNewChart || lastSetDataKeyRef.current !== chartDataKey)` branch, preventing state-update cascades that cause `Maximum update depth exceeded` and canvas freezing.
7. **Clean Instrument Switch & Price Scale Rescaling (`useRealtimeEffects.ts` & `useIndicators.ts`)**:
   - Switching instruments (e.g. BTC to SOL) purges stale Bid/Ask lines and cleans up attached indicator overlay series.
   - When indicator lines are removed, `useIndicators.ts` triggers `chart.priceScale("right").applyOptions({ autoScale: true })` and `chart.timeScale().applyOptions({})`, preventing BTC's vertical scale from squishing lower-priced coins into a flat line.

---

## 9. Price Scale Wheel Zoom & Boundary Clamping (`chartWheelHandler.ts`)

- **Vertical Price Scale Wheel**:
  - `handlePriceScaleWheel` intercepts wheel events over the right price scale bar (`~80px` wide).
  - Calculates logarithmic zoom anchored at the cursor's price coordinate (`p0`), expanding or contracting the vertical price range without affecting time scale.
- **Horizontal Zoom Boundary Clamping**:
  - `createChartWheelHandler` intercepts wheel events on the chart container.
  - When the oldest loaded historical bar is in view (`barsBefore <= 0` or `logicalRange.from <= 0`) and no further historical data exists, zoom-out (`deltaY > 0`) is intercepted and prevented, eliminating blank space drifts.

---

## 10. Volume Footprint Order Flow Subsystem (`src/lib/chart-plugins/footprint/`)

- **Attachment & Lifecycle (`useFootprintAttachment.ts`)**:
  - Mounts `FootprintPrimitive` to the active `CandlestickSeries`.
  - When `chartType === "footprint"`: sets candle body and borders to transparent (revealing the central candle wicks and inner footprint clusters) and widens `barSpacing` to 72px for cluster legibility.
  - When returning to `"candles"`: restores candle opacity and returns `barSpacing` to standard 14px.
- **Generator (`footprint-generator.ts`)**:
  - Generates price-level volume clusters strictly bounded between `candle.low` and `candle.high`.
  - Exactly conserves Binance buy/sell volume and delta per candle.
  - Flags Point of Control (POC) level with maximum volume and computes diagonal volume imbalances ($\ge 2.5\times$).
- **Renderer (`footprint-renderer.ts`)**:
  - **Candle Structure**: TradingView-styled central candle body with wicks and dotted High/Low ticks.
  - **Volume Ladder**: Flanking Bid $\times$ Ask columns with proportional histogram fills and imbalance highlights.
  - **POC Highlight**: High-contrast solid black POC box (`#000000`) with 1.5px white border and extension lines.
  - **Bottom Readout**: Dynamically anchored below `maxBarY` (lowest pixel of clusters and wicks), rendering centered Sell/Buy totals followed by a compact high-contrast card (`rgba(18, 22, 34, 0.94)`) containing signed Delta and Total volume.

---

## 11. Liquidation Heatmap Subsystem (`src/lib/chart-plugins/heatmap/`)

- **Attachment & Lifecycle (`useHeatmapAttachment.ts`)**:
  - Mounts `HeatmapPrimitive` to the active `CandlestickSeries`.
  - When `chartType === "heatmap"`: enables the primitive and maintains crisp candlestick borders on top of the heatmap canvas.
  - When switching modes: deactivates rendering cleanly.
- **Generator (`heatmap-generator.ts`)**:
  - `generateHeatmapGrid`: Constructs a continuous 2D liquidation density matrix $N \times M$ ($N$ candle columns $\times$ $M$ price rows).
  - Accumulates leveraged liquidation volume ($10x, 25x, 50x, 100x$) chronologically across candles into active long and short buckets with Gaussian-like price distribution.
  - Price sweeps: When a candle low touches or breaches a price bucket, long pools wipe out instantly; when a candle high touches or breaches a short bucket, short pools wipe out instantly, creating sharp vertical sweep cutoff lines.
  - Supports CoinGlass Sensitivity presets (`high`, `medium`, `low`) controlling noise threshold and saturation ceiling.
- **Primitive (`heatmap-primitive.ts`)**:
  - Custom `ISeriesPrimitive` implementing `zOrder(): "bottom"` to project liquidation bands behind candlesticks, wicks, and drawing tools without obstructing interaction.
  - Offscreen GPU Canvas: Rasterizes the $N \times M$ matrix into an offscreen canvas texture using 2D `ImageData`.
  - Stretches and maps offscreen canvas texture to exact media coordinates using hardware-accelerated bilinear smoothing (`imageSmoothingQuality = "high"`).
  - Subscribes to `crosshairMove` to provide real-time hover inspection (date/time, price, and liquidation leverage volume).
- **Renderer (`heatmap-renderer.ts`)**:
  - Fills pane background with authentic CoinGlass deep dark eggplant purple (`#201936`).
  - Draws continuous 2D thermal field with GPU bilinear interpolation:
    - Peak: Radiant Cream Yellow (`#eaf3c3`)
    - Upper: Soft Light Green (`#9ecba9`)
    - Mid: Seafoam Teal (`#529994`)
    - Lower: Petrol Navy Blue (`#2b5c77`)
    - Baseline: Deep Dark Eggplant (`#201936`)
  - Left Color Scale Bar: Vertical scale bar with 0 to peak volume readouts (`M`, `K`).
  - Crosshair Hover Card: Floating dark card (`rgba(16, 20, 31, 0.94)`) displaying formatted date, price, and exact liquidation volume at the cursor.
- **Settings Modal (`ChartTypeSettingsModal.tsx` & `HeatmapSettingsTab.tsx`)**:
  - Quick-access gear icons in the toolbar and within the `ChartTypeSelector` dropdown provide full controls:
    - **Sensitivity**: `[ High ]`, `[ Medium ]`, `[ Low ]` quick presets.
    - **Intensity & Brightness**: `1.0x` – `5.0x` slider.
    - **Band Thickness / Height**: `3px` – `24px` slider.
    - **Minimum Visibility Floor**: `10%` – `80%` slider.
    - **Color Themes**: `CoinGlass`, `Plasma`, `Inferno`.
    - Visual order intensity color guide explaining what each color level represents.

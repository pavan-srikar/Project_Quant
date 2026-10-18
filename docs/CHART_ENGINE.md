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
├── chartHistoryLoader.ts        # Infinite scroll & left-edge pagination trigger
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
   - Primary `CandlestickSeries` with `#089981` (bullish) and `#f23645` (bearish) styling.
   - Secondary `HistogramSeries` for volume on an overlay scale with `scaleMargins: { top: 0.82, bottom: 0 }`.
   - Dashed Bid and Ask price lines created on `candleSeries.createPriceLine`.

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
When switching timeframes on the *same symbol* while scrolled back into history, `useTradingStore.chartViewportTarget` stores the historical target center timestamp and visible bar count. `useCandleDepthLoader` calculates a dedicated `[fromMs, toMs]` window around this center timestamp and requests it directly via `useCandles` (`fetchBinanceKlinesRange`).
The historical candles for the new timeframe load centered directly on the user's historical position. `frameHistoricalViewport` synchronously sets the logical range and computes the exact `minPrice` and `maxPrice` of the visible slice, preventing flashes to the live edge, vertical scale mismatches (e.g. 150k vs 67k), and auto-crawling cascades.

---

## 5. Infinite Historical Loading (`chartHistoryLoader.ts`)

- Monitors `timeScale.subscribeVisibleLogicalRangeChange()`.
- When `logicalRange.from <= LOAD_MORE_THRESHOLD (20)` AND the user is actively panning/zooming (`hasUserPannedOrZoomedRef.current === true`), fires `fetchOlderRange()`.
- Automated or programmatic re-framing passes cannot trigger background fetches.
- Fetches older historical candles and prepends them via `setHistoricalExtra` without moving the user's viewport or triggering re-frame cascades.

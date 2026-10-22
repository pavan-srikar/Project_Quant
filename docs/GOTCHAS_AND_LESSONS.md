# Critical Gotchas & Architectural Lessons

This document catalogs non-obvious engineering gotchas, solved bugs, and architectural rules discovered in Project Quant.

---

## 1. Lightweight Charts Gotchas

### A. Non-Monotonic Timestamps Crash the Canvas
- **Gotcha**: If `series.setData()` or `series.update()` receives two identical timestamps or an out-of-order timestamp, Lightweight Charts throws an unrecoverable exception that white-screens the chart.
- **Fix**: All timestamps must be integer seconds (`Math.floor(ms / 1000)`). The data pipeline in `useChartDataPipeline.ts` runs a deduplication and sorting pass before any data reaches the series.

### B. Sub-Pixel Bar Collapse on Deep Zoom
- **Gotcha**: Zooming out too far causes bars to collapse below 1 physical pixel width, creating severe canvas flickering.
- **Fix**: Set `minBarSpacing: 1.5` in `chartConfig.ts` and clamp wheel zoom events in `chartWheelHandler.ts`.

### C. Right Price Scale Margins & Subchart Alignment
- **Gotcha**: Sub-chart indicator panes (RSI, MACD) in `BottomIndicatorsPanel` will visually misalign with `mainChart` if price scale label widths differ (e.g. 5-digit BTC price vs 2-digit RSI number).
- **Fix**: Both charts enforce `minimumWidth: 80` on `rightPriceScale`, ensuring identical canvas widths and 1:1 vertical crosshair alignment.

### D. Subchart Lifecycle & Series Rebuilding on Symbol Change
- **Gotcha**: When `mainChart` changes (which occurs on symbol changes), `useIndicatorChart` was previously including `mainChart` in its dependency array, destroying and recreating the sub-chart canvas. Meanwhile, `useIndicatorSeries` retained `seriesStateRef.current` pointing to series from the destroyed chart instance. When switching to cached coins (like BTC or ETH) where candles are immediately available, `isSameSeries` evaluated to `true`, attempting to `setData()` on the old destroyed series, leaving the new sub-chart canvas empty with no series attached.
- **Fix**: 
  1. Remove `mainChart` from `useIndicatorChart` dependencies and use `mainChartRef.current` for initial alignment so the sub-chart canvas is not torn down on symbol changes.
  2. Store `chart` instance in `SeriesState` and require `state.chart === chart` in `isSameSeries` so any chart recreation automatically triggers a full series rebuild on the active chart instance.
  3. Pass `chartEpoch` to `useIndicatorSeries` and include it in its dependencies.
  4. Synchronize `visibleLogicalRange` with `mainChart` immediately and on RAF in both update and rebuild paths.

---

## 2. React & High-Frequency State Gotchas

### A. React Re-render Thrashing on 50ms Ticks
- **Gotcha**: Subscribing whole components to `useTradingStore` causes the entire DOM tree to re-render at 20 FPS, causing high CPU usage.
- **Fix**: Always use atomic selectors: `useTradingStore((s) => s.ticks[symbol])`. For canvas elements, bypass React entirely and update the series imperatively.

### B. Stale Closures in Chart Event Callbacks
- **Gotcha**: Lightweight Charts event listeners registered on chart creation capture initial component state in closures.
- **Fix**: Store mutable reactive state in ref objects via `useChartStateRefs.ts` and `useDrawingManagerRefs.ts`.

### C. Coalescing Cache Invalidations
- **Gotcha**: Rapid WebSocket order fills can trigger multiple TanStack Query refetches per second.
- **Fix**: `coalesceInvalidation.ts` coalesces invalidations within a 100ms debounce window.

---

## 3. Architecture & Refactoring Rules

### A. The 300-Line Limit
- Every file in `src/` must remain under 300 lines.
- If a file grows, extract submodules by responsibility (e.g. types, state hooks, math helpers, subcomponents).

### B. Backward-Compatible Facade Barrels
- When decomposing large files (e.g. `TradingPage.tsx`, `ChartPanel.tsx`, `manager.ts`), leave a 1-line facade re-export at the original file path:
  ```ts
  export { TradingPage } from "./trading-page/TradingPage";
  export default TradingPage;
  ```
- This prevents broken imports across tests, routes, or consumers.

### C. Single Source of Truth for Utilities
- Never duplicate helper functions (`getErrorMessage`, `formatNumber`, `hexToRgba`). Import from `src/lib/utils.ts`.

### D. Always Consult ARCHITECTURE.md
- AI agents and engineers must read `docs/ARCHITECTURE.md` before starting any task to inspect only relevant files without scanning the entire repo.

---

## 4. Sub-Chart & Viewport Lessons

### A. Series State Leaks on Destroyed Lightweight Charts Instances
- **Symptom**: When switching between cached coins (e.g., BTC to ETH), indicator sub-charts (like RSI) appeared blank until toggled to MACD and back.
- **Root Cause**: `mainChart` recreation triggered `useIndicatorChart` to destroy and rebuild the sub-chart canvas. However, `useIndicatorSeries` kept `seriesStateRef.current` because `type` and `settingsKey` were identical. It attempted to update series on the old, destroyed chart instance.
- **Fix**: Always include the active `chart: IChartApi` reference inside `SeriesState`. If `seriesStateRef.current.chart !== chartRef.current`, force a complete series rebuild on the new chart instance.

### B. Auto-Collapse Effects Causing Tab Flashing Glitches
- **Symptom**: Clicking the "Indicators" tab in the bottom bar instantly collapsed in a split second.
- **Root Cause**: An aggressive `useEffect` monitored `bottomTab === "indicators" && !hasBelowIndicators` and immediately called `setIsBottomCollapsed(true)`.
- **Fix**: Avoid auto-collapsing active tabs. Instead, render a clean, non-interactive empty state message explaining how to add indicators from the top toolbar.

### C. Persistent Memory for Active Indicators
- **Rule**: Never leave active indicators in volatile React state (`useState([])`). Persist active indicators in `ChartPreferences` (`useChartPreferences.ts`) with direct synchronous `localStorage` fallback so page refreshes and browser reloads seamlessly restore both overlay lines and sub-chart oscillators.

---

## 5. Historical Data & Viewport Pagination Lessons

### A. Live-Tick Contamination of Historical Datasets ("Long Ass Candle")
- **Symptom**: Viewing historical candles (e.g. August at \$78,964) rendered an impossible giant vertical candle jumping to the live Bitcoin price (\$83,316).
- **Root Cause**: `applyTick` and `applyServerCandle` unconditionally updated `lastCandle.current` with the incoming live tick price without checking if the dataset was at the live edge. Furthermore, the staleness watchdog noticed the last bar was older than 2 intervals and repeatedly invalidated React Query every 1.5s, flooding the network.
- **Fix**: Guard all candle mutations and stale watchdog refetches with `isSeriesAtLiveEdge(lastBarTimeSec, timeframe)`. If the active dataset is historical, incoming live ticks do not append or mutate bars. Real-time Bid/Ask lines and header badges continue updating without corrupting the historical candlestick series.

### B. Unidirectional Pagination Causing Forward Voids
- **Symptom**: Scrolling forward on a historical chart or switching timeframes while viewing past data left an empty black void on the right where forward candles would not load.
- **Root Cause**: `makeHistoryLoader` only listened for left-edge scroll (`barsBefore <= 20`). When viewing past windows, the right edge was treated as a dead end.
- **Fix**: Added bidirectional loader with `isLoadForwardEligible(logicalRange, totalBars, newestBarMs)` that detects rightward scrolling (`barsAfter <= 25`) on past data and fetches newer slices via `candleRepository.fetchNewer()`. Bars are smoothly appended to the series without synthetic logical range offsets.

### C. Single-Consumption Framing Targets vs. Recursive Scroll Loops
- **Symptom**: Zooming out on 4h and switching to 30m caused the chart to slowly scroll backwards indefinitely every 500ms.
- **Root Cause**: `pendingHistoricalTargetRef.current` was never reset to `null` after framing. Each data update or prepended chunk re-executed `useRealtimeEffects`, re-framed the target, and tripped `barsBefore <= 20` again in a loop. Additionally, wheel interactions on sub-charts lacked a timeout, permanently locking `isSubInteractingRef`.
- **Fix**: 
  1. Set `pendingHistoricalTargetRef.current = null` immediately upon framing.
  2. Increase default historical window to 2000 bars centered symmetrically so the initial frame does not land within the 20-bar load threshold.
  3. Add a 1500ms debounce reset to sub-chart wheel events.

### D. Circular Import Trap Between Zustand and Repository
- **Symptom**: Importing `useTradingStore` inside `candleRepository.ts` caused a circular bundle dependency: `candleRepository` $\rightarrow$ `useTradingStore` $\rightarrow$ `api.ts` $\rightarrow$ `demo/candles.ts` $\rightarrow$ `candleRepository`, leaving `candleRepository` undefined during test bootstrap.
- **Fix**: Keep low-level data repositories strictly decoupled from Zustand store modules. Pass state downwards via standalone exported functions (`setRepositoryAnchor`) called by the coordinator hook (`useChartViewportController`).

---

## 6. Viewport Synchronization & Timeframe Transition Gotchas

### A. Lightweight Charts `setVisibleLogicalRange` Overwrites `barSpacing`
- **Trap**: When attempting to preserve zoom ratio (`barSpacing`), calling `timeScale.setVisibleLogicalRange({ from, to })` internally calculates and overwrites `barSpacing = containerWidth / (to - from)`.
- **Fix**: Always apply `timeScale.applyOptions({ barSpacing, rightOffset })` **after** setting the logical range, followed by `scrollToPosition`.

### B. High-Timeframe Multiplier Trap (e.g. `1d` $\to$ `30m`)
- **Trap**: On daily charts (`1d`), each candle spans 86,400s. Standard wheel zooming or slight panning easily shifts `scrollPos` by -3 to -10 bars (just a few days). A rigid threshold like `scrollPos >= -2` treats this normal view as historical, anchoring the chart 40 days in the past. In `30m` candles, 40 days is $\approx 1,920$ bars, causing unexpected network fetches and violent viewport flashes.
- **Fix**: Verify whether the latest candle index (`totalBars - 1`) is within the visible viewport bounds (`latestBarIdx >= lr.from - 10 && latestBarIdx <= lr.to + 50`) or within 30 bars of the right margin (`scrollPos >= -30 || lr.to >= totalBars - 30`).

### C. Pre-emptive Price Range Lock Before `setData`
- **Trap**: Calling `series.setData()` immediately triggers Lightweight Charts' internal auto-scaler if `autoScale` is enabled, causing a visible 1-frame price scale jump before post-data effects can run.
- **Fix**: Lock `chart.priceScale("right").applyOptions({ autoScale: false })` and apply `setChartPriceRange(chart, preservedPriceRange)` *synchronously before* `series.setData()`.


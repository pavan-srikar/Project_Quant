# Critical Gotchas, Lessons Learned & Edge Cases

This document records the most important traps, bugs, and edge cases encountered in the Project_Quant codebase. **Any AI assistant or developer modifying this codebase should review this document before making changes to chart rendering, data feeds, or synchronization.**

---

## 1. The Two-Phase Depth Load & Logical Range Desync

### The Symptom:
When switching coins or searching a new symbol (especially on `4h` with indicators active), the new coin loaded with a single candle jammed at `x = 14px` on the far left edge of the chart, with the rest of the canvas (~1000px) displaying blank empty space.

### Root Cause:
1. `TradingPage.tsx` uses a two-phase depth load: it first sets `candleLimit = 400` (first paint), then 400ms later upgrades `candleLimit = 4380` (deep history).
2. On initial paint (400 bars), `ChartPanel.tsx` framed the chart (`isNewChart = true`).
3. 400ms later, the 4,380-bar response arrived. Because `selectedSymbol` and `timeframe` were unchanged, `isNewChart` was `false` and `initialLoadCompleteRef` was already `true`.
4. `ChartPanel.tsx` assumed this was a periodic background refetch and **skipped framing**!
5. `series.setData(4380)` loaded 4,380 bars into Lightweight Charts without updating the timeScale. Lightweight Charts shifted the visible range to `[4378, 4476]`, placing the latest candle (index 4379) at 1% of the screen width (`x = 14px`) and filling the rest with empty future space.

### The Fix:
- Track `lastRenderedBarCountRef` and `hasUserPannedOrZoomedRef`.
- `shouldReframe` evaluates to `true` whenever:
  ```ts
  const barCountJump = Math.abs(chartData.length - lastRenderedBarCountRef.current) > 50;
  const shouldReframe = isNewChart || isInitialLoad || (!hasUserPannedOrZoomedRef.current && barCountJump);
  ```
- In `TradingPage.tsx`, check `queryClient.getQueryData(...)` before setting `candleLimit` so previously cached coins start with deep history directly, avoiding unnecessary `4380 -> 400 -> 4380` cache swaps.

---

## 2. Sub-Chart Indicator Sync Clobbering Main Chart

### The Symptom:
When an oscillator indicator (Stochastic, MACD, RSI) was active in `BottomIndicatorsPanel.tsx`, switching coins or timeframes occasionally compressed `mainChart` into the left margin.

### Root Cause:
`BottomIndicatorsPanel.tsx` set up bidirectional timeScale synchronization between `mainChart` and the indicator sub-chart (`chart`).
When `indicatorData` was recomputed or `chart.timeScale().fitContent()` was called internally, the sub-chart fired `onSubRangeChange`, which executed `syncRange(chart, mainChart)`.
The sub-chart's uninitialized or `fitContent` range was pushed directly onto `mainChart`, overriding `mainChart`'s framing.

### The Fix:
- **One-way master-to-replica rule**:
  - `mainChart` ALWAYS pushes its visible logical range down to the indicator sub-chart (`onMainRangeChange`).
  - The sub-chart ONLY pushes its range back to `mainChart` if the user is actively dragging or wheeling the sub-chart container (`isSubInteractingRef.current === true`).
- Removed all fallback `fitContent()` calls on the sub-chart.

---

## 3. `ts.resetTimeScale()` Conflicting with `ts.setVisibleLogicalRange()`

### The Symptom:
Calling `ts.resetTimeScale()` followed by `ts.setVisibleLogicalRange({ from, to })` caused unpredictable framing, occasional stutter, or the logical range failing to take effect.

### Root Cause:
In Lightweight Charts (v4+), `resetTimeScale()` schedules an internal recalculation of bar spacing and offset. Calling `setVisibleLogicalRange()` immediately in the same tick causes competing updates.

### The Fix:
**Never call `resetTimeScale()` before setting a logical range.**
Directly compute the visible logical range and apply it:
```ts
const visibleBars = Math.min(barCount, 80);
const from = Math.max(0, barCount - visibleBars);
const to = barCount + 8;
ts.setVisibleLogicalRange({ from, to });
chart.priceScale("right").applyOptions({ autoScale: true });
```
Run `apply()` immediately, and follow up in `requestAnimationFrame(apply)` to ensure the layout pass locks it in after DOM reflows.

---

## 4. Zoom-Out Clamping Past Oldest Historical Data

### The Symptom:
When users zoomed out with the mouse wheel and all available candles were already visible, the chart continued zooming out infinitely, compressing candles against the left wall and leaving massive blank space on the right.

### Root Cause:
Lightweight Charts does not clamp zoom-out when all bars fit on screen.

### The Fix:
In `ChartPanel.tsx`, intercept wheel events during capture phase (`container.addEventListener("wheel", onWheel, { capture: true })`):
```ts
if (e.deltaY > 0) { // Zooming out
  const range = chart.timeScale().getVisibleLogicalRange();
  if (range && range.from <= 0) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    return; // Clamp zoom-out immediately
  }
}
```
Also set `minBarSpacing: 1.5` in chart options so candles never collapse into sub-pixel slivers.

---

## 5. Price Scale Width Mismatch & Crosshair Alignment

### The Symptom:
The vertical dashed crosshair line between `mainChart` and the bottom indicator sub-chart was misaligned by ~20 pixels.

### Root Cause:
Lightweight Charts auto-sizes the right price scale width based on the number of price digits.
`BTCUSD` on `mainChart` (e.g. price \$83,050.50) needs ~80px width, while `RSI` on `subChart` (values 0–100) only needs ~50px width. The different widths offset the time scales.

### The Fix:
In `BottomIndicatorsPanel.tsx`:
```ts
const mainWidth = mainChart.priceScale("right").width();
if (mainWidth > 0) {
  chart.applyOptions({ rightPriceScale: { minimumWidth: mainWidth } });
}
```

---

## 6. Monotonically Increasing Timestamp Invariant

### The Symptom:
Lightweight Charts throws an unrecoverable exception:
`Assertion failed: Value is not strictly monotonically increasing`.

### Root Cause:
- Millisecond timestamps mistakenly passed instead of second timestamps.
- Out-of-order live tick merges.
- Duplicate timestamps in historical candle chunks.

### The Fix:
- Always enforce integer second timestamps: `Math.floor(timeMs / 1000)`.
- Use `alignLineData()` to strictly align indicator points to candle times.
- Run deduplication before calling `series.setData()`:
  ```ts
  const uniqueBars = bars.filter((b, i, arr) => i === 0 || b.time > arr[i - 1].time);
  ```

---

## 7. Stale Closures with Live WebSocket Ticks

### The Symptom:
After switching from `BTCUSD` to `ETHUSD`, an incoming BTC tick momentarily updated ETH's active candle, corrupting the candle's price scale.

### Root Cause:
React `useEffect` callbacks closed over the previous `selectedSymbol`, `timeframe`, or `lastCandle`.

### The Fix:
- Invalidate tracking refs synchronously on `[selectedSymbol, timeframe]` changes:
  ```ts
  lastLoadKeyRef.current = "";
  lastCandleRef.current = null;
  liveCandleTsRef.current = 0;
  ```
- Store the latest live candle in `latestLiveCandleRef.current` rather than reading directly from state inside long-lived effects.

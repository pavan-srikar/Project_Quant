# Chart Engine & Viewport Lifecycle (`ChartPanel.tsx`)

This document details the inner workings of Project_Quant' core charting engine, powered by TradingView's **Lightweight Charts (v4.2.0)**. It covers chart creation, series pipelines, real-time candle aggregation, infinite history loading, viewport framing mathematics, and zoom clamping.

---

## 1. Lightweight Charts Setup & Options

The chart is instantiated inside a dedicated container element (`containerRef.current`) in `src/pages/trading/ChartPanel.tsx`:

```ts
const chart = createChart(container, {
  layout: {
    background: { type: ColorType.Solid, color: colors.background },
    textColor: colors.text,
    fontSize: 11,
    fontFamily: "var(--font-mono, monospace)",
  },
  grid: {
    vertLines: { color: colors.grid, visible: chartPrefs.showGrid },
    horzLines: { color: colors.grid, visible: chartPrefs.showGrid },
  },
  rightPriceScale: {
    borderColor: colors.grid,
    scaleMargins: { top: 0.06, bottom: 0.18 }, // Room for indicators and volume
    autoScale: true,
    minimumWidth: 80,
  },
  timeScale: {
    borderColor: colors.grid,
    timeVisible: true,
    secondsVisible: timeframe === "1m",
    rightOffset: timeframe === "1m" ? 10 : 6,
    minBarSpacing: 1.5, // Prevents sub-pixel bar collapse
    fixLeftEdge: false,
    fixRightEdge: false,
  },
});
```

### Series Hierarchy
1. **Candlestick Series** (`chart.addCandlestickSeries`): Primary price series with custom up/down body and wick colors (`#089981` up, `#f23645` down).
2. **Volume Histogram Series** (`chart.addHistogramSeries`): Placed on `priceScaleId: ""` with `scaleMargins: { top: 0.82, bottom: 0 }` so volume bars sit neatly in the bottom 18% of the pane without obscuring price action.
3. **Bid / Ask / Mid Price Lines** (`candleSeries.createPriceLine`): Real-time dashed lines displaying current spread, bid (`#0ecb81`), and ask (`#f6465d`).

---

## 2. Real-Time Candle Update Pipeline

The charting engine updates prices at three distinct frequency layers:

```
[Binance WebSocket / Simulated Feed]
              │
              ├── Real-time Ticks (~50ms) ──► applyTick() [O(1) series.update]
              │                               - Merges current tick into active bar
              │                               - Adjusts High/Low/Close & Mid price
              │
              ├── CandleUpdate Event (1-5s) ─► applyServerCandle() [Authoritative]
              │                               - Overwrites partial tick bar with server OHLCV
              │
              └── Historical Refresh (30s) ──► series.setData(chartData)
                                              - Reconciles historical gap
                                              - Reapplies buffered live bar
```

### Candle Data Normalization
- Lightweight Charts requires strictly monotonically increasing Unix timestamps (in seconds).
- `alignLineData` and `candleToLegend` ensure that all times are integer seconds (`Math.floor(ms / 1000)`).
- Duplicate timestamps will crash Lightweight Charts; the pipeline de-duplicates bars before calling `series.setData`.

---

## 3. Viewport Framing Mathematics (`frameLatestCandles`)

When switching symbols, changing timeframes, or expanding history, the chart must frame recent candles cleanly in the center with a comfortable right margin.

### The Algorithm:
```ts
function frameLatestCandles(chart: IChartApi | null, barCount: number): void {
  if (!chart || barCount <= 0) return;
  const ts = chart.timeScale();
  if (!ts) return;

  const apply = () => {
    try {
      const visibleBars = Math.min(barCount, 80);
      const from = Math.max(0, barCount - visibleBars);
      const to = barCount + 8; // 8 bars of right margin (TradingView style)
      ts.setVisibleLogicalRange({ from, to });
      chart.priceScale("right").applyOptions({ autoScale: true });
    } catch {
      try {
        ts.scrollToPosition(8, false);
      } catch {}
    }
  };

  apply();
  requestAnimationFrame(apply); // Locks in after DOM layout pass
}
```

### Why Logical Ranges over Time Ranges:
- **Logical Ranges** operate on bar indices (`0, 1, ..., N - 1`), irrespective of weekend gaps or missing intraday seconds.
- Setting `from: barCount - 80` guarantees exactly 80 candles span the viewport.
- Setting `to: barCount + 8` reserves 8 empty bars on the right, providing breathing room for live price lines and labels.
- **NEVER** call `ts.resetTimeScale()` directly before `setVisibleLogicalRange()`. `resetTimeScale()` queues an internal reset that fights `setVisibleLogicalRange()`.

---

## 4. Multi-Phase Load Framing Protection

`TradingPage.tsx` uses a two-phase depth load (400 bars on first paint, then up to 10,000 bars 400ms later). To prevent the chart from losing its framing during this transition:

```ts
const buffered = latestLiveCandleRef.current;
const isInitialLoad = !initialLoadCompleteRef.current;
const barCountJump = Math.abs(chartData.length - lastRenderedBarCountRef.current) > 50;
const shouldReframe = isNewChart || isInitialLoad || (!hasUserPannedOrZoomedRef.current && barCountJump);

lastRenderedBarCountRef.current = chartData.length;

if (!shouldReframe) {
  // Periodic background refetch — preserve user viewport!
  reapplyLive(buffered, ctx);
  return;
}

initialLoadCompleteRef.current = true;
frameLatestCandles(chartRef.current, chartData.length);
```

### Framing Rules:
1. **Always reframe** on `isNewChart` (new symbol or timeframe).
2. **Always reframe** on `isInitialLoad` (first batch of data).
3. **Reframe on depth expansion** (`barCountJump > 50`) **only if** `!hasUserPannedOrZoomedRef.current`.
4. If the user has manually dragged or wheeled away to examine past candles (`hasUserPannedOrZoomedRef.current === true`), background data refreshes **must not** reset their scroll position.

---

## 5. Infinite History Loading (`makeHistoryLoader`)

When a user scrolls left into the past, older bars are dynamically fetched and prepended:

1. `chart.timeScale().subscribeVisibleLogicalRangeChange(onRangeChange)` listens to scroll events.
2. `isLoadMoreEligible`: Triggers when `range.from < 50` (user is within 50 bars of the oldest loaded candle).
3. `fetchOlderRange(symbol, timeframe, toMs, state, onLoaded)` calls Binance API for bars prior to the oldest timestamp.
4. Prepends bars to `historicalExtra`: `setHistoricalExtra((prev) => [...bars, ...prev])`.
5. If the server returns empty bars, `state.noMoreData = true` is set to cease redundant network requests.

---

## 6. Zoom-Out Clamping & Price Scale Wheel Interaction

### Horizontal Zoom Clamping:
Lightweight Charts by default allows users to zoom out infinitely, causing all candles to compress into a 5-pixel sliver on the left wall with thousands of blank bars on the right.

Project_Quant clamps zoom-out via mouse wheel capture:
```ts
if (e.deltaY > 0) { // Zooming out
  const ts = chart.timeScale();
  const range = ts.getVisibleLogicalRange();
  if (range) {
    const isAtOldestEdge = range.from <= 0;
    if (isAtOldestEdge && (state.noMoreData || range.from <= 0)) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return; // Stop zoom-out immediately!
    }
  }
}
```

### Price Scale Vertical Zoom (`handlePriceScaleWheel`):
- When the mouse cursor is positioned over the right price scale bar (`e.clientX >= rect.right - priceScaleWidth`), horizontal time zooming is prevented.
- Instead, the vertical price axis scale is adjusted directly (TradingView behavior), expanding or condensing the price axis height.

# Market Data & Query Layer (`src/services/queries/` & `src/services/demo/binance/`)

This document details the market data pipeline, caching mechanisms, WebSocket bridge, and data normalization implemented in Project Quant.

---

## 1. Directory Structure

```
src/services/
├── market-data/                # Unified Market Data Subsystem (<220 lines each)
│   ├── index.ts                # Central barrel export
│   ├── types.ts                # Market data mode, query, and metadata interfaces
│   ├── binanceClient.ts        # Direct Binance v3 REST client with deduplication & offline fallback
│   └── candleRepository.ts     # Single Source of Truth for candles with contiguity checks
├── queries/                    # TanStack React Query hooks (<220 lines each)
│   ├── keys.ts                 # Deterministic query key factories
│   ├── market.ts               # useCandles, useTicker, useOrderBook
│   ├── trading.ts              # usePositions, useOrders, useTradeHistory
│   ├── accounts.ts             # useAccount, useAccounts
│   ├── journal.ts              # useJournalEntries, useCreateJournalEntry
│   ├── analytics.ts            # Performance analytics and win-rate queries
│   ├── features.ts             # Feature flags and terminal preferences
│   └── botAndNotifications.ts  # Trading bot status and alert notifications
├── demo/binance/               # Binance REST facade & ticker storage
│   ├── klines.ts               # Fetches historical OHLCV klines
│   ├── tickers.ts              # Fetches 24h ticker price change and volumes
│   ├── priceStorage.ts         # In-memory and localStorage cache for klines
│   └── symbolMapping.ts        # Maps standard pairs (BTCUSD -> BTCUSDT)
└── stores/                     # Zustand stores
    ├── useTradingStore.ts      # Live ticks, active candle, and replay state
    ├── watchlistSlice.ts       # Watchlist tabs, symbol ordering, and bookmarks
    └── useTickStore.ts         # Ultra-high-frequency symbol price quotes
```

---

## 2. Market Data Ingestion Pipeline

```
Binance Public REST API (api.binance.com)
            │ (on failure / offline)
            ▼
Bundled JSON Fallback (src/services/demo/data/*.json)
            │
            ▼
klines.ts ──► Normalize timestamps & volumes ──► priceStorage.ts Cache
                                                        │
                                                        ▼
                                             useCandles (React Query)
                                                        │
                                                        ▼
                                             Chart Data Pipeline
```

### Candle Normalization
Binance kline arrays `[time, open, high, low, close, volume, ...]` are mapped into strictly typed `Candle` objects:
- `time`: Normalized to integer seconds (`Math.floor(rawTime / 1000)`).
- `open`, `high`, `low`, `close`, `volume`: Converted from strings to floating-point numbers.
- Deduplication: Consecutive bars sharing identical timestamps are merged or dropped to prevent chart crashes.

---

## 3. WebSocket Integration (`src/components/market-data-bridge/`)

`MarketDataBridge.tsx` runs headlessly to connect live WebSocket feeds with stores and queries:
- `useMarketDataWs.ts`: Connects ticker streams and pushes updates directly into `useTradingStore.ticks`.
- `useAccountWs.ts`: Listens for margin and balance updates.
- `useOrderWsCache.ts` & `usePositionWsCache.ts`: Intercepts order fill and position liquidation events.
- `coalesceInvalidation.ts`: Debounces high-frequency WebSocket updates within 100ms windows, preventing React re-render thrashing.

---

## 4. Query Key Factory Pattern (`keys.ts`)

To avoid cache collision across symbols, timeframes, and replay states, all React Query keys use strongly typed factories:
```ts
export const queryKeys = {
  market: {
    candles: (symbol: string, tf: string, limit?: number, replayVer?: number) =>
      ["candles", symbol, tf, limit, replayVer] as const,
    ticker: (symbol: string) => ["ticker", symbol] as const,
  },
  trading: {
    positions: (accountId: string | null) => ["positions", accountId] as const,
    orders: (accountId: string | null) => ["orders", accountId] as const,
  },
};
```
- `placeholderData: keepPreviousData`: Preserves existing chart candles when expanding history from 400 to 10,000 bars, eliminating flash-of-empty-content.
- `staleTime: 30_000`: Historical candle data is cached for 30 seconds before triggering background refetch.

---

## 5. Unified Candle Repository & Contiguity Invariant (`src/services/market-data/`)

The `CandleRepository` is the terminal's Single Source of Truth for candlestick series. It enforces strict invariants to prevent data corruption and charting anomalies:

1. **Request Deduplication**: `binanceClient.ts` maintains an in-flight promise map (`inflightRequests`) keyed by `${symbol}:${interval}:${fromMs}:${toMs}`. Concurrent calls across components collapse into a single network fetch.
2. **Strict Contiguity Check (`areCandlesConnecting`)**: Two candle chunks are only stitched if the gap between them does not exceed 4 intervals or 4 calendar days (accounting for weekend forex closures). If disconnected, the repository replaces the current series with the requested chunk instead of creating Frankenstein charts (e.g., February candles placed directly next to October candles).
3. **Monotonic Timestamps**: Any candle array loaded into memory is validated for strict monotonic order (`t[i] > t[i-1]`). Duplicate timestamps are merged or discarded.
4. **Targeted Historical Windows (`loadHistoricalWindow`)**: When navigating to a specific historical date/timestamp, the repository fetches a centered window dynamically sized to cover the entire anchor time range plus buffer, providing instant navigation without loading millions of bars.
5. **Bidirectional Range Fetching (`fetchNewer` & `fetchHistoricalChunk`)**: Supports continuous scrolling both backward (into deeper history) and forward (towards newer dates and the live edge).

---

## 6. Viewport Synchronization Across Timeframes (`useChartViewportController.ts`)

TradingView never calculates bar index offsets across resolutions because bar counts differ drastically between timeframes (1 day = 1 bar in 1d, 6 bars in 4h, 48 bars in 30m).

Instead, the terminal uses **calendar-time viewport synchronization with rightmost candle pinning**:
- **Rightmost Candle Pinning**: The controller tracks the rightmost visible candle timestamp (`lastVisibleTime`, `lastVisibleEndTime`) and `rightMarginBars`. When switching timeframes, the rightmost visible candle is anchored at its exact position.
- **Zoom Ratio Preservation**: The exact `barSpacing` (candle pixel width) is captured and restored before setting series data, keeping the user's zoom ratio completely stable.
- **Vertical Price Range Preservation**: Visible price range `{ min, max }` is extracted via `getChartPriceRange()` and locked via `setChartPriceRange()`, preventing auto-scale jumps or price disorientation.
- **Timeframe Transition**: When switching timeframes (e.g. 4h to 30m or 1h):
  1. If the user is inspecting historical data (e.g. last year), the rightmost visible candle remains pinned in place at its historical timestamp without jumping to today.
  2. If the user is at the live edge (`rightBarIdx >= totalBars - 2 && rightMarginBars <= 20`), the chart locks to the live edge with right margin.
  3. Cooldown window (1500ms) and interaction state reset prevent backwards auto-scroll chaining.

---

## 7. Realtime Feed & Live Edge Isolation (`realtimeFeed.ts`)

Incoming live WebSocket ticks and 1s polling updates are isolated from historical charts via `isSeriesAtLiveEdge`:
- If the chart series ends at a historical date (e.g. several months or weeks ago), incoming live ticks **do not** append or mutate historical bars.
- Bid/ask price lines and badges continue updating in real-time, but the historical candle series remains pure with zero artificial "jump" candles.
- Once the user scrolls forward to the present day, live candle formation automatically resumes seamlessly.

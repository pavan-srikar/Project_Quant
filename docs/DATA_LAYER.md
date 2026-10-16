# Market Data & Query Layer (`src/services/queries/` & `src/services/demo/binance/`)

This document details the market data pipeline, caching mechanisms, WebSocket bridge, and data normalization implemented in Project Quant.

---

## 1. Directory Structure

```
src/services/
├── queries/                    # TanStack React Query hooks (<220 lines each)
│   ├── keys.ts                 # Deterministic query key factories
│   ├── market.ts               # useCandles, useTicker, useOrderBook
│   ├── trading.ts              # usePositions, useOrders, useTradeHistory
│   ├── accounts.ts             # useAccount, useAccounts
│   ├── journal.ts              # useJournalEntries, useCreateJournalEntry
│   ├── analytics.ts            # Performance analytics and win-rate queries
│   ├── features.ts             # Feature flags and terminal preferences
│   └── botAndNotifications.ts  # Trading bot status and alert notifications
├── demo/binance/               # Binance REST & WebSocket client
│   ├── klines.ts               # Fetches historical OHLCV klines from Binance API
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

# Market Data Layer & Caching (`queries.ts` & `binance.ts`)

This document details Project_Quant' market data pipeline, Binance REST and WebSocket integration, offline bundled data fallbacks, and TanStack React Query caching strategies.

---

## 1. Market Data Pipeline Overview

```
                        ┌────────────────────────┐
                        │   Binance REST API     │
                        │ (https://api.binance)  │
                        └───────────┬────────────┘
                                    │ (klines query)
                                    ▼
┌────────────────────────┐    ┌────────────────────────┐    ┌────────────────────────┐
│  Bundled Offline Data  │───►│  Candle Store / Cache  │◄───│  Live Feed / Simulator │
│ (data/*.json fallback) │    │  (candles.ts)          │    │  (feed.ts / WS)        │
└────────────────────────┘    └───────────┬────────────┘    └────────────────────────┘
                                          │
                                          ▼
                              ┌────────────────────────┐
                              │  TanStack React Query  │
                              │  (useCandles hook)     │
                              └───────────┬────────────┘
                                          │
                                          ▼
                              ┌────────────────────────┐
                              │  ChartPanel (View)     │
                              └────────────────────────┘
```

---

## 2. Binance REST Integration (`src/services/demo/binance.ts`)

Historical candlestick data is fetched directly from Binance:
- **Symbol Translation (`symbolToBinancePair`)**:
  - `BTCUSD` -> `BTCUSDT`
  - `ETHUSD` -> `ETHUSDT`
  - `SOLUSD` -> `SOLUSDT`
- **Timeframe Mapping**:
  - Project_Quant: `1m`, `5m`, `15m`, `30m`, `1h`, `4h`, `1d`, `1w`
  - Binance API intervals: `1m`, `5m`, `15m`, `30m`, `1h`, `4h`, `1d`, `1w`
- **Deep Multi-Year History Loading (`fetchBinanceKlinesRange`)**:
  - Binance caps single requests to 1,000 candles.
  - For long multi-year ranges (e.g. 10,000 bars on 15m), requests are partitioned into sequential 1,000-bar chunks with monotonic timestamps.
  - Chunks are stitched together seamlessly and cached in memory (`series.set(key, data)`).

---

## 3. Bundled Offline Fallbacks (`src/services/demo/data/*.json`)

To allow the terminal to function fully offline or survive Binance rate limits / geographic IP blocks:
- Project_Quant bundles JSON snapshots in `src/services/demo/data/`.
- Loaded eagerly via Vite:
  ```ts
  const fallbackModules = import.meta.glob<{ default: Candle[] }>("./data/*.json", { eager: true });
  ```
- If the live network request fails, `candles.ts` falls back immediately to the bundled series, guaranteeing zero blank chart screens.

---

## 4. Live Tick Feed & Aggregator (`src/services/demo/feed.ts`)

- Simulates realistic micro-structure price action around the latest known closing price.
- Emits ticks at ~50ms intervals.
- Dynamically calculates Bid and Ask using realistic instrument spreads (e.g. 0.5 pips on EURUSD, \$2.50 on BTCUSD).
- Aggregates raw ticks into the current active bar (`liveCandleUpdates`), tracking High, Low, Close, and Volume.

---

## 5. TanStack React Query Layer (`src/services/queries.ts`)

### A. Query Key Factory Pattern
All queries follow a deterministic key factory:
```ts
export const queryKeys = {
  accounts: {
    all: ["accounts"] as const,
    mine: () => [...queryKeys.accounts.all, "mine"] as const,
    detail: (id: string) => [...queryKeys.accounts.all, id] as const,
  },
  trading: {
    positions: (accountId: string) => ["positions", accountId] as const,
    orders: (accountId: string, status?: string) => ["orders", accountId, status] as const,
  },
  market: {
    symbols: ["symbols"] as const,
    candles: (symbol: string, tf: string) => ["candles", symbol, tf] as const,
  },
};
```

### B. Two-Phase Depth Query & Placeholder Data
When a user switches coins, Project_Quant loads a 400-bar first-paint snapshot and expands to deep history (e.g. 4,380 or 10,000 bars) 400ms later:
```ts
export function useCandles(symbol: string, timeframe: string, limit?: number, replayVersion?: number) {
  return useQuery<MarketDataCandlesPayload, Error, Candle[]>({
    queryKey: [...queryKeys.market.candles(symbol, timeframe), limit ?? "auto", replayVersion ?? 0],
    queryFn: () => api.getCandlesWithMeta(symbol, timeframe, limit),
    select: (data) => data.candles,
    staleTime: 30_000,
    placeholderData: (prev, prevQuery) => {
      // Keep previous data visible while the depth query is in-flight for the SAME symbol/tf!
      const prevKey = prevQuery?.queryKey;
      if (prevKey && prevKey[1] === symbol && prevKey[2] === timeframe) {
        return prev;
      }
      return undefined; // Blank out if symbol changed!
    },
  });
}
```

### C. Automatic Cache Upgrade in `TradingPage.tsx`
If deep history is already cached in memory for a coin, `TradingPage.tsx` checks `queryClient.getQueryData(...)` and loads `deepCandleLimit` immediately, skipping the 400-bar first-paint downgrade!

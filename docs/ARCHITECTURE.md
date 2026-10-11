# Project_Quant — System Architecture

This document provides a comprehensive technical overview of Project_Quant' system architecture, component hierarchy, state management, and runtime data flow. It is designed as an authoritative reference for AI coding agents and human engineers.

---

## 1. High-Level System Overview

Project_Quant is a client-side financial trading terminal and charting platform built with **React 19**, **TypeScript**, **Tailwind CSS**, **Zustand**, **TanStack React Query**, and TradingView's **Lightweight Charts (v4.2.0)**.

The terminal operates fully in-browser without requiring an external backend service for charting and paper trading:
- **Market Data Feed**: Pulls real historical OHLCV data directly from Binance REST API (`https://api.binance.com/api/v3/klines`) with local bundled JSON fallbacks (`src/services/demo/data/*.json`).
- **Live Pricing**: Pulls live price streams from Binance WebSocket / simulated tick generators, aggregating raw ticks into active candles at ~50ms cadence.
- **Paper Trading Engine**: An in-memory matching engine (`src/services/demo/engine.ts`) supporting market orders, limit/stop orders, leverage, mark-to-market margin calculation, unrealized/realized PnL, and position modification.
- **Event Bus**: Internal pub/sub (`src/services/demo/bus.ts`) broadcasting `TICK`, `POSITION_UPDATE`, `ORDER_FILLED`, `BALANCE_UPDATE`, and `REPLAY_EVENT` across components.

```
┌────────────────────────────────────────────────────────────────────────┐
│                               Project_Quant                               │
├────────────────────────────────────────────────────────────────────────┤
│                                App.tsx                                 │
│                                   │                                    │
│                              TradingPage                               │
│     ┌─────────────────────────────┼──────────────────────────────┐     │
│     ▼                             ▼                              ▼     │
│ ChartToolbar                 ChartPanel                    Watchlist   │
│ (Timeframes, Tools)      (Main Candlestick Canvas)       (Symbols, Bid/│
│                                   │                       Ask, Change) │
│                                   ▼                                    │
│                          BottomIndicatorsPanel                         │
│                       (RSI, MACD, STO, ATR, etc.)                      │
│                                   │                                    │
│                                   ▼                                    │
│                              BottomPanel                               │
│                 (Positions, Orders, Journal, Replay)                   │
├────────────────────────────────────────────────────────────────────────┤
│ State & Query Layer                                                    │
│  - useTradingStore (Zustand: ticks, symbols, live updates, replay)     │
│  - useAuthStore (Zustand: session, demo account)                       │
│  - useChartPreferences (localStorage: themes, watermark, legend)       │
│  - useChartDrawings (localStorage: drawings, magnet mode)              │
│  - TanStack React Query (useCandles, usePositions, useOrders)          │
├────────────────────────────────────────────────────────────────────────┤
│ Execution & Feed Engine (In-Browser)                                   │
│  - binance.ts (Binance REST API + WebSocket feed)                      │
│  - feed.ts (Tick aggregator & price publisher)                         │
│  - engine.ts (Paper trading matching engine & margin calculator)       │
│  - bus.ts (Internal pub/sub event bus)                                 │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Directory Structure

```
Project_Quant/
├── docs/                       # Comprehensive documentation suite
│   ├── ARCHITECTURE.md         # (This file) High-level system architecture
│   ├── CHART_ENGINE.md         # Lightweight Charts, framing, candle pipeline
│   ├── INDICATORS.md           # Technical indicators, subchart synchronization
│   ├── DRAWINGS_AND_PLUGINS.md # Drawing tools, geometric primitives, hit testing
│   ├── TRADING_ENGINE.md       # Orders, positions, execution, margin & PnL
│   ├── DATA_LAYER.md           # Market data feeds, Binance integration, caching
│   ├── UI_AND_STYLING.md       # Watchlist, layouts, themes, responsive design
│   └── GOTCHAS_AND_LESSONS.md  # Critical gotchas, bugs fixed, and best practices
├── src/
│   ├── components/             # Reusable modal dialogs and UI elements
│   │   ├── ConnectionIndicator.tsx  # WebSocket / feed latency indicator
│   │   ├── SymbolSearchModal.tsx    # Symbol search modal with Binance search
│   │   ├── IndicatorSettingsModal.tsx # Indicator inputs and color config
│   │   ├── TradingDialogs.tsx       # Order entry / modify dialog wrappers
│   │   └── trading-dialogs/        # OrderModify, PositionModify, Calculator
│   ├── hooks/                  # Global reactive hooks
│   │   ├── useChartDrawings.ts      # Drawing shapes persistence
│   │   ├── useChartPreferences.ts   # Chart preferences (watermark, OHLC legend)
│   │   ├── useIndicatorSettings.ts  # Indicator parameters & colors
│   │   └── useTradeSound.ts         # Audio feedback on order fill / SL hit
│   ├── lib/
│   │   ├── chart-plugins/          # Custom Lightweight Charts primitives
│   │   │   ├── drawing-tools/      # Trendlines, Fib, Rectangles, Text, etc.
│   │   │   ├── bands-indicator/    # Bollinger Bands custom series
│   │   │   ├── delta-tooltip/      # Multi-touch candlestick inspector
│   │   │   └── session-breaks/     # Market session vertical boundaries
│   │   ├── indicators.ts           # Pure mathematical indicator formulas
│   │   └── livePnl.ts              # Real-time position PnL computation
│   ├── pages/
│   │   ├── TradingPage.tsx         # Main master page container
│   │   └── trading/                # Terminal panels
│   │       ├── ChartPanel.tsx      # Main chart view & candlestick series
│   │       ├── BottomIndicatorsPanel.tsx # Separate sub-chart for oscillators
│   │       ├── BottomPanel.tsx     # Tabbed tray: Positions, Orders, Journal
│   │       ├── WatchlistPanel.tsx  # Watchlists, quotes, bid/ask, % change
│   │       ├── OrderPanel.tsx      # Fast order entry sidebar
│   │       ├── DrawingToolRail.tsx # Left tool selector rail
│   │       └── ChartToolbar.tsx    # Top bar: symbol, timeframe, indicators
│   └── services/
│       ├── api.ts                  # Central API facade (delegates to demo/api)
│       ├── queries.ts              # TanStack React Query hooks and query keys
│       ├── store.tsx               # Zustand stores (useAuthStore, useTradingStore)
│       ├── ws.ts                   # WebSocket client abstraction
│       └── demo/                   # In-browser paper-trading implementation
│           ├── engine.ts           # Order book, matching, position manager
│           ├── binance.ts          # Binance REST klines & search client
│           ├── feed.ts             # Live tick simulator & candle aggregator
│           └── candles.ts          # Bundled offline candles + Binance cache
```

---

## 3. Application Lifecycle (`App.tsx` -> `TradingPage.tsx`)

1. **Bootstrapping (`App.tsx`)**:
   - `App.tsx` initializes `useAuthStore.demoLogin()`.
   - Clears demo gates: `localStorage.setItem("is_demo", "false")`.
   - Executes `Promise.all([loadSymbols(), loadAccounts()])`.
   - Once resolved, sets `ready = true` and renders `<TradingPage />`.

2. **Master Container (`TradingPage.tsx`)**:
   - Manages top-level active symbols (`selectedSymbol`), active timeframe (`timeframe`, defaults to `"15m"`), and layout toggles.
   - Computes `deepCandleLimit` (1-year history: 10,000 bars for intraday, 4,380 bars for 4h, 1,000 for 1d) vs `firstPaintCandleLimit` (400 bars).
   - Queries historical candles via `useCandles(selectedSymbol, timeframe, candleLimit)`.
   - Connects live prices from `useTradingStore((s) => s.ticks[selectedSymbol])` and `liveCandleUpdates`.
   - Instantiates `mainChart` reference via callback `onChartReady={setMainChart}`, passing it down to `BottomPanel` and `BottomIndicatorsPanel`.

---

## 4. State Management Strategy

### A. Zustand (`useTradingStore`)
Used for ultra-high-frequency real-time state:
- `ticks`: Current bid, ask, spread, and timestamp per symbol. Updated on every tick (~50ms).
- `liveCandleUpdates`: In-progress live candle for `${symbol}:${timeframe}`.
- `watchlists` & `activeWatchlistId`: User-created watchlist tabs and symbol ordering.
- `flaggedSymbols`: Fast bookmark list.
- `isReplaying`, `replaySpeed`, `replayCursorTimestamp`: Historical bar-by-bar playback controls.

### B. TanStack React Query (`src/services/queries.ts`)
Used for asynchronous server state with intelligent caching:
- `queryKeys.market.candles(symbol, tf)`: Keyed as `["candles", symbol, tf, limit, replayVersion]`.
- Cached for 30s (`staleTime: 30_000`).
- Supports placeholder data preservation across depth queries (`placeholderData`) to prevent flash-of-empty-content when expanding from 400 to 10,000 bars.
- `usePositions(accountId)` and `useOrders(accountId)`: Track trading ledger with automated mutation invalidation.

### C. Local Storage Persistence (`src/hooks/`)
- `useChartPreferences`: Watermark toggle, grid lines, OHLC legend toggle, candle countdown timer, theme colors (`#131722` dark, `#ffffff` light), and magnet mode.
- `useChartDrawings`: Persisted drawings array keyed per symbol and timeframe.
- `useIndicatorSettings`: Period parameters, colors, overbought/oversold levels per indicator.

---

## 5. Event Flow & Communication Bus

Project_Quant utilizes a pub/sub event bus (`src/services/demo/bus.ts`) to avoid deep prop drilling and decoupled updates:

| Event Name | Source | Listeners | Payload |
|---|---|---|---|
| `TICK` | `feed.ts` | `useTradingStore`, `engine.ts` | `{ symbol, bid, ask, time }` |
| `CANDLE` | `feed.ts` | `useTradingStore` | `{ symbol, timeframe, candle }` |
| `ORDER_FILLED` | `engine.ts` | `TradingPage`, `useTradeSound` | `{ order, fillPrice }` |
| `POSITION_CLOSED`| `engine.ts` | `PositionsTable`, `useTradeSound`| `{ position, pnl }` |
| `SL_TP_HIT` | `engine.ts` | `ChartPanel`, Audio cues | `{ type: "SL" \| "TP", price }` |
| `REPLAY_EVENT` | `useReplayPlayback` | `ChartPanel`, `BottomPanel` | `{ timestamp, candle }` |

This architecture ensures zero lag between market price changes, chart candle updates, and paper trade execution.

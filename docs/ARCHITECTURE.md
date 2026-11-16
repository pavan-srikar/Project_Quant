# Project Quant — System Architecture

> **Rule for AI Agents & Engineers**:
> **Before any task, read this document to identify the subsystem, then immediately read the dedicated feature doc in `docs/`. Open ONLY the 1-2 source files relevant to the task. Never scan the whole repo. Whenever code or structure changes, update the corresponding feature doc and this index.**

---

## 1. Subsystem Routing Index

Use this index to jump straight to the dedicated documentation and exact source directory for any feature without scanning the codebase:

| Subsystem / Feature Area | Dedicated Feature Doc | Source Directories | Primary Entry Points |
| :--- | :--- | :--- | :--- |
| **Chart Viewport & Lifecycle** | [docs/CHART_ENGINE.md](./CHART_ENGINE.md) | `src/pages/trading/chart/` | `ChartPanel.tsx`, `chartConfig.ts`, `chartFraming.ts` |
| **Drawing Tools & Chart Plugins** | [docs/DRAWINGS_AND_PLUGINS.md](./DRAWINGS_AND_PLUGINS.md) | `src/lib/chart-plugins/` | `drawing-tools/manager.ts`, `heatmap/`, `footprint/` |
| **Technical Indicators & Pine Script** | [docs/INDICATORS.md](./INDICATORS.md) | `src/lib/indicators/`, `src/lib/pinescript/`, `src/pages/trading/bottom-indicators/` | `src/lib/indicators/index.ts`, `parser.ts`, `BottomIndicatorsPanel.tsx` |
| **Paper Trading, Orders & Dialogs** | [docs/TRADING_ENGINE.md](./TRADING_ENGINE.md) | `src/services/demo/engine/`, `src/pages/trading/order-panel/`, `src/components/trading-dialogs/` | `engine/orders.ts`, `OrderPanel.tsx`, `useTradingActions.ts` |
| **Market Data, Repository & Feeds** | [docs/DATA_LAYER.md](./DATA_LAYER.md) | `src/services/market-data/`, `src/services/demo/binance/`, `src/services/queries/`, `src/services/stores/` | `candleRepository.ts`, `useTradingStore.ts`, `MarketDataBridge.tsx` |
| **UI Layout, Toolbar, Panels & Theme** | [docs/UI_AND_STYLING.md](./UI_AND_STYLING.md) | `src/pages/trading-page/`, `src/pages/trading/`, `src/styles/`, `src/components/mobile-trading/` | `TradingPage.tsx`, `ChartToolbar.tsx`, `global.css` |
| **Historical Replay** | [docs/REPLAY_SYSTEM.md](./REPLAY_SYSTEM.md) | `src/pages/trading/` (Replay hooks & HUD) | `useReplayPlayback.ts`, `ReplayScrubber.tsx`, `ReplayHUD.tsx` |
| **Watchlist & Symbol Search** | [docs/WATCHLIST_AND_SEARCH.md](./WATCHLIST_AND_SEARCH.md) | `src/pages/trading/watchlist/`, `src/components/symbol-search/` | `WatchlistPanel.tsx`, `SymbolSearchModal.tsx`, `watchlistSlice.ts` |
| **Critical Gotchas & Bug Solutions** | [docs/GOTCHAS_AND_LESSONS.md](./GOTCHAS_AND_LESSONS.md) | Cross-cutting traps, subtle bugs, and proven fixes | Canvas crashes, stale closures, layout race conditions |
| **Engineering Conventions & Runbook** | [docs/CONVENTIONS.md](./CONVENTIONS.md) | Technology stack, coding style, 300-line limit | Test commands (`npm test`), build, and typecheck |

---

## 2. System Topology & Architectural Layers

Project Quant is a high-performance in-browser quantitative trading terminal built with **React 19**, **TypeScript**, **Tailwind CSS**, **Zustand**, **TanStack React Query**, and TradingView's **Lightweight Charts (v4.2.0)**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                              App.tsx                                   │
│                        (Auth / Bootstrap)                              │
│                                 │                                      │
│                                 ▼                                      │
│                      src/pages/TradingPage.tsx                         │
│             (Delegates to src/pages/trading-page/ coordinator)         │
├────────────────────────────────────────────────────────────────────────┤
│ Viewport & Layout Layer                                                │
│  ├── TradingPageHeader  ── Symbol search, connection, layout toggles   │
│  ├── ChartToolbar       ── Timeframe, chart type, indicator toggles    │
│  ├── DrawingToolRail    ── Vertical rail for drawing tools & magnets   │
│  ├── ChartPanel         ── Candlesticks, volume, price lines, plugins  │
│  ├── DrawingOverlay     ── Floating toolbars, drawing property dialogs │
│  ├── BottomIndicators   ── Sub-chart oscillators (RSI, MACD, STOCH)    │
│  ├── BottomPanel        ── Positions, active orders, trade journal     │
│  ├── WatchlistPanel     ── Live market quotes, bid/ask, % change       │
│  └── OrderPanel         ── Market, limit, stop order placement & risk  │
├────────────────────────────────────────────────────────────────────────┤
│ State, Query & Event Bus Layer                                         │
│  ├── useTradingStore    ── High-frequency ticks, candle updates, lists │
│  ├── useTickStore       ── Dedicated ultra-fast symbol ticker quotes   │
│  ├── useAuthStore       ── User session, demo credentials, balance     │
│  ├── TanStack Queries   ── useCandles, usePositions, useOrders cache   │
│  └── bus.ts (Pub/Sub)   ── TICK, ORDER_FILLED, POSITION_CLOSED events  │
├────────────────────────────────────────────────────────────────────────┤
│ Calculation & Execution Layer                                          │
│  ├── src/lib/indicators ── Pure math: SMA, EMA, RSI, MACD, BOLL, ATR   │
│  ├── src/lib/pinescript ── Parser, evaluator VM, forecast engine & {/} templates │
│  ├── src/lib/chart-plugins ─ Drawing tools, footprint, heatmap, pine primitive │
│  ├── src/services/demo/engine ─ In-memory matching engine, margin/PnL  │

│  └── src/services/market-data ─ CandleRepository, Binance REST client  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Communication Channels

Project Quant uses four distinct communication channels to maximize performance and decouple state:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Communication Channels                          │
├────────────────────────────────────────────────────────────────────────┤
│ 1. High-Frequency State (Zustand: useTradingStore, useTickStore)       │
│    • 50ms price updates, live tick bars, active watchlist selection.   │
│    • Subscribed via atomic selectors: (s) => s.ticks[symbol]           │
├────────────────────────────────────────────────────────────────────────┤
│ 2. Asynchronous Server State (TanStack React Query: useCandles, etc.)  │
│    • Historical candles, account ledgers, positions, orders.           │
│    • Automatic caching, background refetch, and stale-time management. │
├────────────────────────────────────────────────────────────────────────┤
│ 3. Decoupled Pub/Sub Event Bus (src/services/demo/bus.ts)              │
│    • Global events: TICK, ORDER_FILLED, POSITION_CLOSED, SL_TP_HIT.    │
│    • Connects matching engine execution to UI toasts and audio cues.   │
├────────────────────────────────────────────────────────────────────────┤
│ 4. Lightweight Charts Canvas Bridge (ChartPanel -> Primitives)         │
│    • Direct imperatively synced 60 FPS Canvas2D rendering.             │
│    • Custom primitives bypass React DOM for drawings, footprint, heat. │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. End-to-End Data Journeys

### A. Live Market Data Flow
```
Binance REST / Offline JSON ──► useCandles (React Query) ──► series.setData()
                                                                   │
Binance WebSocket / Simulated Feed                                 ▼
         │                                              Main Candlestick Canvas
         ▼                                                         ▲
      feed.ts ──► useTradingStore.ticks / liveCandleUpdates ───────┘
```
- Historical bars load initially (400 bars first paint, expanded to 10k bars via `CandleRepository`).
- High-frequency ticks (~50ms) push into `useTradingStore.ticks` and feed `series.update()` directly on Lightweight Charts.

### B. Order Placement & Execution Flow
```
User clicks Buy ──► OrderPanel ──► useTradingActions ──► engine.createOrder()
                                                               │
                                                               ▼
Audio cue / Toast ◄── bus.publish(ORDER_FILLED) ◄─── Match against Tick Price
         │                                                     │
         ▼                                                     ▼
React Query Invalidation ──► usePositions() updates ──► PositionsTable
```
- Orders submit to in-memory matching engine (`orders.ts`), validating margin via `accounting.ts`.
- Matched orders publish `ORDER_FILLED` to `bus.ts`, debounced by `coalesceInvalidation.ts` to invalidate React Query caches without render thrashing.

### C. Drawing Tool Placement & Interaction Flow
```
Rail Click ──► DrawingToolsManager.setTool("trendline")
                        │
                        ▼
Canvas PointerDown ──► PointerManager ──► PlacementController.start()
                        │
Canvas PointerMove ──► Snap to OHLC (magnet.ts) ──► Live Preview
                        │
Canvas PointerUp   ──► PlacementController.commit() ──► useChartDrawings (localStorage)
                                                           │
                                                           ▼
                                                DrawingsPrimitive Canvas2D render
```

---

## 5. Architectural Invariants & Maintenance Rules

1. **300-Line Limit**: Every source file in `src/` must remain strictly under 300 lines. Decompose large files into focused submodules with a facade barrel re-export.
2. **Zero Whole-Repo Scans**: Never run broad searches (`find`, `grep` across the whole codebase). Use Section 1 above to pinpoint the exact feature doc and files.
3. **Documentation Maintenance (Strict Invariant)**:
   - **Whenever code changes** (logic, types, UI, parameters, or new features), **ALWAYS update the corresponding feature doc in `docs/`** to keep documentation 100% in sync with the codebase.
   - If any file structure changes or a subsystem is decomposed, update the routing index in Section 1 above.

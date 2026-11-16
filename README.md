# Project_Quant

> This repo is made by depression, addiction and obsession.

> An open-source, high-performance financial trading terminal and charting platform built with **React 19**, **TypeScript**, **Tailwind CSS**, and TradingView's **Lightweight Charts (v4.2.0)**.
> 
> **Made by pavan_srikar** 

Project_Quant runs entirely client-side with no mandatory backend infrastructure. It features real historical OHLCV data from Binance, real-time live tick simulation, an in-memory paper trading execution engine, technical indicators, drawing tools, trade journaling, and market replay.

---

## ⚡ Quick Start

### Prerequisites
- Node.js 18+ (tested on Node 20+)
- npm or pnpm

### Development
```bash
# Install dependencies
npm install

# Start local dev server (port 5173)
npm run dev

# Run type checking
npm run typecheck

# Build for production
npm run build

# Run unit tests
npm test
```

The app will be available at `http://localhost:5173`.

---

## 📚 Complete Technical Documentation

The [`docs/`](./docs/) directory contains an in-depth technical documentation suite written specifically for engineers and AI coding assistants:

| Document | Purpose & Contents |
|---|---|
| [**Architecture**](./docs/ARCHITECTURE.md) | High-level system architecture, component hierarchy, Zustand stores, React Query data flow, and runtime event bus. |
| [**Chart Engine**](./docs/CHART_ENGINE.md) | Deep dive into Lightweight Charts, candlestick series, real-time tick aggregation, timeScale logical range framing mathematics, infinite history loader, and zoom clamping. |
| [**Indicators**](./docs/INDICATORS.md) | Technical indicators math (RSI, MACD, STO, ATR, CCI, WR, SMA, EMA, BOLL, VWAP), sub-chart zero-lag synchronization, master-replica protection, and UI rail UX. |
| [**Drawing Tools & Plugins**](./docs/DRAWINGS_AND_PLUGINS.md) | Custom geometry primitives (Trendlines, Channels, Fibonacci, Rectangles), coordinate projection (time/price <-> pixels), magnet snapping, hit-testing, and line-cross price alerts. |
| [**Trading Engine**](./docs/TRADING_ENGINE.md) | Paper trading matching engine, mark-to-market valuation, unrealized/realized PnL, interactive SL/TP drag on chart, prop firm challenge levels, and historical market replay. |
| [**Market Data Layer**](./docs/DATA_LAYER.md) | Binance REST API client, deep multi-year klines loader, bundled offline fallbacks (`data/*.json`), live feed simulation, and TanStack React Query caching strategies. |
| [**UI, Styling & Layouts**](./docs/UI_AND_STYLING.md) | Tailwind dark/light theme palette, Watchlist row layout, multi-watchlist tabs, resizable split panes, and video-game style HUD tooltips. |
| [**Gotchas & Lessons Learned**](./docs/GOTCHAS_AND_LESSONS.md) | **Crucial reading for AI and developers!** Detailed analysis of subtle failure modes, two-phase depth load framing traps, sub-chart sync clobbering, and Lightweight Charts invariants. |

---

## 🛠️ Key Architectural Highlights

### 1. Dual-Chart Master-Replica Synchronization
- **Main Chart** (`ChartPanel.tsx`): Displays candlesticks, volume bars, position lines, and overlay indicators.
- **Sub-Chart** (`BottomIndicatorsPanel.tsx`): Displays oscillators in a dedicated canvas.
- **Synchronization**: Logical ranges (`setVisibleLogicalRange`) and right price scale widths (`minimumWidth: mainWidth`) synchronize at 60 FPS, with user interaction safeguards preventing sub-charts from overwriting main chart viewports.

### 2. Multi-Phase Depth Loading & Framing Protection
- First paint requests 400 bars for instant rendering.
- Deep history (up to 10,000 bars) expands 400ms later.
- `shouldReframe` safeguards ensure the viewport cleanly frames the latest 80 candles with an 8-bar right margin without drifting into empty space.

### 3. In-Browser Autonomous Trading Engine
- Operates a full paper brokerage in-memory (`src/services/demo/engine.ts`).
- Supports Market, Limit, and Stop orders.
- Positions update mark-to-market on every tick.
- Traders can drag Stop Loss and Take Profit lines directly on the chart canvas.

### 4. Fully Functional Offline or Online
- Fetches live data from Binance REST and WebSockets.
- Includes pre-bundled historical data snapshots (`src/services/demo/data/*.json`) as automatic fallbacks when network connectivity is unavailable or rate-limited.

---

## 🤖 Instructions for AI Assistants (Pair Programming Rules)

When working on this codebase in future chats:
1. **Always refer to [`docs/GOTCHAS_AND_LESSONS.md`](./docs/GOTCHAS_AND_LESSONS.md)** before touching chart timeScale, series data, or indicator synchronization.
2. **Never call `ts.resetTimeScale()` directly before `setVisibleLogicalRange()`**.
3. **Never allow sub-charts to push logical ranges to `mainChart`** unless the user is actively dragging/wheeling the sub-chart container.
4. **Preserve timestamp monotonicity**: Lightweight Charts requires strictly increasing integer second timestamps (`Math.floor(ms / 1000)`).
5. **Always test builds with `npm run build`** after making edits.

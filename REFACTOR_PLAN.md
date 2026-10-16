# Project_Quant — Architectural Refactoring Plan (`REFACTOR_PLAN.md`)

This refactoring plan provides a comprehensive architectural assessment and migration strategy for **Project_Quant**.

> [!IMPORTANT]
> **Strict Invariants for the Refactor:**
> 1. **Zero Behavioral Changes:** The user interface, user experience, performance characteristics, and trading semantics must remain identical.
> 2. **No New Features:** Do not add unrequested functionality or speculative abstractions during refactoring.
> 3. **Public API & Storage Stability:** All public exports, store selectors, query keys, event bus payloads, localStorage keys, and schema definitions must remain stable. Any necessary alias or adapter is documented herein.
> 4. **Incremental Verification:** Every phase must independently pass TypeScript compilation (`npm run typecheck`), linting (`npm run lint`), and automated test execution (`npm test`).

---

## 1. Current Architecture & Overview of Big Files

Project_Quant is an in-browser financial charting terminal and paper trading platform built with **React 19**, **TypeScript 5.7**, **Tailwind CSS 3.4**, **Lightweight Charts (v4.2.0)**, **Zustand 5.0**, and **TanStack React Query 5.90**.

### Architectural Layers
1. **Presentation & Canvas Layer (`src/pages/trading/`, `src/components/`)**:
   - Primary candlestick chart canvas driven by Lightweight Charts.
   - Synchronized bottom oscillator pane (RSI, MACD, Stochastic, ATR, CCI, Williams %R).
   - Dynamic docking split panes (Order Panel, Watchlist, Bottom Tray).
2. **Drawing & Plugin Subsystem (`src/lib/chart-plugins/`)**:
   - Custom `ISeriesPrimitive` implementations for canvas rendering.
   - Vector geometry, hit-testing, coordinate transforms (Data Coordinates $\leftrightarrow$ Screen Pixels), and magnet snapping.
3. **Execution & Simulation Engine (`src/services/demo/`)**:
   - In-memory order book matching engine (`engine.ts`), margin accounting, and PnL valuation.
   - Binance REST historical klines loader (`binance.ts`) and live tick/candle simulation feed (`feed.ts`).
4. **State & Reactive Data Layer (`src/services/store.tsx`, `src/services/queries.ts`, `src/components/MarketDataBridge.tsx`)**:
   - Zustand stores for 50ms tick updates, live active candle aggregation, and watchlist persistence.
   - TanStack React Query for cached historical OHLCV data with two-phase depth loading.
   - Headless WebSocket event bridge performing optimistic cache surgery on React Query.

### System Big File Inventory (Files $\ge$ 300 Lines)

Across the repository, exactly **28 files** (27 TypeScript/TSX source files and 1 CSS file) exceed 300 lines of code:

| # | File Path | Lines | Current Responsibilities |
|---|---|---|---|
| 1 | `src/pages/trading/ChartPanel.tsx` | 2,526 | Core charting canvas, history pagination, real-time tick merging, SL/TP overlays, zoom clamping, legend HUD, plugins. |
| 2 | `src/pages/trading/BottomIndicatorsPanel.tsx` | 1,180 | Sub-chart oscillator instance, zero-lag timeScale sync, in-place series data updates, left indicator rail, settings triggers. |
| 3 | `src/services/queries.ts` | 1,158 | Monolithic query catalog containing all queries and mutations across accounts, trading, market, journal, AI trader, etc. |
| 4 | `src/lib/chart-plugins/drawing-tools/manager.ts` | 1,113 | Drawing tool state machine, mouse/touch/keyboard event dispatch, vertex dragging, magnet snapping, placement lifecycle. |
| 5 | `src/lib/chart-plugins/drawing-tools/renderers.ts` | 988 | Canvas 2D renderers for 12+ drawing tools (trendlines, fib, volume profile, positions, shapes, text, handles). |
| 6 | `src/pages/trading/WatchlistPanel.tsx` | 946 | Carousel tabs, burger menu, watchlist CRUD, drag-and-drop reorder, 24h ticker fetching, quick trading, quote rows. |
| 7 | `src/pages/TradingPage.tsx` | 932 | Master layout orchestrator, 30+ state hooks, two-phase depth load, dual split-pane resizing, modal triggers, keyboard hotkeys. |
| 8 | `src/pages/trading/DrawingToolsOverlay.tsx` | 878 | Three major UI components: floating drawing toolbar, comprehensive drawing settings dialog, and right-click context menu. |
| 9 | `src/services/store.tsx` | 780 | Dual Zustand stores (`useAuthStore`, `useTradingStore`), RAF tick batch buffer, watchlist localStorage persistence. |
| 10 | `src/pages/trading/ChartToolbar.tsx` | 722 | Header navigation bar, timeframe selector, drawing tools dropdown, plugins dropdown, indicators menu, symbol badge. |
| 11 | `src/lib/chart-plugins/drawing-tools/resolve.ts` | 556 | Coordinate projection, trendline angle/stats, ray extension, fib levels, fixed-range volume profile binning. |
| 12 | `src/pages/trading/OrderPanel.tsx` | 516 | Order entry sidebar, side toggles, type selectors, lot sizing presets, margin estimation, validation, order routing. |
| 13 | `src/pages/trading/ChartSettingsDialog.tsx` | 514 | Settings modal with 4 tabs (Appearance, Colors, Trading, Events) and custom switch/color controls. |
| 14 | `src/pages/trading/BottomPanel.tsx` | 507 | Bottom tab drawer (positions, orders, history, journal), challenge rules, and full `TradeHistoryTable`. |
| 15 | `src/components/MobileTradingPanel.tsx` | 484 | Mobile sheet containing Order form, Positions list, Price alerts tab, plus `MobileAccountBar` and `MobileSymbolSelector`. |
| 16 | `src/components/trading-dialogs/PositionModifyDialog.tsx` | 467 | Position modification modal, TP/SL adjustment with breakeven/pip buttons, partial close calculator, and status readout. |
| 17 | `src/components/IndicatorSettingsModal.tsx` | 455 | Indicator settings modal with Inputs tab (periods, standard dev) and Style tab (palette picker, line widths, levels). |
| 18 | `src/services/demo/binance.ts` | 420 | Binance REST klines chunking, 24h ticker polling, localStorage price caching, symbol pair translation. |
| 19 | `src/components/SymbolSearchModal.tsx` | 414 | Symbol search dialog, Binance search integration, keyboard arrow navigation, categories filter, watchlist bookmarking. |
| 20 | `src/lib/indicators.ts` | 399 | Pure mathematical indicator calculations (SMA, EMA, RSI, MACD, Bollinger, ATR, STOCH, VWAP, CCI, WR) & metadata registry. |
| 21 | `src/components/MarketDataBridge.tsx` | 363 | Headless WebSocket listener dispatching to Zustand and executing direct cache surgery on React Query positions/orders. |
| 22 | `src/components/trading-dialogs/TradeJournalPanel.tsx` | 361 | Trade journal drawer with entry form (emotion picker, star rating, tags, notes) and entries card list. |
| 23 | `src/lib/chart-plugins/delta-tooltip/delta-tooltip-pane.ts` | 350 | Multi-touch mobile inspection tooltip renderer, text measurement, and canvas layout calculation. |
| 24 | `src/pages/trading/ChartTemplatesMenu.tsx` | 344 | Chart templates popover, serialization/deserialization logic, custom template queries, and debounced autosave. |
| 25 | `src/lib/chart-plugins/drawing-tools/hit-test.ts` | 340 | Mathematical collision detection between mouse cursor and drawing geometry (points, lines, boxes, volume profile). |
| 26 | `src/styles/global.css` | 321 | Tailwind directives, dark/light theme CSS custom properties, scrollbar styling, canvas styling. |
| 27 | `src/pages/trading/DrawingToolRail.tsx` | 316 | Draggable rail for favorite drawing tools, reorganize mode, collapse toggle, drag offset hook. |
| 28 | `src/services/demo/engine.ts` | 310 | In-memory paper broker: matching engine, order queue, position tracking, margin calculation, PnL accounting. |

---

## 2. Detailed Modular Decomposition (Files $\ge$ 300 Lines)

Each file over 300 lines is decomposed below into single-responsibility modules. The original file path will remain as a backward-compatible facade/barrel re-exporting all existing APIs.

---

### 1. `src/pages/trading/ChartPanel.tsx` (2,526 lines)
**Current Problem:** Monolithic coordinator handling canvas instantiation, 25+ `useEffect` hooks, real-time tick interpolation, history pagination, SL/TP dragging, HUD overlay rendering, and plugin attachment.

**Proposed Decomposition:**
- `src/pages/trading/chart/ChartPanel.tsx` (~250 lines)
  - *Responsibility:* Lean container orchestrating the canvas element, sub-hooks, and child overlays.
- `src/pages/trading/chart/useChartLifecycle.ts` (~160 lines)
  - *Responsibility:* `createChart` instantiation, chart destruction, resize observer, and color/theme synchronization.
- `src/pages/trading/chart/useCandleDataPipeline.ts` (~200 lines)
  - *Responsibility:* Setting candle series data, monotonic deduplication, two-phase depth framing protection (`shouldReframe`), and viewport framing.
- `src/pages/trading/chart/useRealtimeFeed.ts` (~220 lines)
  - *Responsibility:* High-frequency tick updates (`applyTick`), server candle updates (`applyServerCandle`), and bid/ask price lines (`applyBidAskLines`).
- `src/pages/trading/chart/useInfiniteHistory.ts` (~180 lines)
  - *Responsibility:* Scroll boundary detection (`subscribeVisibleLogicalRangeChange`), wheel zoom-out clamping past history, and pagination fetch (`fetchOlderRange`).
- `src/pages/trading/chart/useChartOverlays.ts` (~190 lines)
  - *Responsibility:* Interactive chart price lines for active positions (Entry, SL, TP) and pending limit/stop orders.
- `src/pages/trading/chart/useReplayMarkers.ts` (~100 lines)
  - *Responsibility:* Mapping historical replay trade execution events to Lightweight Charts `SeriesMarker` items.
- `src/pages/trading/chart/useCandleCountdown.ts` (~80 lines)
  - *Responsibility:* Timer interval calculating remaining seconds until active bar close.
- `src/pages/trading/chart/ChartLegendHeader.tsx` (~180 lines)
  - *Responsibility:* Presentational HUD header displaying symbol, timeframe, OHLCV values, % change, bid/ask spread, and indicator toggles.
- `src/pages/trading/chart/chartPluginManager.ts` (~110 lines)
  - *Responsibility:* Factory instantiation, attachment, and detachment of primitive plugins (`sessionBreaks`, `forexSessionHighlighter`, `deltaTooltip`).
- `src/pages/trading/chart/chartFraming.ts` (~70 lines)
  - *Responsibility:* Pure mathematical logic for viewport framing (`frameLatestCandles`, visible logical range calculation).
- `src/pages/trading/ChartPanel.tsx` (~30 lines)
  - *Responsibility:* Facade re-exporting `ChartPanel` and related types.

---

### 2. `src/pages/trading/BottomIndicatorsPanel.tsx` (1,180 lines)
**Current Problem:** Bundles sub-chart canvas lifecycle, bidirectional range synchronization with `mainChart`, in-place series data updates for 6 oscillators, time-alignment mathematics, and the entire left rail UI.

**Proposed Decomposition:**
- `src/pages/trading/indicators/BottomIndicatorsPanel.tsx` (~180 lines)
  - *Responsibility:* Main container hosting the sub-chart canvas, rail, and inspector value badge.
- `src/pages/trading/indicators/useIndicatorChart.ts` (~150 lines)
  - *Responsibility:* Sub-chart initialization, disposal, resize observer, and right price scale width matching (`minimumWidth: mainWidth`).
- `src/pages/trading/indicators/useChartSync.ts` (~130 lines)
  - *Responsibility:* Zero-lag logical range synchronization between `mainChart` and `subChart` enforcing the one-way master-to-replica interaction rule.
- `src/pages/trading/indicators/useIndicatorSeries.ts` (~260 lines)
  - *Responsibility:* Creating and updating series in-place for RSI, MACD, STOCH, ATR, CCI, and WR without chart re-instantiation.
- `src/pages/trading/indicators/indicatorDataAlignment.ts` (~110 lines)
  - *Responsibility:* Pure functions `alignLineData`, `alignHistogramData`, and `timePriceMap` generation.
- `src/pages/trading/indicators/IndicatorRail.tsx` (~190 lines)
  - *Responsibility:* Left vertical pill strip displaying active sub-chart indicators, configure/remove buttons, and hover tooltips.
- `src/pages/trading/indicators/IndicatorAddMenu.tsx` (~100 lines)
  - *Responsibility:* Dropdown menu for selecting and activating additional below-pane oscillators.
- `src/pages/trading/indicators/IndicatorValueBadge.tsx` (~80 lines)
  - *Responsibility:* Top-left HUD badge displaying active indicator values under the crosshair.
- `src/pages/trading/BottomIndicatorsPanel.tsx` (~20 lines)
  - *Responsibility:* Facade re-exporting `BottomIndicatorsPanel`.

---

### 3. `src/services/queries.ts` (1,158 lines)
**Current Problem:** Monolithic file containing over 50 React Query hooks across 10 unrelated domain boundaries.

**Proposed Decomposition:**
- `src/services/queries/keys.ts` (~70 lines)
  - *Responsibility:* Canonical `queryKeys` factory.
- `src/services/queries/market.ts` (~120 lines)
  - *Responsibility:* `useCandles` (with two-phase placeholder cache upgrade), `useSymbols`, `useMarketDataHealth`, `useEconomicCalendar`.
- `src/services/queries/trading.ts` (~190 lines)
  - *Responsibility:* `usePositions`, `useOrders`, `useFills`, `useClosedPositions`, `usePlaceOrder`, `useCancelOrder`, `useModifyOrder`, `useModifyPosition`, `useClosePosition`, `useCloseAllPositions`.
- `src/services/queries/accounts.ts` (~140 lines)
  - *Responsibility:* `useMyAccounts`, `useAccount`, `useAccountStats`, `useEquityHistory`, `useLedger`, `useAccountMetrics`, `useAllPayouts`.
- `src/services/queries/journal.ts` (~90 lines)
  - *Responsibility:* `useJournalEntries`, `useCreateJournalEntry`, `useUpdateJournalEntry`, `useDeleteJournalEntry`.
- `src/services/queries/aiTrader.ts` (~110 lines)
  - *Responsibility:* `useAiTraderEnabled`, `useAiTraderHistory`, `useCreateAiTraderPlan`, `useExecuteAiTraderPlan`, `useClearAiTraderHistory`.
- `src/services/queries/competitions.ts` (~120 lines)
  - *Responsibility:* `useLeaderboard`, `useFirmLeaderboard`, `useLeaderboardStats`, `useActiveCompetitions`, `useMyCompetitionEntries`, `useCompetitionRankings`, `useMyAwards`.
- `src/services/queries/supportAndFirm.ts` (~130 lines)
  - *Responsibility:* `useMyTickets`, `useTicketDetail`, `useCreateTicket`, `useReplyToTicket`, `useCloseTicket`, `useMyFirm` (with hostname localStorage cache), `useFeatureFlags`.
- `src/services/queries/features.ts` (~170 lines)
  - *Responsibility:* Bot activities/integrations, public profiles, scaling plans, profit split configuration, account merge requests, replay session, daily PnL, announcements.
- `src/services/queries.ts` (~40 lines)
  - *Responsibility:* Re-export barrel maintaining 100% backward compatibility for all existing imports.

---

### 4. `src/lib/chart-plugins/drawing-tools/manager.ts` (1,113 lines)
**Current Problem:** A monolithic `DrawingToolsManager` handling pointer events, tool shortcuts, clipboard copy/paste, arrow nudging, multi-select grouping, magnet snapping, and long-press touch handling.

**Proposed Decomposition:**
- `src/lib/chart-plugins/drawing-tools/manager.ts` (~280 lines)
  - *Responsibility:* Core `DrawingToolsManager` coordinator class managing canvas bindings and public APIs.
- `src/lib/chart-plugins/drawing-tools/factories.ts` (~140 lines)
  - *Responsibility:* Drawing item builders (`buildNew`, `makePosition`, default parameters per tool).
- `src/lib/chart-plugins/drawing-tools/magnet.ts` (~120 lines)
  - *Responsibility:* Candle level snapping (`snapPoint`, finding OHLC extremes under weak and strong magnet modes).
- `src/lib/chart-plugins/drawing-tools/placement.ts` (~160 lines)
  - *Responsibility:* Multi-click placement state machine (first point, preview line, second point commit, measure tool).
- `src/lib/chart-plugins/drawing-tools/drag-controller.ts` (~170 lines)
  - *Responsibility:* Vertex handle dragging, translation offsets, and multi-selected group moving.
- `src/lib/chart-plugins/drawing-tools/shortcuts.ts` (~130 lines)
  - *Responsibility:* Keyboard listener dispatching undo/redo, tool arming, clipboard copy/paste, and arrow nudges.
- `src/lib/chart-plugins/drawing-tools/touch.ts` (~110 lines)
  - *Responsibility:* Touch event normalization and long-press timer gesture handling.

---

### 5. `src/lib/chart-plugins/drawing-tools/renderers.ts` (988 lines)
**Current Problem:** Contains canvas 2D rendering code for all 12+ drawing tools and sub-badges in a single 988-line file.

**Proposed Decomposition:**
- `src/lib/chart-plugins/drawing-tools/renderers/canvas-utils.ts` (~110 lines)
  - *Responsibility:* Common canvas helpers: `hexToRgba`, `toBitmap`, `dashFor`, `strokeLine`, `drawHandle`, `drawLabelBox`.
- `src/lib/chart-plugins/drawing-tools/renderers/line-renderers.ts` (~160 lines)
  - *Responsibility:* Renderers for trendlines, horizontal lines/rays, vertical lines, and stats boxes.
- `src/lib/chart-plugins/drawing-tools/renderers/shape-renderers.ts` (~170 lines)
  - *Responsibility:* Renderers for rectangles, parallel channels, ellipses, triangles, and arrows.
- `src/lib/chart-plugins/drawing-tools/renderers/position-renderer.ts` (~210 lines)
  - *Responsibility:* Long/Short position tool rendering, R:R calculation badge, live price tracker badge, and target/stop handles.
- `src/lib/chart-plugins/drawing-tools/renderers/fibonacci-renderer.ts` (~130 lines)
  - *Responsibility:* Fibonacci retracement bands, percentage levels, and connector lines.
- `src/lib/chart-plugins/drawing-tools/renderers/volume-profile-renderer.ts` (~120 lines)
  - *Responsibility:* Fixed-range volume profile histogram bins, POC line, and Value Area boundary lines.
- `src/lib/chart-plugins/drawing-tools/renderers/text-renderer.ts` (~80 lines)
  - *Responsibility:* Text annotations and font measurement.
- `src/lib/chart-plugins/drawing-tools/renderers.ts` (~40 lines)
  - *Responsibility:* Master dispatcher `renderEntry` and facade re-exports.

---

### 6. `src/pages/trading/WatchlistPanel.tsx` (946 lines)
**Current Problem:** Combines watchlist tabs carousel, burger settings popover, symbol row rendering, drag-and-drop reordering, 24h ticker polling, and quick trading.

**Proposed Decomposition:**
- `src/pages/trading/watchlist/WatchlistPanel.tsx` (~180 lines)
  - *Responsibility:* Main panel container layout, search open button, and list routing.
- `src/pages/trading/watchlist/WatchlistTabsCarousel.tsx` (~170 lines)
  - *Responsibility:* Horizontal tab track for Flagged, custom watchlists, All, and scroll edge indicators.
- `src/pages/trading/watchlist/WatchlistMenuDropdown.tsx` (~190 lines)
  - *Responsibility:* Burger popover menu for creating, renaming, and deleting custom watchlists.
- `src/pages/trading/watchlist/WatchlistRow.tsx` (~200 lines)
  - *Responsibility:* Individual symbol row (grip handle, flag button, avatar, name, bid/ask stack, 24h % change, quick trade, remove button).
- `src/pages/trading/watchlist/useWatchlistTickerChanges.ts` (~90 lines)
  - *Responsibility:* Hook fetching and caching 24h ticker changes from Binance.
- `src/pages/trading/watchlist/useWatchlistDragReorder.ts` (~80 lines)
  - *Responsibility:* Drag-and-drop reordering state and handlers.
- `src/pages/trading/watchlist/RibbonFlagIcon.tsx` (~40 lines)
  - *Responsibility:* Custom SVG ribbon flag icon.
- `src/pages/trading/WatchlistPanel.tsx` (~20 lines)
  - *Responsibility:* Facade re-exporting `WatchlistPanel` and `RibbonFlagIcon`.

---

### 7. `src/pages/TradingPage.tsx` (932 lines)
**Current Problem:** The master page houses 30+ useState/useRef declarations, two-phase depth loading logic, layout resizing (bottom and right splitters), modal dialog orchestration, and audio alert triggers.

**Proposed Decomposition:**
- `src/pages/trading/TradingPage.tsx` (~240 lines)
  - *Responsibility:* Lean top-level layout orchestrating `ChartToolbar`, `ChartPanel`, `BottomPanel`, `WatchlistPanel`, `OrderPanel`.
- `src/pages/trading/useTradingLayoutResize.ts` (~120 lines)
  - *Responsibility:* Mouse and touch drag handlers for resizing the bottom panel height and right panel width with boundary clamping.
- `src/pages/trading/useCandleDepthLoader.ts` (~110 lines)
  - *Responsibility:* Two-phase depth history management (400 first paint bars -> deep history upgrade with cache check).
- `src/pages/trading/useTradingShortcuts.ts` (~100 lines)
  - *Responsibility:* Global window keyboard hotkeys for symbol search, timeframe toggles, and panel visibility.
- `src/pages/trading/TradingDialogContainer.tsx` (~160 lines)
  - *Responsibility:* Host container managing `SymbolSearchModal`, `PositionModifyDialog`, `OrderModifyDialog`, and `OrderConfirmDialog`.
- `src/pages/TradingPage.tsx` (~20 lines)
  - *Responsibility:* Facade re-exporting `TradingPage`.

---

### 8. `src/pages/trading/DrawingToolsOverlay.tsx` (878 lines)
**Current Problem:** Contains three completely separate UI systems: canvas floating toolbar, properties modal dialog, and context menu.

**Proposed Decomposition:**
- `src/pages/trading/drawing-overlay/DrawingFloatingToolbar.tsx` (~150 lines)
  - *Responsibility:* Canvas floating toolbar for selected drawings (color picker, line thickness, delete, properties launcher).
- `src/pages/trading/drawing-overlay/DrawingSettingsDialog.tsx` (~240 lines)
  - *Responsibility:* Properties dialog modal for coordinates, text font, fill controls, fib levels, volume profile rows, arrowheads.
- `src/pages/trading/drawing-overlay/DrawingContextMenu.tsx` (~120 lines)
  - *Responsibility:* Right-click context menu (lock, hide, clone, layer reorder, delete).
- `src/pages/trading/drawing-overlay/controls/` (~250 lines total)
  - `ColorSwatches.tsx` (~40 lines)
  - `WidthButtons.tsx` (~40 lines)
  - `LineStyleButtons.tsx` (~45 lines)
  - `CoordinateInputs.tsx` (~50 lines)
  - `FibLevelsControls.tsx` (~55 lines)
  - `TextFormatControls.tsx` (~50 lines)
- `src/pages/trading/DrawingToolsOverlay.tsx` (~30 lines)
  - *Responsibility:* Facade re-exporting `DrawingFloatingToolbar`, `DrawingSettingsDialog`, `DrawingContextMenu`.

---

### 9. `src/services/store.tsx` (780 lines)
**Current Problem:** Named `.tsx` despite containing zero JSX. Combines two independent stores (`useAuthStore` and `useTradingStore`), RAF tick batch buffer, and watchlist localStorage storage.

**Proposed Decomposition:**
- `src/services/stores/useAuthStore.ts` (~190 lines)
  - *Responsibility:* Authentication, session, login/logout, MFA, token decoding, and auto-refresh intervals.
- `src/services/stores/useTradingStore.ts` (~260 lines)
  - *Responsibility:* Active symbol, live candle updates, active watchlists, flagged symbols, replay state.
- `src/services/stores/useTickStore.ts` (~130 lines)
  - *Responsibility:* High-frequency RAF tick batch buffer (`_pendingTicks`, `_pendingLiveTicks`) and pip decimal resolution.
- `src/services/stores/watchlistStorage.ts` (~90 lines)
  - *Responsibility:* Watchlist and flagged symbol localStorage loading and saving.
- `src/services/store.tsx` (~30 lines)
  - *Responsibility:* Facade re-exporting `useAuthStore`, `useTradingStore`, `TickEntry`, `UserWatchlist`.

---

### 10. `src/pages/trading/ChartToolbar.tsx` (722 lines)
**Current Problem:** Top toolbar container bundling symbol badge, timeframe selector, indicators menu, templates menu trigger, drawing tools dropdown, and plugins dropdown.

**Proposed Decomposition:**
- `src/pages/trading/toolbar/ChartToolbar.tsx` (~180 lines)
  - *Responsibility:* Primary top toolbar layout container.
- `src/pages/trading/toolbar/DrawingToolsDropdown.tsx` (~180 lines)
  - *Responsibility:* Drawing tools menu with favorite toggles, magnet mode, stay-in-drawing mode, and clear drawings.
- `src/pages/trading/toolbar/PluginsDropdown.tsx` (~90 lines)
  - *Responsibility:* Dropdown for chart plugins (session breaks, session highlighting, delta tooltip).
- `src/pages/trading/toolbar/TimeframeSelector.tsx` (~100 lines)
  - *Responsibility:* Timeframe interval buttons and popover.
- `src/pages/trading/toolbar/SymbolBadge.tsx` (~80 lines)
  - *Responsibility:* Active symbol display, bid/ask spread badge, and search launcher.
- `src/pages/trading/toolbar/ToolButton.tsx` (~40 lines)
  - *Responsibility:* Reusable toolbar icon button with active/hover states.
- `src/pages/trading/ChartToolbar.tsx` (~20 lines)
  - *Responsibility:* Facade re-exporting `ChartToolbar` and `ToolButton`.

---

### 11. `src/lib/chart-plugins/drawing-tools/resolve.ts` (556 lines)
**Current Problem:** Combines core coordinate projections, Fibonacci mathematical resolution, volume profile binning, and trendline ray extensions.

**Proposed Decomposition:**
- `src/lib/chart-plugins/drawing-tools/coords.ts` (~130 lines)
  - *Responsibility:* Coordinate projections (`timeToX`, `xToTime`, `timeToLogical`, `logicalToX`, `lowerBound`, `makeResolveCtx`).
- `src/lib/chart-plugins/drawing-tools/resolve-entry.ts` (~150 lines)
  - *Responsibility:* Master dispatcher `resolveEntry` transforming drawings into resolved canvas models.
- `src/lib/chart-plugins/drawing-tools/resolve-fibonacci.ts` (~80 lines)
  - *Responsibility:* Fibonacci level calculations and ratios (`resolveFibLevels`, `FIB_LEVELS`, `FIB_EXT_LEVELS`).
- `src/lib/chart-plugins/drawing-tools/resolve-volume-profile.ts` (~110 lines)
  - *Responsibility:* Fixed-range volume profile binning, POC determination, and Value Area calculation.
- `src/lib/chart-plugins/drawing-tools/resolve-trendline.ts` (~90 lines)
  - *Responsibility:* Trendline stats (delta bars, percent change, slope) and ray extension boundaries.
- `src/lib/chart-plugins/drawing-tools/resolve.ts` (~30 lines)
  - *Responsibility:* Facade re-exporting all resolution functions.

---

### 12. `src/pages/trading/OrderPanel.tsx` (516 lines)
**Current Problem:** Order sidebar combining form state, validation, lot size presets, pip offset buttons, margin calculation, and submission routing.

**Proposed Decomposition:**
- `src/pages/trading/order/OrderPanel.tsx` (~160 lines)
  - *Responsibility:* Main order form container and submission orchestration.
- `src/pages/trading/order/useOrderFormState.ts` (~120 lines)
  - *Responsibility:* Input fields state, quick lot buttons, validation rules, and error handling.
- `src/pages/trading/order/OrderTypeSelector.tsx` (~70 lines)
  - *Responsibility:* Side selector (Buy/Sell) and type selector (Market/Limit/Stop).
- `src/pages/trading/order/OrderPriceInputs.tsx` (~110 lines)
  - *Responsibility:* Price, Stop Price, TP, and SL inputs with pip offset buttons.
- `src/pages/trading/order/OrderSummary.tsx` (~70 lines)
  - *Responsibility:* Leverage, estimated margin requirement, and notional value display.
- `src/pages/trading/OrderPanel.tsx` (~20 lines)
  - *Responsibility:* Facade re-exporting `OrderPanel`.

---

### 13. `src/pages/trading/ChartSettingsDialog.tsx` (514 lines)
**Current Problem:** Modal dialog housing 4 distinct settings tabs plus custom switch/swatch UI widgets.

**Proposed Decomposition:**
- `src/pages/trading/settings/ChartSettingsDialog.tsx` (~120 lines)
  - *Responsibility:* Dialog shell, tab switcher, reset buttons, and modal lifecycle.
- `src/pages/trading/settings/AppearanceTab.tsx` (~90 lines)
  - *Responsibility:* Watermark, grid, crosshair style, OHLC legend, and countdown timer.
- `src/pages/trading/settings/ColorsTab.tsx` (~120 lines)
  - *Responsibility:* Candle body/wick/border colors, background, grid, and crosshair colors.
- `src/pages/trading/settings/TradingTab.tsx` (~70 lines)
  - *Responsibility:* Position lines on chart, orders on chart, SL/TP lines, audio sounds.
- `src/pages/trading/settings/EventsTab.tsx` (~60 lines)
  - *Responsibility:* Economic calendar events, session breaks, news markers.
- `src/pages/trading/settings/SettingsControls.tsx` (~80 lines)
  - *Responsibility:* Reusable controls: `Switch`, `ToggleRow`, `ColorSwatch`, `ColorPairRow`.
- `src/pages/trading/ChartSettingsDialog.tsx` (~20 lines)
  - *Responsibility:* Facade re-exporting `ChartSettingsDialog`.

---

### 14. `src/pages/trading/BottomPanel.tsx` (507 lines)
**Current Problem:** Bottom drawer bundling tab switching, drawer height resizing, challenge metrics, and an entire 130-line `TradeHistoryTable`.

**Proposed Decomposition:**
- `src/pages/trading/bottom-panel/BottomPanel.tsx` (~160 lines)
  - *Responsibility:* Tab container routing between Positions, Orders, History, Journal, Indicators.
- `src/pages/trading/bottom-panel/TradeHistoryTable.tsx` (~140 lines)
  - *Responsibility:* Historical trade table with pagination, date filtering, and closed position formatting.
- `src/pages/trading/bottom-panel/ChallengeMetricsView.tsx` (~80 lines)
  - *Responsibility:* Prop firm challenge metrics, drawdown progress bars, and profit targets.
- `src/pages/trading/bottom-panel/BottomPanelTabs.tsx` (~80 lines)
  - *Responsibility:* Tab header strip with collapse toggle and active item counts.
- `src/pages/trading/BottomPanel.tsx` (~20 lines)
  - *Responsibility:* Facade re-exporting `BottomPanel`.

---

### 15. `src/components/MobileTradingPanel.tsx` (484 lines)
**Current Problem:** Contains three unrelated components: mobile order sheet, mobile account header bar, and mobile symbol selector.

**Proposed Decomposition:**
- `src/components/mobile/MobileTradingPanel.tsx` (~170 lines)
  - *Responsibility:* Bottom sheet modal and mobile tab navigation (Order, Positions, Alerts).
- `src/components/mobile/MobileOrderTab.tsx` (~120 lines)
  - *Responsibility:* Touch-friendly order entry form with lot presets.
- `src/components/mobile/MobilePositionsTab.tsx` (~90 lines)
  - *Responsibility:* Touch-friendly open positions list with one-tap close.
- `src/components/mobile/MobileAccountBar.tsx` (~60 lines)
  - *Responsibility:* Compact top bar showing balance, equity, and margin.
- `src/components/mobile/MobileSymbolSelector.tsx` (~50 lines)
  - *Responsibility:* Compact header coin selector.
- `src/components/MobileTradingPanel.tsx` (~25 lines)
  - *Responsibility:* Facade re-exporting `MobileTradingPanel`, `MobileAccountBar`, `MobileSymbolSelector`.

---

### 16. `src/components/trading-dialogs/PositionModifyDialog.tsx` (467 lines)
**Current Problem:** Modal dialog combining position header status, TP/SL modification tab, and partial close tab.

**Proposed Decomposition:**
- `src/components/trading-dialogs/position-modify/PositionModifyDialog.tsx` (~130 lines)
  - *Responsibility:* Dialog shell and tab switcher.
- `src/components/trading-dialogs/position-modify/ModifyTpSlTab.tsx` (~140 lines)
  - *Responsibility:* TP/SL form with risk/reward calculation, breakeven button, and projected profit/loss.
- `src/components/trading-dialogs/position-modify/PartialCloseTab.tsx` (~110 lines)
  - *Responsibility:* Partial close form with 25%/50%/75%/100% quick buttons and remaining quantity preview.
- `src/components/trading-dialogs/position-modify/PositionStatusBar.tsx` (~70 lines)
  - *Responsibility:* Header readout for current price, unrealized PnL, and pip gain/loss.
- `src/components/trading-dialogs/PositionModifyDialog.tsx` (~20 lines)
  - *Responsibility:* Facade re-exporting `PositionModifyDialog`.

---

### 17. `src/components/IndicatorSettingsModal.tsx` (455 lines)
**Current Problem:** Combines dynamic indicator parameter form generation with style color pickers and preset resetting.

**Proposed Decomposition:**
- `src/components/indicator-settings/IndicatorSettingsModal.tsx` (~120 lines)
  - *Responsibility:* Modal dialog container, header, and action buttons.
- `src/components/indicator-settings/IndicatorInputsTab.tsx` (~150 lines)
  - *Responsibility:* Dynamic inputs form rendering fields based on active indicator type (periods, deviations, smoothing).
- `src/components/indicator-settings/IndicatorStyleTab.tsx` (~120 lines)
  - *Responsibility:* Color pickers, line widths, overbought/oversold levels, and histogram colors.
- `src/components/indicator-settings/ColorPalettePicker.tsx` (~50 lines)
  - *Responsibility:* 8-color swatch palette selector.
- `src/components/IndicatorSettingsModal.tsx` (~20 lines)
  - *Responsibility:* Facade re-exporting `IndicatorSettingsModal`.

---

### 18. `src/services/demo/binance.ts` (420 lines)
**Current Problem:** Handles Binance REST klines chunking, 24h ticker polling, localStorage price caching, and symbol pair translation.

**Proposed Decomposition:**
- `src/services/demo/binance/klines.ts` (~130 lines)
  - *Responsibility:* REST klines fetching, multi-chunk pagination (`fetchBinanceKlinesMulti`, `fetchBinanceKlinesRange`).
- `src/services/demo/binance/tickers.ts` (~120 lines)
  - *Responsibility:* 24hr ticker fetching, polling loop, and subscriber notification (`getBinanceTickers`, `onTickersUpdated`).
- `src/services/demo/binance/priceStorage.ts` (~70 lines)
  - *Responsibility:* LocalStorage caching of last known prices and 24h changes.
- `src/services/demo/binance/symbolMapping.ts` (~80 lines)
  - *Responsibility:* Symbol translation (`symbolToBinancePair`, `binancePairToSymbol`) and `CRYPTO_NAMES` constants.
- `src/services/demo/binance.ts` (~30 lines)
  - *Responsibility:* Facade re-exporting all Binance client functions.

---

### 19. `src/components/SymbolSearchModal.tsx` (414 lines)
**Current Problem:** Modal dialog combining input focus management, live Binance ticker merging, keyboard navigation, and result list virtualization.

**Proposed Decomposition:**
- `src/components/symbol-search/SymbolSearchModal.tsx` (~140 lines)
  - *Responsibility:* Dialog modal shell, search input, and category tabs.
- `src/components/symbol-search/useSymbolSearch.ts` (~130 lines)
  - *Responsibility:* Filtering logic, Binance ticker merging, keyboard arrow/enter navigation, and selection state.
- `src/components/symbol-search/SymbolSearchResultRow.tsx` (~110 lines)
  - *Responsibility:* Individual result row with price, 24h change, base asset badge, and watchlist star toggle.
- `src/components/SymbolSearchModal.tsx` (~20 lines)
  - *Responsibility:* Facade re-exporting `SymbolSearchModal`.

---

### 20. `src/lib/indicators.ts` (399 lines)
**Current Problem:** Mathematical indicator algorithms (moving averages, oscillators, volatility) bundled with metadata registries.

**Proposed Decomposition:**
- `src/lib/indicators/moving-averages.ts` (~80 lines)
  - *Responsibility:* `sma`, `ema`, `vwap`.
- `src/lib/indicators/oscillators.ts` (~160 lines)
  - *Responsibility:* `rsi`, `macd`, `stochastic`, `cci`, `williamsR`.
- `src/lib/indicators/volatility.ts` (~80 lines)
  - *Responsibility:* `bollingerBands`, `atr`.
- `src/lib/indicators/registry.ts` (~80 lines)
  - *Responsibility:* `INDICATOR_REGISTRY`, `IndicatorType`, `IndicatorConfig`, default parameter values.
- `src/lib/indicators.ts` (~30 lines)
  - *Responsibility:* Facade re-exporting all functions and types.

---

### 21. `src/components/MarketDataBridge.tsx` (363 lines)
**Current Problem:** Headless WebSocket listener dispatching to Zustand and executing direct cache surgery on React Query for positions and orders.

**Proposed Decomposition:**
- `src/components/market-data-bridge/MarketDataBridge.tsx` (~60 lines)
  - *Responsibility:* Headless component mounting event subscriber hooks.
- `src/components/market-data-bridge/useMarketDataWs.ts` (~80 lines)
  - *Responsibility:* WebSocket listener for `MarketTick`, `HftLiveTick`, `CandleUpdate`, `CandleClosed`, `ReplayStateChanged`.
- `src/components/market-data-bridge/useAccountWs.ts` (~60 lines)
  - *Responsibility:* WebSocket listener for `EquityUpdated`, `AccountPassed`, `AccountFailed`.
- `src/components/market-data-bridge/usePositionWsCache.ts` (~120 lines)
  - *Responsibility:* Direct React Query cache updates for positions with 50ms batch buffer (`bufferPositionOpened`) and coalesced invalidations.
- `src/components/market-data-bridge/useOrderWsCache.ts` (~60 lines)
  - *Responsibility:* Orders cache invalidation and fill handling.
- `src/components/MarketDataBridge.tsx` (~20 lines)
  - *Responsibility:* Facade re-exporting `MarketDataBridge`.

---

### 22. `src/components/trading-dialogs/TradeJournalPanel.tsx` (361 lines)
**Current Problem:** Combines journal entry form (with emoji emotion picker and star rating) with journal card list rendering.

**Proposed Decomposition:**
- `src/components/trading-dialogs/journal/TradeJournalPanel.tsx` (~110 lines)
  - *Responsibility:* Drawer header and list layout.
- `src/components/trading-dialogs/journal/JournalEntryForm.tsx` (~140 lines)
  - *Responsibility:* Entry form with inputs, emotion picker, star rating, and tags.
- `src/components/trading-dialogs/journal/JournalEntryCard.tsx` (~100 lines)
  - *Responsibility:* Card rendering an entry with badges, notes, and edit/delete actions.
- `src/components/trading-dialogs/TradeJournalPanel.tsx` (~20 lines)
  - *Responsibility:* Facade re-exporting `TradeJournalPanel`.

---

### 23. `src/lib/chart-plugins/delta-tooltip/delta-tooltip-pane.ts` (350 lines)
**Current Problem:** Combines complex text measurement / layout math with canvas rendering classes.

**Proposed Decomposition:**
- `src/lib/chart-plugins/delta-tooltip/tooltip-layout.ts` (~170 lines)
  - *Responsibility:* Pure positioning calculations: `calculateVerticalDrawingPositions`, `calculateDrawingPositions`, section dimension measurements.
- `src/lib/chart-plugins/delta-tooltip/delta-tooltip-pane.ts` (~160 lines)
  - *Responsibility:* `DeltaTooltipPaneRenderer` and `DeltaTooltipPaneView` drawing to the canvas.

---

### 24. `src/pages/trading/ChartTemplatesMenu.tsx` (344 lines)
**Current Problem:** Popover menu containing template serialization, custom query hooks, and debounced autosave.

**Proposed Decomposition:**
- `src/pages/trading/templates/ChartTemplatesMenu.tsx` (~110 lines)
  - *Responsibility:* Dropdown trigger button and menu popover.
- `src/pages/trading/templates/useChartTemplates.ts` (~100 lines)
  - *Responsibility:* Hook managing template list, create, delete, and debounced autosave.
- `src/pages/trading/templates/TemplateList.tsx` (~90 lines)
  - *Responsibility:* List of user templates with apply and delete buttons.
- `src/pages/trading/templates/templateSerializer.ts` (~50 lines)
  - *Responsibility:* Pure helpers `snapshotContent` and `contentToPrefsPatch`.
- `src/pages/trading/ChartTemplatesMenu.tsx` (~20 lines)
  - *Responsibility:* Facade re-exporting `ChartTemplatesMenu`.

---

### 25. `src/lib/chart-plugins/drawing-tools/hit-test.ts` (340 lines)
**Current Problem:** Collision detection routines for all 12+ drawing tools bundled in a single file.

**Proposed Decomposition:**
- `src/lib/chart-plugins/drawing-tools/hit-test/common.ts` (~60 lines)
  - *Responsibility:* Tolerances, distance formulas, and point hit constructors.
- `src/lib/chart-plugins/drawing-tools/hit-test/line-hits.ts` (~80 lines)
  - *Responsibility:* Hit detection for trendlines, rays, horizontal, and vertical lines.
- `src/lib/chart-plugins/drawing-tools/hit-test/shape-hits.ts` (~80 lines)
  - *Responsibility:* Hit detection for rectangles, channels, and box shapes.
- `src/lib/chart-plugins/drawing-tools/hit-test/complex-hits.ts` (~120 lines)
  - *Responsibility:* Hit detection for Fibonacci, Volume Profile, and Long/Short Positions.
- `src/lib/chart-plugins/drawing-tools/hit-test.ts` (~30 lines)
  - *Responsibility:* Facade re-exporting `hitTest`.

---

### 26. `src/styles/global.css` (321 lines)
**Current Problem:** Monolithic CSS file combining Tailwind directives, dark/light theme tokens, scrollbar styling, and canvas utility classes.

**Proposed Decomposition:**
- `src/styles/theme.css` (~140 lines)
  - *Responsibility:* CSS custom properties (`:root` dark tokens and `.light` theme tokens).
- `src/styles/components.css` (~120 lines)
  - *Responsibility:* Custom scrollbars, animations, and chart container utilities.
- `src/styles/global.css` (~40 lines)
  - *Responsibility:* Tailwind directives importing `theme.css` and `components.css`.

---

### 27. `src/pages/trading/DrawingToolRail.tsx` (316 lines)
**Current Problem:** Bundles active floating tool rail, drag-and-drop reorganize mode, and drag offset position tracking.

**Proposed Decomposition:**
- `src/pages/trading/drawing-rail/DrawingToolRail.tsx` (~100 lines)
  - *Responsibility:* Rail container and mode switcher (active vs reorganize vs collapsed).
- `src/pages/trading/drawing-rail/DrawingRailReorganize.tsx` (~110 lines)
  - *Responsibility:* Reorganize mode overlay with drag-and-drop reordering and remove buttons.
- `src/pages/trading/drawing-rail/DrawingRailButtons.tsx` (~90 lines)
  - *Responsibility:* Tool icon button stack and drag handle.
- `src/pages/trading/DrawingToolRail.tsx` (~20 lines)
  - *Responsibility:* Facade re-exporting `DrawingToolRail`.

---

### 28. `src/services/demo/engine.ts` (310 lines)
**Current Problem:** In-memory paper broker bundling order execution, margin accounting, equity calculation, and position mutation.

**Proposed Decomposition:**
- `src/services/demo/engine/account.ts` (~100 lines)
  - *Responsibility:* Account ledger, balance, margin, and equity calculations (`recomputeEquity`, `notional`, `pnlOf`).
- `src/services/demo/engine/matching.ts` (~110 lines)
  - *Responsibility:* Order execution and tick matching (`placeOrder`, `mark`, `checkStops`).
- `src/services/demo/engine/positions.ts` (~90 lines)
  - *Responsibility:* Position and order mutations (`closePosition`, `closeAllPositions`, `modifyPosition`, `modifyOrder`, `cancelOrder`).
- `src/services/demo/engine.ts` (~30 lines)
  - *Responsibility:* Facade re-exporting `getAccount`, `getPositions`, `placeOrder`, `closePosition`, `mark`, etc.

---

## 3. Proposed Folder Structure

The refactored directory structure maintains existing top-level directories while organizing sub-components by feature domain:

```
src/
├── components/
│   ├── ui/                             # Generic Radix / Tailwind primitives (button, card, tooltip)
│   ├── indicator-settings/             # [NEW] Decomposed IndicatorSettingsModal
│   │   ├── IndicatorSettingsModal.tsx
│   │   ├── IndicatorInputsTab.tsx
│   │   ├── IndicatorStyleTab.tsx
│   │   └── ColorPalettePicker.tsx
│   ├── symbol-search/                  # [NEW] Decomposed SymbolSearchModal
│   │   ├── SymbolSearchModal.tsx
│   │   ├── useSymbolSearch.ts
│   │   └── SymbolSearchResultRow.tsx
│   ├── market-data-bridge/             # [NEW] Decomposed MarketDataBridge
│   │   ├── MarketDataBridge.tsx
│   │   ├── useMarketDataWs.ts
│   │   ├── useAccountWs.ts
│   │   ├── usePositionWsCache.ts
│   │   └── useOrderWsCache.ts
│   ├── mobile/                         # [NEW] Decomposed MobileTradingPanel
│   │   ├── MobileTradingPanel.tsx
│   │   ├── MobileOrderTab.tsx
│   │   ├── MobilePositionsTab.tsx
│   │   ├── MobileAccountBar.tsx
│   │   └── MobileSymbolSelector.tsx
│   ├── trading-dialogs/                # OrderConfirm, TradeCalculator, etc.
│   │   ├── position-modify/            # [NEW] Decomposed PositionModifyDialog
│   │   │   ├── PositionModifyDialog.tsx
│   │   │   ├── ModifyTpSlTab.tsx
│   │   │   ├── PartialCloseTab.tsx
│   │   │   └── PositionStatusBar.tsx
│   │   ├── journal/                    # [NEW] Decomposed TradeJournalPanel
│   │   │   ├── TradeJournalPanel.tsx
│   │   │   ├── JournalEntryForm.tsx
│   │   │   └── JournalEntryCard.tsx
│   │   ├── OrderConfirmDialog.tsx
│   │   ├── OrderModifyDialog.tsx
│   │   └── TradeCalculator.tsx
│   ├── ConnectionIndicator.tsx
│   ├── ErrorBoundary.tsx
│   ├── IndicatorSettingsModal.tsx      # Backward-compatible facade
│   ├── MarketDataBridge.tsx            # Backward-compatible facade
│   ├── MobileTradingPanel.tsx          # Backward-compatible facade
│   ├── SymbolSearchModal.tsx           # Backward-compatible facade
│   └── TradingDialogs.tsx
├── hooks/
│   ├── useChartDrawings.ts
│   ├── useChartPreferences.ts
│   ├── useDragOffset.ts
│   ├── useFavoriteDrawingTools.ts
│   ├── useIndicatorSettings.ts
│   ├── useInstrumentLabels.ts
│   ├── useTraderPreferences.ts
│   └── useTradeSound.ts
├── lib/
│   ├── chart-plugins/
│   │   ├── drawing-tools/
│   │   │   ├── renderers/              # [NEW] Decomposed canvas renderers
│   │   │   │   ├── canvas-utils.ts
│   │   │   │   ├── line-renderers.ts
│   │   │   │   ├── shape-renderers.ts
│   │   │   │   ├── position-renderer.ts
│   │   │   │   ├── fibonacci-renderer.ts
│   │   │   │   ├── volume-profile-renderer.ts
│   │   │   │   └── text-renderer.ts
│   │   │   ├── hit-test/               # [NEW] Decomposed hit test routines
│   │   │   │   ├── common.ts
│   │   │   │   ├── line-hits.ts
│   │   │   │   ├── shape-hits.ts
│   │   │   │   └── complex-hits.ts
│   │   │   ├── coords.ts               # [NEW] Coordinate projections
│   │   │   ├── resolve-entry.ts        # [NEW] Drawing resolution dispatcher
│   │   │   ├── resolve-fibonacci.ts    # [NEW] Fibonacci math
│   │   │   ├── resolve-volume-profile.ts # [NEW] Volume profile binning
│   │   │   ├── resolve-trendline.ts    # [NEW] Trendline slope & stats
│   │   │   ├── factories.ts            # [NEW] Drawing model factories
│   │   │   ├── magnet.ts               # [NEW] Candle magnet snapping
│   │   │   ├── placement.ts            # [NEW] Placement state machine
│   │   │   ├── drag-controller.ts      # [NEW] Vertex & item dragging
│   │   │   ├── shortcuts.ts            # [NEW] Keyboard shortcut listeners
│   │   │   ├── touch.ts                # [NEW] Touch gesture handling
│   │   │   ├── drawings-primitive.ts
│   │   │   ├── geometry.ts
│   │   │   ├── hit-test.ts             # Backward-compatible facade
│   │   │   ├── line-alerts.ts
│   │   │   ├── manager.ts              # Slimmed manager coordinator
│   │   │   ├── renderers.ts            # Backward-compatible facade
│   │   │   ├── resolve.ts              # Backward-compatible facade
│   │   │   └── types.ts
│   │   ├── delta-tooltip/
│   │   │   ├── tooltip-layout.ts       # [NEW] Position measurement
│   │   │   ├── delta-tooltip-pane.ts   # Canvas rendering view
│   │   │   ├── delta-tooltip.ts
│   │   │   ├── crosshair-line-pane.ts
│   │   │   └── multi-touch-chart-events.ts
│   │   ├── bands-indicator/
│   │   ├── highlight-bar-crosshair/
│   │   ├── session-breaks/
│   │   ├── session-highlighting/
│   │   ├── tooltip/
│   │   └── plugin-base.ts
│   ├── indicators/                     # [NEW] Decomposed indicator formulas
│   │   ├── moving-averages.ts
│   │   ├── oscillators.ts
│   │   ├── volatility.ts
│   │   └── registry.ts
│   ├── indicators.ts                   # Backward-compatible facade
│   ├── livePnl.ts
│   ├── posthog.ts
│   └── utils.ts                        # Shared formatters, helpers
├── pages/
│   ├── trading/
│   │   ├── chart/                      # [NEW] Decomposed ChartPanel
│   │   │   ├── ChartPanel.tsx
│   │   │   ├── useChartLifecycle.ts
│   │   │   ├── useCandleDataPipeline.ts
│   │   │   ├── useRealtimeFeed.ts
│   │   │   ├── useInfiniteHistory.ts
│   │   │   ├── useChartOverlays.ts
│   │   │   ├── useReplayMarkers.ts
│   │   │   ├── useCandleCountdown.ts
│   │   │   ├── ChartLegendHeader.tsx
│   │   │   ├── chartPluginManager.ts
│   │   │   └── chartFraming.ts
│   │   ├── indicators/                 # [NEW] Decomposed BottomIndicatorsPanel
│   │   │   ├── BottomIndicatorsPanel.tsx
│   │   │   ├── useIndicatorChart.ts
│   │   │   ├── useChartSync.ts
│   │   │   ├── useIndicatorSeries.ts
│   │   │   ├── indicatorDataAlignment.ts
│   │   │   ├── IndicatorRail.tsx
│   │   │   ├── IndicatorAddMenu.tsx
│   │   │   └── IndicatorValueBadge.tsx
│   │   ├── watchlist/                  # [NEW] Decomposed WatchlistPanel
│   │   │   ├── WatchlistPanel.tsx
│   │   │   ├── WatchlistTabsCarousel.tsx
│   │   │   ├── WatchlistMenuDropdown.tsx
│   │   │   ├── WatchlistRow.tsx
│   │   │   ├── useWatchlistTickerChanges.ts
│   │   │   ├── useWatchlistDragReorder.ts
│   │   │   └── RibbonFlagIcon.tsx
│   │   ├── toolbar/                    # [NEW] Decomposed ChartToolbar
│   │   │   ├── ChartToolbar.tsx
│   │   │   ├── DrawingToolsDropdown.tsx
│   │   │   ├── PluginsDropdown.tsx
│   │   │   ├── TimeframeSelector.tsx
│   │   │   ├── SymbolBadge.tsx
│   │   │   └── ToolButton.tsx
│   │   ├── order/                      # [NEW] Decomposed OrderPanel
│   │   │   ├── OrderPanel.tsx
│   │   │   ├── useOrderFormState.ts
│   │   │   ├── OrderTypeSelector.tsx
│   │   │   ├── OrderPriceInputs.tsx
│   │   │   └── OrderSummary.tsx
│   │   ├── settings/                   # [NEW] Decomposed ChartSettingsDialog
│   │   │   ├── ChartSettingsDialog.tsx
│   │   │   ├── AppearanceTab.tsx
│   │   │   ├── ColorsTab.tsx
│   │   │   ├── TradingTab.tsx
│   │   │   ├── EventsTab.tsx
│   │   │   └── SettingsControls.tsx
│   │   ├── bottom-panel/               # [NEW] Decomposed BottomPanel
│   │   │   ├── BottomPanel.tsx
│   │   │   ├── TradeHistoryTable.tsx
│   │   │   ├── ChallengeMetricsView.tsx
│   │   │   └── BottomPanelTabs.tsx
│   │   ├── drawing-overlay/            # [NEW] Decomposed DrawingToolsOverlay
│   │   │   ├── DrawingFloatingToolbar.tsx
│   │   │   ├── DrawingSettingsDialog.tsx
│   │   │   ├── DrawingContextMenu.tsx
│   │   │   └── controls/
│   │   ├── templates/                  # [NEW] Decomposed ChartTemplatesMenu
│   │   │   ├── ChartTemplatesMenu.tsx
│   │   │   ├── useChartTemplates.ts
│   │   │   ├── TemplateList.tsx
│   │   │   └── templateSerializer.ts
│   │   ├── drawing-rail/               # [NEW] Decomposed DrawingToolRail
│   │   │   ├── DrawingToolRail.tsx
│   │   │   ├── DrawingRailReorganize.tsx
│   │   │   └── DrawingRailButtons.tsx
│   │   ├── useTradingLayoutResize.ts   # [NEW] Extracted from TradingPage
│   │   ├── useCandleDepthLoader.ts     # [NEW] Extracted from TradingPage
│   │   ├── useTradingShortcuts.ts      # [NEW] Extracted from TradingPage
│   │   ├── TradingDialogContainer.tsx  # [NEW] Extracted from TradingPage
│   │   ├── BottomIndicatorsPanel.tsx   # Backward-compatible facade
│   │   ├── BottomPanel.tsx             # Backward-compatible facade
│   │   ├── ChartPanel.tsx              # Backward-compatible facade
│   │   ├── ChartSettingsDialog.tsx     # Backward-compatible facade
│   │   ├── ChartTemplatesMenu.tsx      # Backward-compatible facade
│   │   ├── ChartToolbar.tsx            # Backward-compatible facade
│   │   ├── DrawingToolRail.tsx         # Backward-compatible facade
│   │   ├── DrawingToolsOverlay.tsx     # Backward-compatible facade
│   │   ├── OrderPanel.tsx              # Backward-compatible facade
│   │   ├── WatchlistPanel.tsx          # Backward-compatible facade
│   │   ├── ChartContextMenu.tsx
│   │   ├── DOMPanel.tsx
│   │   ├── MarketClosedBanner.tsx
│   │   ├── ObjectTreePanel.tsx
│   │   ├── OrdersTable.tsx
│   │   ├── PositionsTable.tsx
│   │   ├── ReplayHUD.tsx
│   │   ├── ReplayScrubber.tsx
│   │   ├── constants.ts
│   │   ├── drawingStyles.ts
│   │   ├── drawingToolMeta.ts
│   │   ├── useChallengeLevels.ts
│   │   ├── useIndicators.ts
│   │   ├── useReplayChartData.ts
│   │   ├── useReplayPlayback.ts
│   │   ├── useSlTpDrag.ts
│   │   └── utils.ts
│   ├── AiTraderPage.tsx
│   └── TradingPage.tsx                 # Lean master page container
├── services/
│   ├── api/                            # Domain REST API clients (market-data, auth, etc.)
│   ├── demo/
│   │   ├── binance/                    # [NEW] Decomposed binance client
│   │   │   ├── klines.ts
│   │   │   ├── tickers.ts
│   │   │   ├── priceStorage.ts
│   │   │   └── symbolMapping.ts
│   │   ├── engine/                     # [NEW] Decomposed matching engine
│   │   │   ├── account.ts
│   │   │   ├── matching.ts
│   │   │   └── positions.ts
│   │   ├── data/                       # Bundled offline candles JSON
│   │   ├── api.ts
│   │   ├── binance.ts                  # Backward-compatible facade
│   │   ├── bus.ts
│   │   ├── candles.ts
│   │   ├── engine.ts                   # Backward-compatible facade
│   │   ├── feed.ts
│   │   └── instruments.ts
│   ├── queries/                        # [NEW] Decomposed query catalog
│   │   ├── keys.ts
│   │   ├── market.ts
│   │   ├── trading.ts
│   │   ├── accounts.ts
│   │   ├── journal.ts
│   │   ├── aiTrader.ts
│   │   ├── competitions.ts
│   │   ├── supportAndFirm.ts
│   │   └── features.ts
│   ├── stores/                         # [NEW] Decomposed Zustand stores
│   │   ├── useAuthStore.ts
│   │   ├── useTradingStore.ts
│   │   ├── useTickStore.ts
│   │   └── watchlistStorage.ts
│   ├── api.ts
│   ├── queries.ts                      # Backward-compatible facade
│   ├── schemas.ts
│   ├── store.tsx                       # Backward-compatible facade
│   ├── toast.ts
│   └── ws.ts
└── styles/
    ├── theme.css                       # [NEW] Extracted CSS variables
    ├── components.css                  # [NEW] Extracted utilities
    └── global.css                      # Tailwind entry importing theme & components
```

---

## 4. Duplicated Logic That Must Be Consolidated

During the repository analysis, several duplicated patterns and copy-pasted implementations were identified:

### 1. Base Asset Extraction
- **Current Duplication:** `name.replace(/USD[T]?$/, "")` appears in:
  - `src/components/SymbolSearchModal.tsx` (line 92)
  - `src/pages/trading/WatchlistPanel.tsx` (lines 235, 252, 275, 735)
- **Target:** Extract `getBaseAsset(symbol: string): string` into `src/lib/utils.ts`.

### 2. Error Message Parsing
- **Current Duplication:**
  - `TradingPage.tsx` defines `getErrorMessage(err: unknown)`.
  - `BottomPanel.tsx` defines a distinct `getErrorMessage(error: unknown)`.
  - `OrderPanel.tsx` and `PositionModifyDialog.tsx` inspect `e?.error?.message || e?.message` inline.
- **Target:** Consolidate into a single robust `getErrorMessage(error: unknown): string` in `src/lib/utils.ts` handling `TradingActionError`, Axios/Fetch errors, and standard JS `Error` instances.

### 3. Price Decimal Precision Heuristic
- **Current Duplication:**
  The expression `symbolInfo?.tickSize && symbolInfo.tickSize < 0.0001 ? 8 : (price < 0.1 ? 6 : (price < 10 ? 4 : 2))` is copy-pasted in:
  - `src/pages/trading/ChartToolbar.tsx` (line 264)
  - `src/pages/trading/WatchlistPanel.tsx` (line 853)
  - `src/services/demo/binance.ts` (line 217)
  - Partially in `src/services/store.tsx` (`_pipDecimals`) and `src/pages/trading/utils.ts` (`getPipDigits`).
- **Target:** Consolidate into `getPriceDecimals(price: number, tickSize?: number | null): number` in `src/lib/utils.ts`.

### 4. Timestamp Normalization
- **Current Duplication:**
  - `toUnixSeconds` and `toUnixMs` in `src/pages/trading/utils.ts`.
  - `toTimestamp` in `src/components/MarketDataBridge.tsx`.
  - `intervalSecOf` in `src/pages/trading/ChartPanel.tsx`.
- **Target:** Unify all timestamp conversion functions in `src/pages/trading/utils.ts`.

### 5. Indicator Label & Config Resolution
- **Current Duplication:**
  - `getOverlayLabel(type, settings)` in `src/pages/trading/ChartPanel.tsx`.
  - `getIndicatorTabLabel(type, settings)` and `SHORT_NAMES` in `src/pages/trading/BottomIndicatorsPanel.tsx`.
  - `INDICATOR_REGISTRY` in `src/lib/indicators.ts`.
- **Target:** Move formatting helper `formatIndicatorLabel(type: IndicatorType, settings?: IndicatorSettings)` into `src/lib/indicators/registry.ts`.

### 6. Risk/Reward and Projected PnL Calculations
- **Current Duplication:**
  - `PositionModifyDialog.tsx` computes risk/reward ratio and projected TP/SL PnL using contract size.
  - `renderers.ts` (`renderPosition`) computes risk/reward ratio and dollar gain/loss.
  - `OrderPanel.tsx` calculates estimated margin and notional value.
- **Target:** Centralize position and order financial math into `src/lib/livePnl.ts`.

### 7. Color Conversion
- **Current Duplication:** `hexToRgba(hex, alpha)` is implemented in `drawing-tools/renderers.ts` and repeated in styling utilities.
- **Target:** Move `hexToRgba(hex: string, alpha: number): string` to `src/lib/utils.ts`.

---

## 5. Risks: What Could Break During the Refactor

Modifying charting and high-frequency trading code presents critical failure points. The refactor must explicitly safeguard against each of the following risks:

### 1. Viewport Framing Reset & Empty Space (Critical Gotcha #1 & #3)
- **Risk:** In `ChartPanel.tsx`, `shouldReframe` must evaluate to `true` on symbol/timeframe changes (`isNewChart`), initial data loads (`isInitialLoad`), or depth expansions where the user hasn't scrolled (`!hasUserPannedOrZoomedRef.current && barCountJump > 50`).
- **Failure Mode:** If refactored hooks separate `hasUserPannedOrZoomedRef` or `lastRenderedBarCountRef`, routine 30s background refetches will reset the user's viewport back to the rightmost candle while they are inspecting past historical data.
- **Mitigation:** Retain tracking refs in `useCandleDataPipeline.ts` and ensure viewport framing is strictly skipped on background polling ticks.

### 2. Sub-Chart Range Feedback Loop Clobbering Main Chart (Critical Gotcha #2)
- **Risk:** `BottomIndicatorsPanel.tsx` and `mainChart` share timeScale ranges. If `subChart` syncs its range back to `mainChart` during initial mount or after `setData`, `mainChart` gets compressed against the left margin.
- **Failure Mode:** A feedback loop where both charts trigger each other's listeners indefinitely.
- **Mitigation:** The **one-way master-to-replica rule** must be preserved in `useChartSync.ts`: `subChart` pushes range back to `mainChart` **if and only if** `isSubInteractingRef.current === true` (user is actively dragging or wheeling the sub-chart).

### 3. Non-Monotonic Timestamp Exceptions (Critical Gotcha #6)
- **Risk:** Lightweight Charts throws a terminal assertion crash if candle timestamps are not strictly monotonically increasing integer seconds: `Assertion failed: Value is not strictly monotonically increasing`.
- **Failure Mode:** Application white-screen crash when receiving live ticks or out-of-order Binance chunks.
- **Mitigation:** Any extracted pipeline in `indicatorDataAlignment.ts` or `useCandleDataPipeline.ts` must maintain `Math.floor(ms / 1000)` and deduplication filtering (`b.time > arr[i - 1].time`).

### 4. Stale Closures with ~50ms WebSocket Ticks (Critical Gotcha #7)
- **Risk:** Incoming ticks arrive at ~50ms cadence. `useEffect` handlers that close over `selectedSymbol` or `timeframe` will apply ticks to the wrong coin if dependencies are not updated synchronously.
- **Failure Mode:** Switching from BTCUSD to ETHUSD causes an incoming BTC tick to update ETH's candle, corrupting the price axis.
- **Mitigation:** Use mutable tracking refs (`lastLoadKeyRef`, `latestLiveCandleRef`, `liveCandleTsRef`) reset synchronously on symbol switch inside `useRealtimeFeed.ts`.

### 5. High-Frequency React Re-renders Degrading 60 FPS
- **Risk:** Splitting `useTradingStore` into smaller stores must not cause components to subscribe to full state objects instead of granular selectors.
- **Failure Mode:** A 50ms tick updating `ticks[BTCUSD]` causes `ChartToolbar`, `WatchlistPanel`, and all dialogs to re-render, dropping framerates.
- **Mitigation:** Preserve exact selector semantics: `useTradingStore((s) => s.ticks[selectedSymbol])`.

### 6. React Query Direct Cache Surgery vs. REST 429 Floods
- **Risk:** `MarketDataBridge.tsx` mutates React Query cache in-place via `queryClient.setQueryData` for positions and batches fills via `bufferPositionOpened` (50ms).
- **Failure Mode:** Reverting to naive query invalidation (`invalidateQueries`) causes a REST request per market tick per second, triggering HTTP 429 rate limits.
- **Mitigation:** Keep in-place cache surgery and 50ms batching intact inside `usePositionWsCache.ts`.

### 7. Coordinate Projection Desync in Drawing Tools
- **Risk:** `DrawingToolsManager` and `resolve.ts` project data coordinates (`time`, `price`) to canvas pixels (`x`, `y`).
- **Failure Mode:** If coordinate resolution helpers lose access to the current series price scale or timeScale instance, drawn lines will jump across the screen or freeze during chart pans.
- **Mitigation:** Keep `ResolveCtx` factory clean and pass active `chart` and `series` references synchronously on render passes.

---

## 6. Phased Implementation Order

The refactoring will be executed strictly in phases, moving from the smallest, safest, headless utility modules up to the complex visual canvas engines. Every phase must pass typechecking, linting, and tests before the next phase begins.

```
Phase 0: Shared Utilities & Test Harness (Zero risk, additive)
   │
Phase 1: Pure Mathematical & Business Logic (Headless, no DOM)
   │
Phase 2: Data & Service Layer (Stores, Queries, WS Bridge)
   │
Phase 3: Chart Plugins & Drawing Tools (Canvas & geometry)
   │
Phase 4: Isolated Dialogs & Modals (Leaf UI components)
   │
Phase 5: Sidebars, Toolbars & Panels (Compound UI components)
   │
Phase 6: Core Viewports & Master Page (ChartPanel, Sub-chart, TradingPage)
```

---

### Phase 0: Shared Utilities & Test Harness
**Objective:** Add shared helpers to eliminate copy-pasted logic without modifying existing components.
1. Add `getBaseAsset`, `getErrorMessage`, `getPriceDecimals`, and `hexToRgba` to `src/lib/utils.ts`.
2. Add unit tests for these utilities in `src/__tests__/utils.test.ts`.
3. **Verification:** Run `npm run typecheck && npm test`.

### Phase 1: Pure Mathematical & Business Logic Modules
**Objective:** Decompose self-contained modules that have no React JSX or DOM dependencies.
1. Split `src/lib/indicators.ts` (399 lines) into `src/lib/indicators/` (`moving-averages.ts`, `oscillators.ts`, `volatility.ts`, `registry.ts`). Re-export all members in `src/lib/indicators.ts`.
2. Split `src/services/demo/engine.ts` (310 lines) into `src/services/demo/engine/` (`account.ts`, `matching.ts`, `positions.ts`). Re-export all members in `src/services/demo/engine.ts`.
3. **Verification:** Run `npm run typecheck && npm test` (`indicators.test.ts` and `engine.test.ts` must pass).

### Phase 2: Data & Service Layer
**Objective:** Decompose store, query, and WebSocket services into domain-specific modules.
1. Split `src/services/demo/binance.ts` (420 lines) into `src/services/demo/binance/` (`klines.ts`, `tickers.ts`, `priceStorage.ts`, `symbolMapping.ts`). Preserve barrel `binance.ts`.
2. Split `src/services/queries.ts` (1,158 lines) into `src/services/queries/` (`keys.ts`, `market.ts`, `trading.ts`, `accounts.ts`, `journal.ts`, `aiTrader.ts`, `competitions.ts`, `supportAndFirm.ts`, `features.ts`). Preserve barrel `queries.ts`.
3. Split `src/services/store.tsx` (780 lines) into `src/services/stores/` (`useAuthStore.ts`, `useTradingStore.ts`, `useTickStore.ts`, `watchlistStorage.ts`). Preserve barrel `store.tsx`.
4. Split `src/components/MarketDataBridge.tsx` (363 lines) into `src/components/market-data-bridge/` (`useMarketDataWs.ts`, `useAccountWs`, `usePositionWsCache.ts`, `useOrderWsCache.ts`). Preserve barrel `MarketDataBridge.tsx`.
5. **Verification:** Run `npm run typecheck && npm run lint && npm test`.

### Phase 3: Chart Plugins & Drawing Tools
**Objective:** Modularize the Canvas 2D renderers, hit tests, and drawing state machine.
1. Split `src/lib/chart-plugins/delta-tooltip/delta-tooltip-pane.ts` (350 lines) into `tooltip-layout.ts` and renderer classes.
2. Split `src/lib/chart-plugins/drawing-tools/hit-test.ts` (340 lines) into `hit-test/` (`common.ts`, `line-hits.ts`, `shape-hits.ts`, `complex-hits.ts`).
3. Split `src/lib/chart-plugins/drawing-tools/resolve.ts` (556 lines) into `coords.ts`, `resolve-entry.ts`, `resolve-fibonacci.ts`, `resolve-volume-profile.ts`, `resolve-trendline.ts`.
4. Split `src/lib/chart-plugins/drawing-tools/renderers.ts` (988 lines) into `renderers/` (`canvas-utils.ts`, `line-renderers.ts`, `shape-renderers.ts`, `position-renderer.ts`, `fibonacci-renderer.ts`, `volume-profile-renderer.ts`, `text-renderer.ts`).
5. Split `src/lib/chart-plugins/drawing-tools/manager.ts` (1,113 lines) into `factories.ts`, `magnet.ts`, `placement.ts`, `drag-controller.ts`, `shortcuts.ts`, `touch.ts`, and core `manager.ts`.
6. **Verification:** Run `npm run typecheck && npm test` (`volumeProfileHitTest.test.ts` must pass).

### Phase 4: Isolated Dialogs, Modals & Styles
**Objective:** Decompose leaf modal dialogs and presentational CSS.
1. Split `src/styles/global.css` (321 lines) into `theme.css`, `components.css`, and slim `global.css`.
2. Split `src/components/trading-dialogs/TradeJournalPanel.tsx` (361 lines) into `JournalEntryForm.tsx`, `JournalEntryCard.tsx`, and container.
3. Split `src/components/trading-dialogs/PositionModifyDialog.tsx` (467 lines) into `ModifyTpSlTab.tsx`, `PartialCloseTab.tsx`, `PositionStatusBar.tsx`, and dialog.
4. Split `src/components/IndicatorSettingsModal.tsx` (455 lines) into `IndicatorInputsTab.tsx`, `IndicatorStyleTab.tsx`, `ColorPalettePicker.tsx`, and dialog.
5. Split `src/components/SymbolSearchModal.tsx` (414 lines) into `useSymbolSearch.ts`, `SymbolSearchResultRow.tsx`, and dialog.
6. Split `src/pages/trading/ChartSettingsDialog.tsx` (514 lines) into `AppearanceTab.tsx`, `ColorsTab.tsx`, `TradingTab.tsx`, `EventsTab.tsx`, `SettingsControls.tsx`, and dialog.
7. Split `src/pages/trading/ChartTemplatesMenu.tsx` (344 lines) into `useChartTemplates.ts`, `TemplateList.tsx`, `templateSerializer.ts`, and menu.
8. Split `src/components/MobileTradingPanel.tsx` (484 lines) into `MobileOrderTab.tsx`, `MobilePositionsTab.tsx`, `MobileAccountBar.tsx`, `MobileSymbolSelector.tsx`, and sheet.
9. **Verification:** Run `npm run typecheck && npm run lint && npm test`.

### Phase 5: Sidebars, Toolbars & Compound Panels
**Objective:** Decompose complex trading terminal panels.
1. Split `src/pages/trading/DrawingToolRail.tsx` (316 lines) into `DrawingRailReorganize.tsx`, `DrawingRailButtons.tsx`, and rail.
2. Split `src/pages/trading/DrawingToolsOverlay.tsx` (878 lines) into `DrawingFloatingToolbar.tsx`, `DrawingSettingsDialog.tsx`, `DrawingContextMenu.tsx`, and controls.
3. Split `src/pages/trading/OrderPanel.tsx` (516 lines) into `useOrderFormState.ts`, `OrderTypeSelector.tsx`, `OrderPriceInputs.tsx`, `OrderSummary.tsx`, and panel.
4. Split `src/pages/trading/WatchlistPanel.tsx` (946 lines) into `WatchlistTabsCarousel.tsx`, `WatchlistMenuDropdown.tsx`, `WatchlistRow.tsx`, `useWatchlistTickerChanges.ts`, `useWatchlistDragReorder.ts`, `RibbonFlagIcon.tsx`, and panel.
5. Split `src/pages/trading/BottomPanel.tsx` (507 lines) into `TradeHistoryTable.tsx`, `ChallengeMetricsView.tsx`, `BottomPanelTabs.tsx`, and panel.
6. Split `src/pages/trading/ChartToolbar.tsx` (722 lines) into `DrawingToolsDropdown.tsx`, `PluginsDropdown.tsx`, `TimeframeSelector.tsx`, `SymbolBadge.tsx`, `ToolButton.tsx`, and toolbar.
7. **Verification:** Run `npm run typecheck && npm run lint && npm test`.

### Phase 6: Core Viewports & Master Page
**Objective:** Decompose the primary chart engines and the master page.
1. Split `src/pages/trading/BottomIndicatorsPanel.tsx` (1,180 lines) into `useIndicatorChart.ts`, `useChartSync.ts`, `useIndicatorSeries.ts`, `indicatorDataAlignment.ts`, `IndicatorRail.tsx`, `IndicatorAddMenu.tsx`, `IndicatorValueBadge.tsx`, and panel.
2. Split `src/pages/trading/ChartPanel.tsx` (2,526 lines) into `useChartLifecycle.ts`, `useCandleDataPipeline.ts`, `useRealtimeFeed.ts`, `useInfiniteHistory.ts`, `useChartOverlays.ts`, `useReplayMarkers.ts`, `useCandleCountdown.ts`, `ChartLegendHeader.tsx`, `chartPluginManager.ts`, `chartFraming.ts`, and panel.
3. Split `src/pages/TradingPage.tsx` (932 lines) into `useTradingLayoutResize.ts`, `useCandleDepthLoader.ts`, `useTradingShortcuts.ts`, `TradingDialogContainer.tsx`, and master page.
4. **Final Verification:**
   - Execute full test suite: `npm test` (all tests passing).
   - Execute TypeScript verification: `npm run typecheck` (0 errors).
   - Execute linter verification: `npm run lint` (0 errors).
   - Verify bundle build: `npm run build` (production build passes).

---

## 7. Public API & Database Field Compatibility Register

To ensure strict zero-breakage compliance during the subsequent refactor, this register catalogs all public APIs, query keys, event signatures, and persistence keys that must remain unchanged:

| Subsystem | Identifier | Type | Compatibility Guarantee |
|---|---|---|---|
| **Zustand Store** | `useAuthStore` | Store Hook | Preserved with all actions (`login`, `demoLogin`, `logout`, etc.) |
| **Zustand Store** | `useTradingStore` | Store Hook | Preserved with all selectors (`ticks`, `liveCandleUpdates`, `watchlists`, etc.) |
| **Event Bus** | `bus` (`src/services/demo/bus.ts`) | Pub/Sub | Exact event names preserved: `TICK`, `CANDLE`, `ORDER_FILLED`, `POSITION_CLOSED`, `SL_TP_HIT`, `REPLAY_EVENT` |
| **React Query** | `queryKeys` | Object Factory | Exact key structures preserved (`queryKeys.market.candles`, `queryKeys.trading.positions`, etc.) |
| **REST API** | `api` (`src/services/api.ts`) | Central Facade | All method signatures preserved |
| **Indicators** | `INDICATOR_REGISTRY` | Config Array | All 10 indicator definitions, labels, and defaults preserved |
| **Drawing Tools** | `DrawingToolsManager` | Class | Public methods (`setTool`, `setMagnetMode`, `setDrawings`, `destroy`) preserved |
| **Local Storage** | `project_quant:chart_preferences` | Storage Key | Chart preference serialization format preserved |
| **Local Storage** | `project_quant:drawings_*` | Storage Key | Drawing line coordinates and styling format preserved |
| **Local Storage** | `project_quant:user_watchlists` | Storage Key | Watchlist JSON structure preserved |
| **Local Storage** | `propsim:firm-cache:v2:*` | Storage Key | Firm branding cache key preserved |
| **Local Storage** | `oc_last_crypto_prices` | Storage Key | Binance price cache key preserved |

---
*End of Refactoring Plan.*

# Project Quant — System Architecture

> **Rule for AI Agents & Engineers**:
> **Before any task, read ARCHITECTURE.md and the specific feature doc in `docs/` related to the task, then open ONLY the 1-2 source files relevant to the task. Never scan the whole repo. After changing structure, update ARCHITECTURE.md.**

### Feature Documentation Quick Index (Read Before Editing Source)

When a task or bug fix targets a specific subsystem, read its dedicated document below to immediately identify the exact files and lines without scanning the codebase:

| Subsystem / Feature | Dedicated Documentation | Source Code Directory |
| :--- | :--- | :--- |
| **Chart Viewport & Lifecycle** | [docs/CHART_ENGINE.md](./CHART_ENGINE.md) | `src/pages/trading/chart/` |
| **Drawing Tools & Primitives** | [docs/DRAWINGS_AND_PLUGINS.md](./DRAWINGS_AND_PLUGINS.md) | `src/lib/chart-plugins/drawing-tools/` |
| **Technical Indicators** | [docs/INDICATORS.md](./INDICATORS.md) | `src/lib/indicators/`, `src/pages/trading/bottom-indicators/` |
| **Paper Trading & Orders** | [docs/TRADING_ENGINE.md](./TRADING_ENGINE.md) | `src/services/demo/engine/`, `src/pages/trading/order-panel/` |
| **Market Data & Feeds** | [docs/DATA_LAYER.md](./DATA_LAYER.md) | `src/services/market-data/`, `src/services/demo/binance/`, `src/components/market-data-bridge/`, `src/services/queries/` |
| **Layout, Theme & Mobile** | [docs/UI_AND_STYLING.md](./UI_AND_STYLING.md) | `src/pages/trading-page/`, `src/components/mobile-trading/`, `src/styles/` |
| **Historical Replay** | [docs/REPLAY_SYSTEM.md](./REPLAY_SYSTEM.md) | `src/pages/trading/useReplay*.ts`, `ReplayHUD.tsx`, `ReplayScrubber.tsx` |
| **Watchlist & Search** | [docs/WATCHLIST_AND_SEARCH.md](./WATCHLIST_AND_SEARCH.md) | `src/pages/trading/watchlist/`, `src/components/symbol-search/` |
| **Gotchas & Lessons Learned** | [docs/GOTCHAS_AND_LESSONS.md](./GOTCHAS_AND_LESSONS.md) | Cross-cutting traps, fixes, and rules |
| **Engineering Conventions** | [docs/CONVENTIONS.md](./CONVENTIONS.md) | Stack, naming, line limits, test & build commands |

---

## 1. High-Level Architecture Overview

Project Quant is a high-performance in-browser quantitative trading terminal and charting platform built with **React 19**, **TypeScript**, **Tailwind CSS**, **Zustand**, **TanStack React Query**, and TradingView's **Lightweight Charts (v4.2.0)**.

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
│  ├── ChartPanel         ── Candlesticks, volume, price lines, drawings │
│  ├── DrawingOverlay     ── Floating toolbars, drawing property dialogs │
│  ├── BottomIndicators   ── Sub-chart oscillators (RSI, MACD, STOCH)    │
│  ├── BottomPanel        ── Positions, active orders, trade journal     │
│  ├── WatchlistPanel     ── Live market quotes, bid/ask, % change       │
│  └── OrderPanel         ── Market, limit, stop order placement & risk  │
├────────────────────────────────────────────────────────────────────────┤
│ State, Query & Event Bus Layer                                         │
│  ├── useTradingStore    ── High-frequency ticks, candle updates, lists │
│  ├── useAuthStore       ── User session, demo credentials, balance     │
│  ├── useLayoutStore     ── Panel visibility, widths, responsive layout │
│  ├── TanStack Queries   ── useCandles, usePositions, useOrders cache   │
│  └── bus.ts (Pub/Sub)   ── TICK, ORDER_FILLED, POSITION_CLOSED events  │
├────────────────────────────────────────────────────────────────────────┤
│ Calculation & Execution Layer                                          │
│  ├── src/lib/indicators ── Pure math: SMA, EMA, RSI, MACD, BOLL, ATR   │
│  ├── src/lib/chart-plugins ─ Drawing tools, custom series, delta tips │
│  ├── src/services/demo/engine ─ In-memory matching engine, margin/PnL  │
│  └── src/services/demo/binance ─ Historical klines & WebSocket bridge  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Complete Folder & Module Map

Every file in `src/` is strictly under 300 lines with a single, clear responsibility.

### Root & Entry Points
- `src/main.tsx` — Application bootstrap, DOM root mount, and global styles import.
- `src/App.tsx` — Global auth initialization, demo mode gatekeeper, and layout shell.

### Components (`src/components/`)
- `src/components/ConnectionIndicator.tsx` — Status badge displaying WebSocket feed latency and connection state.
- `src/components/ErrorBoundary.tsx` — Error boundary catching React render crashes with graceful recovery.
- `src/components/MarketDataBridge.tsx` — Barrel facade re-exporting the market data bridge component.
- `src/components/SymbolSearchModal.tsx` — Barrel facade re-exporting the symbol search modal.
- `src/components/IndicatorSettingsModal.tsx` — Barrel facade re-exporting the indicator settings modal.
- `src/components/MobileTradingPanel.tsx` — Barrel facade re-exporting the mobile trading drawer.
- `src/components/TradingDialogs.tsx` — Central container rendering confirm/modify modal overlays.
- `src/components/color-picker/ColorPicker.tsx` — TradingView-style color picker component with palette swatches, inline and compact popovers.
- `src/components/color-picker/ColorPickerContext.tsx` — Context and provider managing side flyout color picker positioning and active target.
- `src/components/color-picker/RgbPickerPanel.tsx` — 2D saturation/brightness spectrum, Hue slider, and Opacity slider popover panel.

#### Market Data Bridge (`src/components/market-data-bridge/`)
- `MarketDataBridge.tsx` — Headless component syncing WebSocket streams with React Query and stores.
- `types.ts` — Types and interfaces for market data bridge WebSocket channels.
- `useMarketDataWs.ts` — Hook subscribing to live ticker WebSocket streams and updating the tick store.
- `useAccountWs.ts` — Hook subscribing to live account balance and margin WebSocket events.
- `useOrderWsCache.ts` — Hook managing cache invalidation when live order fill events arrive.
- `usePositionWsCache.ts` — Hook updating position state and PnL on position WebSocket events.
- `coalesceInvalidation.ts` — Utility debouncing and coalescing high-frequency React Query cache invalidations.

#### Symbol Search (`src/components/symbol-search/`)
- `SymbolSearchModal.tsx` — Modal dialog allowing search across Binance spot and futures symbols.
- `SymbolSearchResultRow.tsx` — Render row for individual search result items with volume and change.
- `CategoryFilterBar.tsx` — Tab bar filtering symbols by category (All, Crypto, Forex, Commodities).
- `useSymbolSearchResults.ts` — Hook handling query debouncing, Binance symbol filtering, and selection.
- `types.ts` — TypeScript types for symbol search queries, filters, and result items.

#### Indicator Settings (`src/components/indicator-settings/`)
- `IndicatorSettingsModal.tsx` — Settings dialog configuring inputs and colors for active indicators.
- `IndicatorInputsTab.tsx` — Form controls for numeric parameters (period, fast, slow, multiplier).
- `EmaSlotsSection.tsx` — Form controls configuring up to 5 individual EMAs with enable toggles, periods, and colors.
- `IndicatorStyleTab.tsx` — Color pickers and line style selectors (solid, dashed, dotted) per indicator.
- `types.ts` — TypeScript interfaces for indicator configuration tabs and forms.

#### Mobile Trading (`src/components/mobile-trading/`)
- `MobileTradingPanel.tsx` — Bottom sheet drawer for trading on mobile and compact screens.
- `MobileOrderTab.tsx` — Compact order entry form optimized for touch input.
- `MobilePositionsTab.tsx` — Mobile card view displaying active positions and quick close buttons.
- `MobileSymbolSelector.tsx` — Header symbol dropdown with price badge for mobile screens.
- `MobileAccountBar.tsx` — Compact equity, margin, and unrealized PnL summary bar.
- `types.ts` — Mobile trading view tab definitions and state interfaces.

#### Trading Dialogs (`src/components/trading-dialogs/`)
- `OrderConfirmDialog.tsx` — Confirmation modal before executing large or leveraged market orders.
- `OrderModifyDialog.tsx` — Dialog for adjusting price, quantity, TP, and SL on working orders.
- `PositionModifyDialog.tsx` — Barrel facade for the position TP/SL modify dialog.
- `TradeCalculator.tsx` — Position sizing and risk/reward calculator dialog.
- `TradeJournalPanel.tsx` — Barrel facade for the trade journal log panel.

##### Position Modify (`src/components/trading-dialogs/position-modify/`)
- `PositionModifyDialog.tsx` — Modal coordinator for editing take-profit, stop-loss, and closing positions.
- `ModifyTpSlTab.tsx` — Form tab calculating and editing TP/SL prices and percentages.
- `PartialCloseTab.tsx` — Form tab allowing partial close of a position with custom size.
- `types.ts` — Form data types and validation contracts for position modification.

##### Trade Journal (`src/components/trading-dialogs/journal/`)
- `TradeJournalPanel.tsx` — Coordinator panel for viewing, adding, and filtering trade notes.
- `JournalCard.tsx` — Individual journal card showing trade tags, screenshots, notes, and outcome.
- `JournalEntryForm.tsx` — Input form for creating and updating trade journal entries.
- `types.ts` — Journal entry models, filter states, and form interfaces.

---

### Global Hooks (`src/hooks/`)
- `src/hooks/useChartDrawings.ts` — Hook managing local storage persistence for drawings by symbol/timeframe.
- `src/hooks/useChartPreferences.ts` — Hook persisting chart appearance (grid, watermark, countdown, themes, activePlugins, and activeIndicators across refreshes).
- `src/hooks/useIndicatorSettings.ts` — Hook persisting customized indicator periods, colors, and line widths.
- `src/hooks/useTradeSound.ts` — Audio synthesizer providing feedback on order fills and SL/TP hits.

---

### Core Libraries & Plugins (`src/lib/`)
- `src/lib/indicators.ts` — Barrel facade re-exporting all technical indicator formulas.
- `src/lib/colorUtils.ts` — Color parsing and formatting supporting Hex, RGB, and RGBA with alpha/opacity.
- `src/lib/orderFlowDelta.ts` — Order flow calculations: taker buy/sell volume, net Bar Delta, Delta %, and Cumulative Volume Delta (CVD) series.
- `src/lib/livePnl.ts` — Pure function calculating real-time unrealized PnL and return percentages.
- `src/lib/utils.ts` — Common helper functions (`cn`, `formatNumber`, `hexToRgba`, `getErrorMessage`, etc.).

#### Indicators Library (`src/lib/indicators/`)
- `index.ts` — Central re-export of all indicator calculations and types.
- `types.ts` — Indicator types, settings interfaces, and calculation output contracts.
- `moving-averages.ts` — Pure implementations of SMA, EMA, and VWAP.
- `oscillators.ts` — Pure implementations of RSI, MACD, Stochastic, ATR, CCI, and Williams %R.
- `bands.ts` — Pure implementation of Bollinger Bands (middle, upper, lower).

#### Pine Script Engine (`src/lib/pinescript/`)
- `index.ts` — Central barrel facade re-exporting parser, evaluator, storage, and samples.
- `types.ts` — Type definitions for custom Pine indicators, parsed plots, hlines, and input configurations.
- `parser.ts` — Lightweight TradingView Pine Script syntax parser supporting `indicator()`, `study()`, `overlay`, inputs, assignments, and series functions.
- `evaluator.ts` — Mathematical execution engine evaluating parsed AST statements (SMA, EMA, RSI, ATR, Highest, Lowest) on candlestick data.
- `storage.ts` — LocalStorage persistence and event synchronization (`custom-pine-indicators-updated`) for user scripts.
- `samples.ts` — Pre-loaded built-in Pine Script templates (Dual SMA Crossover, Custom RSI, ATR Trailing Bands, MACD Momentum).

#### Chart Plugins (`src/lib/chart-plugins/`)
##### Bands Indicator (`src/lib/chart-plugins/bands-indicator/`)
- `bands-primitive.ts` — Custom Lightweight Charts primitive rendering shaded Bollinger Bands.
- `renderer.ts` — Canvas2D renderer drawing filled area between upper and lower band lines.

##### Delta Tooltip (`src/lib/chart-plugins/delta-tooltip/`)
- `delta-tooltip-pane.ts` — Multi-touch candlestick inspector showing bar details and price/time delta.
- `tooltip-layout.ts` — Layout math and coordinate clamping for floating inspection cards.

##### Session Breaks (`src/lib/chart-plugins/session-breaks/`)
- `session-breaks-primitive.ts` — Primitive rendering vertical session lines (Asian, London, NY opens).
- `renderer.ts` — Canvas2D renderer for dotted vertical market session boundary lines.

##### Volume Footprint Subsystem (`src/lib/chart-plugins/footprint/`)
- `footprint-primitive.ts` — Custom `ISeriesPrimitive` attaching volume footprint cluster rendering to chart series.
- `footprint-renderer.ts` — Canvas2D rasterizer rendering Bid × Ask volume profile ladders, text, POC boxes, and summary cards.
- `footprint-generator.ts` — Generates price-level volume clusters conserving exact bar buy/sell volume and delta.
- `footprint-types.ts` — Data structures for footprint price levels, POC flags, and summary stats.

##### Liquidation Heatmap Subsystem (`src/lib/chart-plugins/heatmap/`)
- `heatmap-primitive.ts` — Custom `ISeriesPrimitive` attaching CoinGlass-style liquidation heatmap behind candles (`zOrder: "bottom"`).
- `heatmap-renderer.ts` — Canvas2D rasterizer rendering Viridis colormap liquidation trails, diffuse glow, cutoff edge markers, and vertical intensity color scale.
- `heatmap-generator.ts` — Models leverage tiers (10x, 25x, 50x, 100x), computes liquidation thresholds from delta/volume, and simulates candle price sweep cutoffs.
- `heatmap-types.ts` — Data structures for leverage tiers, liquidation pool bands, and resolved coordinates.

##### Drawing Tools Subsystem (`src/lib/chart-plugins/drawing-tools/`)
- `manager.ts` — `DrawingToolsManager` coordinator orchestrating placement, editing, and events.
- `pointer-manager.ts` — Binds DOM mouse and touch listeners, dispatching events to controllers.
- `placement-controller.ts` — Multi-click and press-drag placement state machine with live preview.
- `drag-session.ts` — Manages active drag session lifecycle, body dragging, and point shifting.
- `drag-controller.ts` — Vector calculation shifting single points, parallel channels, and whole drawings.
- `selection-manager.ts` — Selection state, multi-select toggles, and hovered hit synchronization.
- `keyboard-manager.ts` — Keyboard shortcut dispatcher for undo/redo, tool select, copy/paste, and nudges.
- `clipboard-nudge.ts` — Clipboard copy/paste cloning and arrow key pixel nudging calculations.
- `cursor.ts` — Resolves appropriate CSS cursor for hover regions and interaction states.
- `snapping.ts` — Resolves data points with Shift 45° angle snapping and OHLC magnet snapping.
- `touch.ts` — Touch event adapters and long-press timer detector.
- `drawings-primitive.ts` — Custom `ISeriesPrimitive` attaching drawings canvas to Lightweight Charts.
- `factories.ts` — Factory generating new drawing instances with sensible defaults and IDs.
- `geometry.ts` — Pure vector math: Euclidean distance, angle snapping, and segment projection.
- `magnet.ts` — OHLC bar price snapping and nearby anchor magnet calculations.
- `shortcuts.ts` — Key code maps for Alt+key tool shortcuts and arrow nudge deltas.
- `types.ts` — Data structures for drawings, hit regions, anchors, and callback handlers.
- `coords.ts` — Shared coordinate conversion context (`ResolveCtx`) and time-to-X interpolation.
- `resolve.ts` — Barrel facade re-exporting coordinate resolvers.
- `resolve-entry.ts` — Resolves data anchors into canvas pixel coordinates for rendering.
- `resolve-fibonacci.ts` — Resolves multi-level horizontal Fibonacci price levels into pixel Y values.
- `resolve-trendline.ts` — Resolves start/end endpoints, ray extensions, and midpoint labels.
- `resolve-volume-profile.ts` — Calculates volume profile histogram bins across selected candle range.
- `line-alerts.ts` — Monitors candle price crossings across trendlines and horizontal ray alerts.
- `hit-test.ts` — Barrel facade for hit-testing algorithms.
- `hit-test/body-tests.ts` — Hit detection algorithms for drawing bodies (rectangles, channels, positions).
- `hit-test/distance-tests.ts` — Geometric point-to-segment distance calculations.
- `hit-test/point-tests.ts` — Hit detection for interactive endpoint resize handles.
- `renderers.ts` — Barrel facade re-exporting all drawing renderers.
- `renderers/canvas-utils.ts` — Canvas2D utilities: pixel ratio scaling, handle circles, and dash styles.
- `renderers/channel-renderer.ts` — Canvas2D renderer for parallel channel bounds and center midline.
- `renderers/fib-renderer.ts` — Canvas2D renderer for Fibonacci retracement levels and colored zones.
- `renderers/line-renderer.ts` — Canvas2D renderer for trendlines, horizontal rays, and arrows.
- `renderers/position-renderer.ts` — Canvas2D renderer for long/short position risk/reward boxes.
- `renderers/position-tracker-renderer.ts` — Canvas2D renderer for live PnL badges and trailing target tags.
- `renderers/shape-renderer.ts` — Canvas2D renderer for rectangles, circles, and shaded zones.
- `renderers/text-renderer.ts` — Canvas2D renderer for annotations and floating callout text.
- `renderers/volume-profile-renderer.ts` — Canvas2D renderer for horizontal volume profile histograms.

---

### Pages Layer (`src/pages/`)
- `src/pages/TradingPage.tsx` — Barrel facade delegating to the modular trading page.

#### Master Trading Page (`src/pages/trading-page/`)
- `TradingPage.tsx` — Main master layout coordinator assembling header, main area, and sidebars.
- `TradingPageHeader.tsx` — Top application header displaying active symbol, brand, and layout toggles.
- `TradingMainArea.tsx` — Center layout containing chart, tool rail, and bottom indicators.
- `TradingCenterView.tsx` — Container coordinating chart panel resizing and bottom oscillator panel.
- `TradingRightPanel.tsx` — Right sidebar displaying Watchlist, Order Panel, or Object Tree.
- `TradingDialogContainer.tsx` — Wrapper mounting confirm, modify, settings, and journal modals.
- `MobileTradingSection.tsx` — Responsive mobile container rendering mobile tabs and bottom sheet.
- `types.ts` — TypeScript types for master trading page props and confirm states.
- `useTradingPageData.ts` — Hook loading active symbol, accounts, and server kline status.
- `useTradingChartControls.ts` — Hook managing timeframe switches, indicator toggles, and chart types.
- `useTradingActions.ts` — Hook executing orders, modifying positions, and canceling orders.
- `useTradingLayoutResize.ts` — Hook managing draggable splitter heights and responsive widths.
- `useTradingJournal.ts` — Hook querying and mutating trade journal entries.
- `useTradingShortcuts.ts` — Hook registering global terminal keyboard shortcuts.
- `useChartViewportController.ts` — Viewport framing coordinator: preserves calendar-time, zoom ratio, and Y-axis price range across timeframe switches, prefetches primary timeframes, and coordinates live vs. historical anchors.

#### Trading Terminal Panels (`src/pages/trading/`)
- `src/pages/trading/constants.ts` — Central constants (timeframes, intervals, default colors, tool lists).
- `src/pages/trading/utils.ts` — Trading terminal layout and formatting helper functions.
- `src/pages/trading/drawingStyles.ts` — Default color palettes, line widths, and fonts for drawing tools.
- `src/pages/trading/drawingToolMeta.ts` — Metadata, tooltips, and shortcut labels for drawing tools.
- `src/pages/trading/DOMPanel.tsx` — Depth of Market (DOM) / order book ladder panel.
- `src/pages/trading/MarketClosedBanner.tsx` — Banner warning when trading closed market assets.
- `src/pages/trading/ObjectTreePanel.tsx` — Tree view listing all active drawings and indicators on chart.
- `src/pages/trading/OrdersTable.tsx` — Table displaying active working orders with cancel buttons.
- `src/pages/trading/PositionsTable.tsx` — Table displaying open positions, unrealized PnL, TP/SL, and close.
- `src/pages/trading/ReplayHUD.tsx` — Floating heads-up display showing replay status, date, and playback speed.
- `src/pages/trading/ReplayScrubber.tsx` — Interactive timeline slider for bar-by-bar historical replay.
- `src/pages/trading/useChallengeLevels.ts` — Hook computing prop-firm evaluation profit targets and drawdown.
- `src/pages/trading/useIndicators.ts` — Hook computing active indicators from candlestick array.
- `src/pages/trading/useReplayChartData.ts` — Hook slicing candle data at current replay timestamp cursor.
- `src/pages/trading/useReplayPlayback.ts` — Hook driving timer ticker advancing replay bars at selected speed.
- `src/pages/trading/useSlTpDrag.ts` — Hook handling interactive dragging of SL and TP price lines on chart.
- `src/pages/trading/ChartContextMenu.tsx` — Context menu for chart canvas (reset scale, add alert, settings).

#### Chart Viewport Panel (`src/pages/trading/chart/`)
- `ChartPanel.tsx` — Primary chart viewport coordinator rendering Lightweight Charts canvas.
- `chartConfig.ts` — Chart configuration factory generating themes, layout, and scale options.
- `chartSeriesInit.ts` — Initializes candlestick series, volume histogram, and price lines.
- `chartFraming.ts` — Calculates logical range framing recent candles with right margin, preserves Y-axis price range and zoom ratio across timeframe switches.
- `chartPluginManager.ts` — Manages lifecycle of attached primitives (delta tooltip, sessions, drawings).
- `chartHistoryLoader.ts` — Bidirectional history loader: detects left-scroll edge for older pagination and right-scroll edge for newer forward pagination towards live edge.
- `chartWheelHandler.ts` — Vertical mouse wheel price scaling on price axis and horizontal zoom-out clamping at oldest historical edge.
- `chartOverlays.ts` — Configures overlay indicators (SMA, EMA, VWAP, Bollinger Bands).
- `ChartOverlaysContainer.tsx` — DOM container rendering floating legends, countdown timers, and badges.
- `ChartLegendHeader.tsx` — Top-left OHLCV legend with indicator readouts and eye toggle icons.
- `ChartPanelDialogs.tsx` — Mounts settings and context menu dialogs specific to the chart panel.
- `ChartDialogs.tsx` — Wrapper mounting drawing settings dialogs.
- `DragPriceTooltip.tsx` — Floating tooltip displaying price delta while dragging TP/SL lines.
- `bidAskLines.ts` — Manages real-time bid and ask dashed price lines on right price scale.
- `drawingManagerInit.ts` — Instantiates and connects `DrawingToolsManager` to chart and series.
- `realtimeFeed.ts` — Real-time price feed subscriber feeding incoming ticks into active candle.
- `types.ts` — Types and interfaces for chart lifecycle, refs, and configuration options.
- `useCandleCountdown.ts` — Hook calculating remaining seconds until active candle closes.
- `useCandlesMerge.ts` — Hook merging historical server candles with in-flight live tick bar.
- `useChartContextMenuActions.ts` — Hook providing actions for chart context menu clicks.
- `useChartDataPipeline.ts` — Hook feeding normalized, deduped candles into Lightweight Charts.
- `useChartIndicatorSettingsState.ts` — Hook managing modal state for indicator settings dialog.
- `useChartLifecycle.ts` — Hook orchestrating chart mount, container resizing, and unmount cleanup.
- `useChartOptionSync.ts` — Hook synchronizing theme and grid preferences to Lightweight Charts options.
- `useChartOverlaysIntegration.ts` — Hook synchronizing overlay indicator lines with candlestick series.
- `useChartPluginAttachment.ts` — Hook attaching and detaching custom primitives based on preferences.
- `useChartStateRefs.ts` — Ref container preventing stale closures during high-frequency callbacks.
- `useDrawingManagerRefs.ts` — Ref container linking drawing manager callbacks to active component state.
- `useDrawingSelectionState.ts` — Hook managing selected and hovered drawing IDs.
- `useLineCrossAlerts.ts` — Hook checking candle price crosses against user-defined alert lines.
- `useRealtimeEffects.ts` — Hook binding live tick subscribers to update series in real time.
- `useReplayMarkers.ts` — Hook placing entry/exit trade markers on chart during historical replay.
- `useStalenessWatchdog.ts` — Hook detecting stalled data feeds and triggering fallback polling.
- `useFootprintAttachment.ts` — Hook managing FootprintPrimitive attachment and candlestick opacity synchronization.
- `useHeatmapAttachment.ts` — Hook managing HeatmapPrimitive attachment, lifecycle, and series styling.

#### Chart Toolbar (`src/pages/trading/chart-toolbar/`)
- `ChartToolbar.tsx` — Top horizontal bar coordinating symbol picker, timeframes, and menus.
- `SymbolPicker.tsx` — Active symbol trigger button opening symbol search modal.
- `TimeframeSelector.tsx` — Quick-select buttons for common timeframes (1m, 5m, 15m, 1h, 4h, 1d).
- `ChartTypeSelector.tsx` — Dropdown selecting chart visualization (Candles vs. Footprint vs. Liquidation Heatmap) with quick-settings gear buttons.
- `ChartTypeSettingsModal.tsx` — Modal dialog providing dedicated controls for Heatmap (brightness, band thickness, floor opacity, colormaps), Footprint, and Candles.
- `HeatmapSettingsTab.tsx` — Heatmap settings tab with intensity/brightness boost, band height, and colormap selectors.
- `IndicatorMenu.tsx` — Dropdown toggling overlay and subchart indicators with fixed height scrollable list, search filtering, category tabs, and Pine Script import trigger.
- `PineScriptImportModal.tsx` — Modal dialog for importing, pasting, editing, testing, and managing custom Pine Script indicators.
- `DrawingToolsDropdown.tsx` — Dropdown menu for mobile or compact drawing tool access.
- `PluginsDropdown.tsx` — Dropdown enabling optional plugins (session breaks, delta tooltip).
- `RightPanelSelector.tsx` — Toggle buttons switching right sidebar between Watchlist and Order Panel.
- `LivePriceBadge.tsx` — Animated badge displaying current symbol price and 24h change.
- `ToolButton.tsx` — Reusable icon button component for toolbar items.
- `types.ts` — TypeScript types for toolbar props, menus, and selection callbacks.

#### Chart Settings (`src/pages/trading/chart-settings/`)
- `ChartSettingsDialog.tsx` — Modal coordinator configuring chart canvas settings.
- `form-controls.tsx` — Reusable color pickers, checkboxes, and select dropdowns for settings.
- `types.tsx` — Tab definitions and form model interfaces for chart settings.
- `tabs/AppearanceTab.tsx` — Appearance tab: background color, grid lines, watermark, and countdown.
- `tabs/ColorsTab.tsx` — Colors tab: bullish/bearish candle bodies, wicks, and border colors.
- `tabs/ScalesTab.tsx` — Scales tab: price scale mode (auto, normal, log, percent) and decimals.
- `tabs/TradingTab.tsx` — Trading tab: show/hide positions, order lines, and execution arrows.
- `tabs/EventsTab.tsx` — Events tab: session break lines and economic news event markers.

#### Chart Templates (`src/pages/trading/chart-templates/`)
- `ChartTemplatesMenu.tsx` — Menu for saving and applying chart indicator & layout templates.
- `TemplateList.tsx` — List of saved templates with apply and delete actions.
- `templateSerializer.ts` — Serializes active indicators and preferences to JSON strings.
- `useChartTemplates.ts` — Hook managing saved templates in localStorage.
- `types.ts` — Template schema and data interfaces.

#### Drawing Rail (`src/pages/trading/drawing-rail/`)
- `DrawingToolRail.tsx` — Left vertical rail displaying drawing tool icons and magnet mode.
- `CompactRail.tsx` — Compact icon-only rail for narrow screens.
- `RailButton.tsx` — Interactive rail button with active state indicator and tooltip.
- `ReorganizePanel.tsx` — Modal allowing customization and reordering of favorite drawing tools.
- `useRailReorder.ts` — Hook managing drag-and-drop reordering of rail tool icons.
- `types.ts` — Rail tool items, group definitions, and reordering state interfaces.

#### Drawing Overlay (`src/pages/trading/drawing-overlay/`)
- `DrawingToolsOverlay.tsx` — Overlay mounting floating toolbar and settings dialogs over drawings.
- `DrawingFloatingToolbar.tsx` — Floating quick-action toolbar appearing above selected drawing.
- `DrawingSettingsDialog.tsx` — Modal dialog editing colors, line widths, and coordinates of a drawing.
- `DrawingContextMenu.tsx` — Context menu for drawings (clone, lock, hide, delete).
- `types.ts` — Interfaces for drawing overlay state, active selections, and menu callbacks.
- `settings/SettingControls.tsx` — Line color, width, and style selector controls.
- `settings/CoordinateSettings.tsx` — Precise numeric input controls for anchor prices and timestamps.
- `settings/TextSettings.tsx` — Text input, font size, and text alignment controls for callout drawings.

#### Order Panel (`src/pages/trading/order-panel/`)
- `OrderPanel.tsx` — Right sidebar for entering market, limit, stop, and stop-limit orders.
- `OrderPanelHeader.tsx` — Header showing account balance, leverage slider, and close-all button.
- `OrderSideSelector.tsx` — Segmented control switching between Buy (Long) and Sell (Short).
- `OrderTypeSelector.tsx` — Dropdown selecting order type (Market, Limit, Stop, Stop-Limit).
- `OrderQuantityInput.tsx` — Quantity input with percentage buttons (25%, 50%, 75%, 100% of equity).
- `OrderFormFields.tsx` — Limit price, stop price, take-profit, and stop-loss input fields.
- `OrderRiskAnalysis.tsx` — Calculated margin required, risk/reward ratio, and estimated fee preview.
- `types.ts` — Order form model, validation schema, and side definitions.

#### Watchlist (`src/pages/trading/watchlist/`)
- `WatchlistPanel.tsx` — Right sidebar panel managing custom watchlists and market quotes.
- `WatchlistHeader.tsx` — Header with watchlist selector dropdown and add-symbol button.
- `WatchlistTabBar.tsx` — Horizontal tab bar for switching between custom user watchlists.
- `WatchlistSymbolRow.tsx` — Individual symbol row showing ticker, live price, spread, and 24h change.
- `WatchlistBurgerMenu.tsx` — Menu for creating, renaming, and deleting watchlists.
- `RibbonFlagIcon.tsx` — Color flag icon button bookmarking symbols for fast filtering.
- `useTickerChanges.ts` — Hook tracking price direction flashes (green up, red down) on live ticks.
- `types.ts` — Watchlist data structures, symbol entry items, and tab interfaces.

#### Bottom Indicators Panel (`src/pages/trading/bottom-indicators/`)
- `BottomIndicatorsPanel.tsx` — Sub-chart coordinator rendering multiple stacked oscillator indicators separated by blue dividers (`#2962ff`), dynamic time scales, and empty state guidance text.
- `IndicatorPane.tsx` — Individual stacked sub-chart pane container hosting a synchronized Lightweight Charts instance.
- `IndicatorHeader.tsx` — TradingView-style header overlay displaying active indicator title, parameters, real-time crosshair values, and hover actions.
- `IndicatorContextMenu.tsx` — Context menu for resetting, customizing, or removing indicators.
- `indicatorDataAlignment.ts` — Aligning and padding calculated indicator data with candlestick timestamps.
- `seriesBuilders.ts` — Factory creating line and histogram series for RSI, MACD, STOCH, ATR, CCI, WR.
- `seriesUpdate.ts` — Updates series data with newly computed indicator arrays.
- `useChartSync.ts` — Synchronizes logical visible range, crosshair positions, and scale margins between main chart and sub-chart.
- `useIndicatorChart.ts` — Manages mounting, resizing, and teardown of oscillator chart instances.
- `useIndicatorCalculation.ts` — Runs indicator math algorithms over candlestick data with caching.
- `useIndicatorSeries.ts` — Manages addition, removal, and styling of oscillator indicator series.
- `types.ts` — Indicator pane configurations, series references, and synchronization interfaces.

#### Bottom Panel (`src/pages/trading/bottom-panel/`)
- `BottomPanel.tsx` — Tabbed tray coordinator for Positions, Orders, Trade History, and Journal.
- `BottomPanelTabBar.tsx` — Tab bar switching between bottom panel trays with badge counters.
- `OrdersTab.tsx` — Active orders view with modification and cancellation controls.
- `PositionsTab.tsx` — Open positions view with real-time mark-to-market PnL and close controls.
- `TradeHistoryTable.tsx` — Historical closed trades table displaying realized PnL and fees.
- `types.ts` — Tab identifiers, props, and callback interfaces for the bottom panel.

---

### Services Layer (`src/services/`)
- `src/services/api.ts` — Central API facade delegating to demo paper trading implementations.
- `src/services/ws.ts` — WebSocket client abstraction managing connection lifecycles and reconnects.
- `src/services/schemas.ts` — Zod schemas and TypeScript types for candles, accounts, orders, positions.
- `src/services/toast.ts` — Lightweight notification toast manager for order execution alerts.
- `src/services/store.tsx` — Barrel facade re-exporting all Zustand stores.
- `src/services/queries.ts` — Barrel facade re-exporting TanStack React Query hooks and keys.

#### Unified Market Data Subsystem (`src/services/market-data/`)
- `index.ts` — Central barrel exports for the market data layer.
- `types.ts` — Type definitions for market data mode, queries, metadata, and historical window parameters.
- `binanceClient.ts` — High-performance Binance REST v3 kline client with request deduplication, paged multi-batch fetching, and offline fallback.
- `candleRepository.ts` — Enterprise-grade Single Source of Truth for candlestick series with strict contiguity checks, monotonic timestamps, bidirectional range fetching (fetchNewer / fetchRange), zero Frankenstein merging, and decoupled price update subscriptions.

#### API Endpoints (`src/services/api/`)
- `request.ts` — Core HTTP request client wrapper with error normalization.
- `accounts.ts` — Account balance and margin query endpoints.
- `auth.ts` — User authentication and demo session endpoints.
- `chart-templates.ts` — Endpoints saving and fetching custom chart templates.
- `journal.ts` — Endpoints for CRUD operations on trade journal logs.
- `market-data.ts` — Historical klines, ticker quotes, and order book endpoints.

#### Demo Paper Trading Engine (`src/services/demo/`)
- `api.ts` — In-browser mock API adapter fulfilling endpoints via the local demo engine.
- `bus.ts` — Pub/sub event bus decoupling market ticks, engine execution, and UI updates.
- `feed.ts` — Real-time price tick generator and candle aggregator publishing live prices.
- `instruments.ts` — Static specifications for supported trading pairs (tick size, lot size, leverage).
- `candles.ts` — Candle loading coordinator reading bundled JSON files with Binance REST fallback.
- `binance.ts` — Barrel facade re-exporting Binance client modules.
- `engine.ts` — Barrel facade re-exporting paper trading matching engine.

##### Binance Client (`src/services/demo/binance/`)
- `index.ts` — Central re-export of Binance data fetchers.
- `klines.ts` — Fetches historical OHLCV klines from Binance public REST API.
- `tickers.ts` — Fetches 24h ticker price change statistics and volumes.
- `priceStorage.ts` — In-memory and localStorage cache for downloaded Binance klines.
- `symbolMapping.ts` — Maps standard terminal symbols (`BTCUSD`) to Binance pairs (`BTCUSDT`).

##### Paper Trading Engine (`src/services/demo/engine/`)
- `index.ts` — Central re-export of paper trading engine functions.
- `orders.ts` — Order placement, limit/stop order matching against incoming ticks, and cancel logic.
- `positions.ts` — Position lifecycle: mark-to-market PnL, margin allocation, partial close, TP/SL triggers.
- `accounting.ts` — Account equity, available balance, maintenance margin, and liquidation checks.
- `state.ts` — In-memory storage for open accounts, orders, positions, and trade history ledger.

##### Bundled Candle Data (`src/services/demo/data/`)
- `manifest.json` — Manifest cataloging available offline candle datasets.
- `*.json` — 49 bundled JSON files containing offline candle history for 7 symbols across 7 timeframes.

#### React Query Layer (`src/services/queries/`)
- `index.ts` — Central re-export of all React Query hooks.
- `keys.ts` — Query key factories ensuring deterministic cache partitioning.
- `market.ts` — `useCandles`, `useTicker`, `useOrderBook` query hooks.
- `trading.ts` — `usePositions`, `useOrders`, `useTradeHistory` query hooks.
- `accounts.ts` — `useAccount`, `useAccounts` query hooks.
- `journal.ts` — `useJournalEntries`, `useCreateJournalEntry` query hooks.
- `analytics.ts` — Query hooks for account performance analytics and win-rate statistics.
- `features.ts` — Query hooks for terminal feature flags and configuration.
- `botAndNotifications.ts` — Query hooks for automated bot status and trading alert notifications.
- `aiTrader.ts` — Query hooks for AI trade assistance signals.
- `competitions.ts` — Query hooks for trader leaderboards and competition rankings.
- `supportAndFirm.ts` — Query hooks for prop-firm rules, evaluation targets, and support tickets.

#### Zustand Stores (`src/services/stores/`)
- `index.ts` — Central re-export of all Zustand store hooks.
- `useTradingStore.ts` — Primary trading store: live ticks, active candle, symbol bookmarks, replay state.
- `watchlistSlice.ts` — Store slice managing watchlist tabs, symbol ordering, and flag bookmarks.
- `watchlistStorage.ts` — LocalStorage adapter for persisting user-created watchlists.
- `useAuthStore.ts` — Store managing authentication session, demo mode, and active account ID.
- `useTickStore.ts` — Dedicated high-frequency store for ultra-fast symbol ticker quotes.

---

### Styles (`src/styles/`)
- `src/styles/global.css` — Core Tailwind directives and base document styles.
- `src/styles/theme.css` — CSS variables defining light/dark color tokens, charts grid, and borders.
- `src/styles/components.css` — Custom utility classes for scrollbars, dialog backdrops, and animations.

---

### Tests (`src/__tests__/`)
- `src/__tests__/setup.ts` — Vitest setup script configuring jsdom and mocking ResizeObserver.
- `src/__tests__/utils.test.ts` — Unit tests for shared utilities (`formatNumber`, `hexToRgba`, `getErrorMessage`).
- `src/__tests__/indicators.test.ts` — Unit tests validating mathematical accuracy of SMA, EMA, RSI, MACD, BOLL.
- `src/__tests__/engine.test.ts` — Unit tests validating order matching, position PnL, margin, and liquidation.
- `src/__tests__/favoriteDrawingTools.test.ts` — Unit tests for drawing rail tool reordering and storage.
- `src/__tests__/volumeProfileHitTest.test.ts` — Unit tests for volume profile geometric collision detection.
- `src/__tests__/button.test.tsx` — React component tests for button rendering, variants, and interactions.
- `src/__tests__/drawingPlacement.test.ts` — Unit tests for click and drag drawing tool placement.
- `src/__tests__/chartPerformanceAndHistory.test.ts` — Performance and historical candle pagination tests.
- `src/__tests__/drawingCrossTimeframe.test.ts` — Unit tests validating timestamp preservation across timeframes and single bottom date bar.

---

## 3. How Modules Talk to Each Other

Project Quant uses four distinct communication channels to keep performance high and prevent spaghetti couplings:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Communication Channels                          │
├────────────────────────────────────────────────────────────────────────┤
│ 1. High-Frequency State (Zustand: useTradingStore, useTickStore)       │
│    • 50ms price updates, live tick bars, active watchlist selection.   │
│    • Components subscribe to selective slices: (s) => s.ticks[symbol]  │
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
│    • Custom primitives bypass React DOM for drawing tools and bands.   │
└────────────────────────────────────────────────────────────────────────┘
```

1. **User Interaction -> Coordinator -> Actions**:
   - The user clicks a button (e.g. Place Order in `OrderPanel.tsx`).
   - `OrderPanel` invokes callback provided by `useTradingActions.ts`.
   - `useTradingActions` calls `api.orders.create()`.
2. **Execution -> Event Bus -> Cache Invalidation**:
   - `api.orders.create` is handled by `src/services/demo/engine/orders.ts`.
   - The engine checks available margin (`accounting.ts`), creates the order, and publishes `ORDER_FILLED` on `bus.ts`.
   - `MarketDataBridge.tsx` listens to `bus.ts` and uses `coalesceInvalidation.ts` to invalidate `["orders"]` and `["positions"]` in React Query.
   - `useOrders` and `usePositions` update reactively in `BottomPanel.tsx`.
3. **Subchart Synchronization**:
   - As the user scrolls or zooms `ChartPanel.tsx`, its `timeScale` emits logical range changes.
   - `useChartSync.ts` in `BottomIndicatorsPanel.tsx` receives the range and immediately calls `subChart.timeScale().setVisibleLogicalRange()` to keep candles and oscillator lines aligned at 60 FPS.

---

## 4. Main Data Flows

### A. Live Market Data Flow
```
Binance REST / Offline JSON ──► useCandles (React Query) ──► series.setData()
                                                                   │
Binance WebSocket / Simulated Feed                                 ▼
         │                                              Main Candlestick Canvas
         ▼                                                         ▲
      feed.ts ──► useTradingStore.ticks / liveCandleUpdates ───────┘
```
1. `TradingPage` mounts and requests historical bars via `useCandles(symbol, tf)`.
2. Initial 400 bars render immediately (`firstPaintCandleLimit`); background loader loads up to 10,000 bars.
3. `feed.ts` generates ~50ms ticks or receives WebSocket frames, pushing them into `useTradingStore`.
4. `realtimeFeed.ts` in `ChartPanel` subscribes to the active symbol's tick, calling `series.update()` on Lightweight Charts.

### B. Order Execution & Margin Flow
```
User clicks Buy ──► OrderPanel ──► useTradingActions ──► engine.createOrder()
                                                               │
                                                               ▼
Audio cue / Toast ◄── bus.publish(ORDER_FILLED) ◄─── Match against Tick Price
         │                                                     │
         ▼                                                     ▼
React Query Invalidation ──► usePositions() updates ──► PositionsTable
```
1. `OrderPanel` calculates required margin from equity and leverage.
2. Order is submitted to `src/services/demo/engine/orders.ts`.
3. If market order, matched immediately at active bid/ask; if limit/stop, placed into working order book.
4. On fill, `bus.ts` broadcasts `ORDER_FILLED`, `useTradeSound` triggers audio feedback, and `usePositions` updates the UI.

### C. Drawing Tools Lifecycle
```
Toolbar Click ──► DrawingToolsManager.setTool("trendline")
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

## 5. Structural Change Policy

Whenever you:
- **Add a file**: Add its path and a concise one-line description to Section 2 of this document.
- **Move/Rename a file**: Update its location in Section 2.
- **Delete a file**: Remove its entry from Section 2.
- **Decompose a module**: Document each new submodule under its respective directory.

# UI Layout, Styling & Terminal Panels

This document covers the UI hierarchy, layout coordinator, responsive adaptations, modular toolbar, rail systems, and CSS architecture of Project Quant.

---

## 1. Directory Structure

```
src/
├── pages/
│   ├── trading-page/                 # Master page layout coordinator (<280 lines each)
│   │   ├── TradingPage.tsx           # Assembles header, main center view, and right sidebar
│   │   ├── TradingPageHeader.tsx     # Brand header, symbol search trigger, layout toggles
│   │   ├── TradingMainArea.tsx       # Center area hosting tool rail, chart, bottom indicators
│   │   ├── TradingCenterView.tsx     # Main chart canvas and bottom indicator splitters
│   │   ├── TradingRightPanel.tsx     # Right sidebar switching: Watchlist / Order / Tree
│   │   ├── TradingDialogContainer.tsx# Wrapper mounting confirm, modify, journal modals
│   │   ├── MobileTradingSection.tsx  # Responsive drawer container for small viewports
│   │   ├── useTradingLayoutResize.ts # Splitter dragging and panel width resize hooks
│   │   ├── useTradingShortcuts.ts    # Global keyboard shortcuts (Alt+keys, Del, Esc)
│   │   └── useChartViewportController.ts # Coordinates calendar-time & zoom across switches
│   └── trading/
│       ├── chart-toolbar/            # Top horizontal chart toolbar (<250 lines each)
│       │   ├── ChartToolbar.tsx      # Main toolbar bar container
│       │   ├── SymbolAndChartTypeCapsule.tsx # Unified enlarged symbol badge & chart type selector
│       │   ├── SymbolPicker.tsx      # Active symbol trigger with live quote badge
│       │   ├── TimeframeSelector.tsx # 1m, 5m, 15m, 1h, 4h, 1d quick buttons
│       │   ├── ChartTypeSelector.tsx # Candles vs Footprint vs Liquidation Heatmap selector
│       │   ├── ChartTypeSettingsModal.tsx # Dedicated modal for Footprint & Heatmap settings
│       │   ├── HeatmapSettingsTab.tsx # Heatmap intensity, band height, and colormap options
│       │   ├── IndicatorMenu.tsx     # Indicator dropdown with search, categories & {/} Pine action
│       │   ├── PineScriptEditorModal.tsx # Universal indicator Pine Script editor modal
│       │   ├── PineScriptImportModal.tsx # Backward-compatible facade for Pine imports
│       │   ├── PluginsDropdown.tsx   # Toggles session breaks & delta tooltip
│       │   ├── RightPanelSelector.tsx# Toggles right sidebar between Watchlist and Orders
│       │   └── LivePriceBadge.tsx    # Live price ticker badge with 24h % change
│       ├── drawing-rail/             # Left vertical tool rail (<200 lines each)
│       │   ├── DrawingToolRail.tsx   # Primary tool rail with active indicators & magnets
│       │   ├── CompactRail.tsx       # Compact rail variant for narrower screens
│       │   ├── RailButton.tsx        # Interactive button with hover tooltip and active dot
│       │   ├── ReorganizePanel.tsx   # Modal for drag-and-drop tool reordering
│       │   └── useRailReorder.ts     # Hook managing favorite tool order in localStorage
│       ├── drawing-overlay/          # Floating drawing toolbars & dialogs
│       │   ├── DrawingToolsOverlay.tsx # Container mounting floating toolbars over drawings
│       │   ├── DrawingFloatingToolbar.tsx # Floating quick-action bar (color, width, delete)
│       │   ├── DrawingSettingsDialog.tsx # Full coordinates and style editor dialog
│       │   └── DrawingContextMenu.tsx # Context menu (clone, lock, hide, delete)
│       ├── chart-settings/           # Canvas settings modal (<200 lines each)
│       │   ├── ChartSettingsDialog.tsx # Modal container coordinating settings tabs
│       │   ├── tabs/AppearanceTab.tsx # Background color, grid lines, watermark, countdown
│       │   ├── tabs/ColorsTab.tsx    # Bullish/bearish candle bodies, wicks, and borders
│       │   ├── tabs/ScalesTab.tsx    # Auto, normal, log, percent price scale modes
│       │   ├── tabs/TradingTab.tsx   # Toggle positions, order lines, and execution arrows
│       │   └── tabs/EventsTab.tsx    # Session break lines and economic news markers
│       ├── chart-templates/          # Layout & indicator template persistence
│       │   ├── ChartTemplatesMenu.tsx# Dropdown menu to save/apply templates
│       │   ├── TemplateList.tsx      # Saved templates list with delete actions
│       │   └── templateSerializer.ts # JSON serializer for indicators and chart options
│       └── bottom-panel/             # Bottom tabbed tray (<250 lines each)
│           ├── BottomPanel.tsx       # Tray coordinator with minimize/maximize toggles
│           ├── BottomPanelTabBar.tsx # Tab bar with badge counters (Positions, Orders, etc.)
│           ├── OrdersTab.tsx         # Active working orders table with cancel buttons
│           ├── PositionsTab.tsx      # Open positions table with live PnL & TP/SL inputs
│           └── TradeHistoryTable.tsx # Historical ledger of closed trades and fees
├── components/
│   ├── color-picker/                 # TradingView-style color picker system
│   │   ├── ColorPicker.tsx           # Palette swatch button with inline & flyout popovers
│   │   ├── ColorPickerContext.tsx    # Context managing flyout positioning & active target
│   │   └── RgbPickerPanel.tsx        # 2D saturation/brightness spectrum, Hue & Opacity sliders
│   └── mobile-trading/               # Dedicated mobile trading drawer (<200 lines each)
│       ├── MobileTradingPanel.tsx    # Draggable bottom sheet drawer
│       ├── MobileOrderTab.tsx        # Compact touch-friendly order form
│       ├── MobilePositionsTab.tsx    # Card-based active position list
│       ├── MobileSymbolSelector.tsx  # Compact symbol dropdown with price badge
│       └── MobileAccountBar.tsx      # Account equity, margin, and unrealized PnL summary
└── styles/
    ├── global.css                    # Tailwind directives & base styles
    ├── theme.css                     # CSS variables for light/dark color tokens
    └── components.css                # Custom scrollbars, dialog backdrops & animations
```

---

## 2. Layout Structure & Resizing (`src/pages/trading-page/`)

The terminal utilizes a three-column CSS flex layout:
1. **Left Drawing Rail**: Fixed width (48px default, 36px compact).
2. **Center Main Area**:
   - `ChartToolbar`: Fixed top bar (38px height).
   - `ChartPanel`: Takes remaining height or splits with `BottomIndicatorsPanel`.
   - Draggable horizontal splitter: Adjusted via `useTradingLayoutResize.ts`, persisted in `localStorage`.
   - `BottomPanel`: Tabbed tray (Positions, Orders, History) with minimize toggle.
3. **Right Sidebar**:
   - Resizable width ($280\text{px} - 450\text{px}$), draggable divider.
   - Hosts `WatchlistPanel`, `OrderPanel`, or `ObjectTreePanel`.

### Combined Symbol & Chart Visualization Capsule (`SymbolAndChartTypeCapsule.tsx`)
Inspired by TradingView's compact header layout, the symbol search trigger and the chart type visualization selector are unified into a single rounded pill:
- **Left Capsule Section**: Current symbol trigger (e.g. `BTCUSDT`), opens the symbol search modal (`onOpenSymbolSearch`) or fallback inline dropdown.
- **Inner Separator**: Subtle vertical divider (`w-px h-3.5 bg-[#2a2e39]`).
- **Right Capsule Section**: Icon button displaying the active visualization mode (`CandlestickChart`, `FootprintIcon`, or `Flame`) with a subtle down chevron. Clicking opens the visualization dropdown.
- **Clean Dropdown Menu**: Individual gear settings buttons next to options are removed. Each option displays its icon, title, description, and an active checkmark. Clicking any row selects the mode and closes the dropdown immediately.
- **Dedicated Settings Gear**: A quick settings gear button sits right after the capsule, immediately before the timeframe selector, opening the `ChartTypeSettingsModal` for configuring Footprint and Liquidation Heatmap parameters.

### Chart Visualization Icons (`ChartTypeSelector.tsx`, `SymbolAndChartTypeCapsule.tsx`)
The toolbar uses professional TradingView/CoinGlass-aligned vector iconography:
- **Candles**: `CandlestickChart` from `lucide-react` representing standard Japanese candlesticks.
- **Footprint**: `FootprintIcon` custom SVG depicting split Bid × Ask order flow volume cluster ladders with wicks.
- **Liquidation Heatmap**: `Flame` from `lucide-react` representing high-leverage liquidation pools.
- **Controls & Modals**: `Settings` and `X` from `lucide-react` for modal triggers and actions.

---

## 3. Color System & Theme Tokens (`src/styles/theme.css`)

Project Quant features a complete financial color token system implemented via CSS custom variables:

| Token | Dark Theme | Light Theme | Usage |
| :--- | :--- | :--- | :--- |
| `--bg-primary` | `#131722` | `#ffffff` | Primary canvas & panel background |
| `--bg-secondary` | `#1e222d` | `#f0f3fa` | Header, sidebar & toolbars |
| `--bg-card` | `#2a2e39` | `#e0e3eb` | Cards, popovers & dropdown menus |
| `--color-border` | `#2a2e39` | `#e0e3eb` | Panel borders & dividers |
| `--color-bullish` | `#089981` | `#089981` | Green up candles, profitable PnL |
| `--color-bearish` | `#f23645` | `#f23645` | Red down candles, losing PnL |
| `--color-brand` | `#2962ff` | `#2962ff` | Active tab highlights, indicators divider |

---

## 4. Mobile & Touch Adaptations (`src/components/mobile-trading/`)

For viewports under `768px`:
- Desktop sidebars (OrderPanel, Watchlist) automatically collapse into the background.
- `MobileTradingPanel.tsx` mounts as a swipeable bottom sheet drawer.
- Hit detection radiuses in `touch.ts` are scaled by $2\times$ (`TOUCH_HIT_SCALE`) for reliable finger interaction.
- Long-press ($500\text{ms}$) opens drawing settings without requiring double-tap.

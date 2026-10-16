# UI Layout, Styling & Terminal Panels

This document covers the UI hierarchy, layout coordinator, responsive adaptations, and CSS architecture of Project Quant.

---

## 1. Modular Viewport Layout (`src/pages/trading-page/`)

The terminal layout is broken down into clean, decoupled subcomponents:

```
src/pages/trading-page/
├── TradingPage.tsx             # Coordinator assembling header, center, right, dialogs
├── TradingPageHeader.tsx       # Top brand header, symbol search, layout toggles
├── TradingMainArea.tsx         # Center container holding tool rail, chart, bottom indicators
├── TradingCenterView.tsx       # Main chart panel and bottom oscillator panel
├── TradingRightPanel.tsx       # Sidebar switching between Watchlist, OrderPanel, ObjectTree
├── TradingDialogContainer.tsx  # Mounts confirm, modify, settings, and journal modals
├── MobileTradingSection.tsx    # Responsive mobile drawer for phones and tablets
├── useTradingLayoutResize.ts   # Drag splitter height and sidebar width resizing
└── useTradingShortcuts.ts      # Global keyboard shortcuts (Alt+key, Delete, Esc)
```

---

## 2. Terminal Panels (`src/pages/trading/`)

- **Chart Toolbar (`chart-toolbar/`)**: Top horizontal bar for timeframes, chart type dropdown, indicator toggles, and price badge.
- **Drawing Tool Rail (`drawing-rail/`)**: Left vertical rail with tool groups, favorites reordering, and magnet toggle.
- **Watchlist Panel (`watchlist/`)**: Right sidebar with customizable tab bars, color flag bookmarks, search, and real-time tick flashes.
- **Order Panel (`order-panel/`)**: Order entry sidebar with side selector (Buy/Sell), order types, quantity percentages, and risk preview.
- **Bottom Panel (`bottom-panel/`)**: Bottom tray coordinating Positions table, Orders table, Trade History, Trade Journal, and Indicators tabs.
  - **Indicators Sub-Panel (`bottom-indicators/`)**: Renders active oscillator indicators (RSI, MACD, etc.) in vertically stacked panes separated by a brand-blue divider (`divide-[#2962ff]`).
  - **Single Time Axis**: The date/time scale is only shown on the bottom-most active sub-chart pane, eliminating duplicate horizontal axes.
  - **Smart Collapse**: Minimized by default if no below indicators exist; automatically expands when below indicators are active or added; displays clean instructional text when opened without active indicators.


---

## 3. CSS Architecture (`src/styles/`)

Styling is split into three focused stylesheets strictly under 300 lines:
- `global.css`: Base Tailwind imports (`@tailwind base; components; utilities;`), typography, and default focus rings.
- `theme.css`: CSS custom variables defining the complete color token system:
  - Dark Theme (`--bg-primary: #131722`, `--bg-secondary: #1e222d`, `--color-border: #2a2e39`).
  - Light Theme (`--bg-primary: #ffffff`, `--bg-secondary: #f0f3fa`, `--color-border: #e0e3eb`).
  - Financial Colors: Green bullish `#089981`, Red bearish `#f23645`.
- `components.css`: Custom component classes for scrollbar tracks, slider thumbs, backdrop blurs, and animation keyframes.

---

## 4. Responsive & Mobile Adaptations (`src/components/mobile-trading/`)

For screen widths under `768px`:
- Desktop sidebars (Order Panel, Watchlist) collapse automatically.
- `MobileTradingPanel.tsx` mounts as an interactive bottom drawer.
- Touch interactions in `src/lib/chart-plugins/drawing-tools/touch.ts` scale hit targets by $2\times$ (`TOUCH_HIT_SCALE`) for touch accuracy.
- Long-press ($500\text{ms}$) opens drawing settings without requiring double-click.

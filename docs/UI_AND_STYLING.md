# UI, Styling & Panel Layouts (`WatchlistPanel.tsx` & `ChartToolbar.tsx`)

This document details Project_Quant' user interface architecture, Tailwind CSS styling conventions, resizable panel mechanics, and watchlist design.

---

## 1. Theme & Color Palette

Project_Quant uses a TradingView-inspired dark/light theme configured via Tailwind CSS:

| Element | Dark Mode (Default) | Light Mode |
|---|---|---|
| **Canvas Background** | `#131722` | `#ffffff` |
| **Panel Background** | `#1e222d` | `#f8f9fd` |
| **Borders / Separators** | `#2a2e39` | `#e0e3eb` |
| **Bullish / Gain / Bid** | `#0ecb81` (`#089981`) | `#089981` |
| **Bearish / Loss / Ask** | `#f6465d` (`#f23645`) | `#f23645` |
| **Primary Accent / Selection**| `#2962ff` | `#2962ff` |
| **Font Family (Numbers)**| `font-mono` (monospace) | `font-mono` (monospace) |

---

## 2. Watchlist Panel Architecture (`WatchlistPanel.tsx`)

The Watchlist provides instant quotes, multi-list organization, and one-click coin switching:

### A. Row Layout Specification:
Each row follows a strict horizontal column sequence:
```
[ Drag Handle ] [ Bookmark ] [ Symbol Icon ] [ Symbol Name & Subtitle ]  [ Bid / Ask Prices ]  [ 24h % Change ]
```
- **Bid / Ask**: Displayed as stacked font-mono prices (`Bid` in green `#0ecb81`, `Ask` in red `#f6465d`).
- **% Change**: Displayed in plain green/red font-mono text without solid background badges, keeping the UI clean and consistent with the quote numbers.
- **Panel Width**: Defaulted to `320px` to prevent symbol names (`BTCUSD`, `ETHUSD`, `SOLUSD`) from truncating.

### B. Multi-Watchlist Tabs:
- Users can create multiple custom watchlists (e.g. "Crypto Majors", "DeFi", "Forex").
- Switchable via top pill tabs with horizontal scroll.
- Drag-and-drop reordering of symbols within any list.

---

## 3. Resizable Multi-Pane Layout

The terminal layout is partitioned into flexible split panes using custom mouse/touch drag handles:

```
┌─────────────────────────────────────────────────────────────┬─────────────────┐
│ ChartToolbar (Header: Symbol, Timeframe, Indicators, Quick) │                 │
├───────────────────────────────┬─────────────────────────────┤                 │
│ DrawingToolRail               │ ChartPanel                  │ WatchlistPanel  │
│ (Left Icons)                  │ (Main Canvas)               │       or        │
│                               ├─────────────────────────────┤   OrderPanel    │
│                               │ BottomIndicatorsPanel       │                 │
│                               │ (Sub-chart Oscillators)     │                 │
├───────────────────────────────┴─────────────────────────────┤                 │
│ ══ Resize Handle (h-1.5 cursor-row-resize) ═════════════════┤                 │
├─────────────────────────────────────────────────────────────┼─────────────────┤
│ BottomPanel (Tabs: Positions, Orders, Journal, Replay)      │ (Resize Handle) │
└─────────────────────────────────────────────────────────────┴─────────────────┘
```

### Drag Handle Implementation:
- **Vertical Resize Handle** (`isResizingRight`): Adjusts right sidebar width (`rightPanelWidth`), clamped between 260px and 500px.
- **Horizontal Resize Handle** (`isResizingBottom`): Adjusts bottom drawer height (`bottomPanelHeight`), clamped between 120px and 600px.
- Implemented with passive pointer capture (`onMouseDown`, `onTouchStart`) and window-level `mousemove`/`mouseup` listeners to prevent cursor loss during fast drags.

---

## 4. Video-Game Style HUD Tooltips & Overlays

1. **Indicator Rail Badges**:
   - Hovering over an indicator pill displays a video-game style HUD box positioned directly adjacent to the circle.
   - Shows indicator description, current parameters, and double-click settings shortcut.
2. **Chart Legend Header (`ChartLegendHeader`)**:
   - Anchored at `top-2 left-3` with `pointer-events-none`.
   - Displays Symbol, Timeframe, OHLCV values, Bid/Ask/Spread, and Candle countdown timer.
   - Hovering past candles dynamically updates OHLCV values in real-time.
   - Can be toggled on/off in Chart Settings (`showOhlcLegend`).

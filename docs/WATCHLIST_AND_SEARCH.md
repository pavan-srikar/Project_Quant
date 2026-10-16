# Watchlists & Symbol Search (`src/pages/trading/watchlist/` & `src/components/symbol-search/`)

This document details the symbol discovery, search query filtering, and custom watchlist persistence subsystems in Project Quant.

---

## 1. Directory Structure

```
src/
├── components/symbol-search/
│   ├── SymbolSearchModal.tsx       # Dialog coordinator with keyboard navigation
│   ├── SymbolSearchResultRow.tsx   # Result item row with 24h change & volume badge
│   ├── CategoryFilterBar.tsx       # Category tabs (All, Crypto, Forex, Indices)
│   ├── useSymbolSearchResults.ts   # Debounced search query & Binance ticker filtering
│   └── types.ts                    # Search item interfaces and query contracts
├── pages/trading/watchlist/
│   ├── WatchlistPanel.tsx          # Master watchlist sidebar coordinator
│   ├── WatchlistHeader.tsx         # Watchlist name selector and Add Symbol button
│   ├── WatchlistTabBar.tsx         # Multi-tab switcher between custom lists
│   ├── WatchlistSymbolRow.tsx      # Draggable row showing ticker, bid/ask, % change
│   ├── WatchlistBurgerMenu.tsx     # Menu for creating, renaming, deleting lists
│   ├── RibbonFlagIcon.tsx          # Color-coded ribbon bookmarking icons
│   ├── useTickerChanges.ts         # Flash green/red animation on live price changes
│   └── types.ts                    # Watchlist state types and row models
└── services/stores/
    ├── watchlistSlice.ts           # Zustand slice managing CRUD operations
    └── watchlistStorage.ts         # LocalStorage persistence adapter
```

---

## 2. Real-Time Price Update Animations (`useTickerChanges.ts`)

When incoming ticks arrive from `useTradingStore.ticks`:
- `useTickerChanges` compares the new price with previous price.
- Flashes `bg-emerald-500/20` text green on uptick or `bg-rose-500/20` text red on downtick.
- Clears the flash state after $300\text{ms}$ with smooth CSS transitions.

---

## 3. Custom Watchlist Persistence (`watchlistSlice.ts`)

Users can create multiple named watchlists (e.g., "Top Crypto", "Favorites", "DeFi"):
- Data is saved in `localStorage` under `project_quant_watchlists`.
- Symbols can be added, removed, flagged, and dragged to reorder.
- Flag colors (red, blue, green, orange, purple) allow quick filtering within any active watchlist.

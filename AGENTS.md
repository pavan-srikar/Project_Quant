# Instructions for AI Coding Agents

Before any task, read ARCHITECTURE.md and the specific feature doc in `docs/` related to the task, then open ONLY the 1-2 source files relevant to the task. Never scan the whole repo. Whenever code or structure changes, update the corresponding docs.

## Critical Speed & Direct Execution Guidelines (Prevent Long Prompt Latency)
1. **Zero Whole-Repo Scans**: NEVER run broad directory searches (`find`, `grep` across the whole codebase, or `list_dir` on parent folders).
2. **Read the Feature Doc First**: Use `docs/ARCHITECTURE.md` to identify the subsystem, then immediately read the corresponding feature doc in `docs/` to find the exact target file and line ranges:
   - Chart canvas, framing, scaling: `docs/CHART_ENGINE.md` -> `src/pages/trading/chart/`
   - Drawing tools, plugins, footprint, heatmap: `docs/DRAWINGS_AND_PLUGINS.md` -> `src/lib/chart-plugins/`
   - Indicators (RSI, MACD, etc.), Pine Script: `docs/INDICATORS.md` -> `src/lib/indicators/`, `src/lib/pinescript/`, `src/pages/trading/bottom-indicators/`
   - Orders, matching engine, positions, PnL, trade dialogs: `docs/TRADING_ENGINE.md` -> `src/services/demo/engine/`, `src/pages/trading/order-panel/`, `src/components/trading-dialogs/`
   - Market data, repository, WebSocket, Binance klines: `docs/DATA_LAYER.md` -> `src/services/market-data/`, `src/services/demo/binance/`, `src/components/market-data-bridge/`
   - UI layout, panels, mobile drawer, themes: `docs/UI_AND_STYLING.md` -> `src/pages/trading-page/`, `src/styles/`
   - Replay timeline: `docs/REPLAY_SYSTEM.md` -> `src/pages/trading/useReplay*.ts`
   - Watchlists & search: `docs/WATCHLIST_AND_SEARCH.md` -> `src/pages/trading/watchlist/`, `src/components/symbol-search/`
3. **Open ONLY the Target Files**: Open ONLY the 1-2 source files directly responsible for the bug or change.
4. **Fast, Surgical Execution**: Make minimal, direct tool calls. Diagnose from the feature doc and code, make the surgical edit, run tests/typecheck on the affected area, and finish promptly.
5. **300-Line Limit**: Every source file in `src/` must remain strictly under 300 lines.
6. **Documentation Maintenance (Strict Invariant)**:
   - **Feature Docs**: Whenever you make changes in code (logic, types, UI, parameters, or new features), ALWAYS update the corresponding feature doc in `docs/` (e.g. `docs/CHART_ENGINE.md`, `docs/TRADING_ENGINE.md`, etc.) to keep documentation strictly in sync with the codebase.
   - **Architecture Doc**: If any file structure changes or new subsystems are added/moved, update `docs/ARCHITECTURE.md`.
7. **Chart Preferences, Zoom Ratio & Viewport Invariants (Never Overwrite)**:
   - **Auto-Scale Off by Default (`chartPrefs.autoScale = false`)**: Never leave `priceScale("right").applyOptions({ autoScale: true })` enabled on indicator add/hide/remove/prune, `isNewChart`, or symbol switches. Momentary new-symbol/reset framing in `useRealtimeEffects.ts` / `chartFraming.ts` must restore `autoScale: false` when `!chartPrefs.autoScale`.
   - **No Candle Jump on Indicator Hide/Show**: Hiding or showing any indicator (`VOL`, built-in overlays, or Pine scripts including forecast polylines via `hadForecastRef`) must NEVER change `priceScale("right").autoScale`, `timeScale.rightOffset`, `setVisibleLogicalRange`, or recreate `ChartPanel` `colors`.
   - **Preserve Zoom Ratio Across Coin & Timeframe Switches**: Keep `barSpacing`, `visibleBars`, and `rightOffset` intact across symbol switches (`captureTimeScaleOnUnmount` → `resolvePreservedTimeScale` → `frameLatestCandles`, without clamping `from` to `0` for `>=100`-bar datasets) and timeframe switches (with rightmost candle timestamp anchoring).
   - **Cross-Coin Indicator Invalidation**: `SeriesState`, `timePriceMap`, and overlay `setOrAdd` must fingerprint `firstBarTime`, `firstBarClose`, and parameter keys so coin switches or parameter changes always run full `setData(...)` instead of live-tick `update(...)`.

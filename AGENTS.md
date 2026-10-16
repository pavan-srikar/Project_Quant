# Instructions for AI Coding Agents

Before any task, read ARCHITECTURE.md and the specific feature doc in `docs/` related to the task, then open ONLY the 1-2 source files relevant to the task. Never scan the whole repo. After changing structure, update ARCHITECTURE.md.

## Critical Speed & Direct Execution Guidelines (Prevent Long Prompt Latency)
1. **Zero Whole-Repo Scans**: NEVER run broad directory searches (`find`, `grep` across the whole codebase, or `list_dir` on parent folders).
2. **Read the Feature Doc First**: Use `docs/ARCHITECTURE.md` to identify the subsystem, then immediately read the corresponding feature doc in `docs/` to find the exact target file and line ranges:
   - Chart canvas, framing, scaling: `docs/CHART_ENGINE.md` -> `src/pages/trading/chart/`
   - Drawing tools, dragging, placement, snapping: `docs/DRAWINGS_AND_PLUGINS.md` -> `src/lib/chart-plugins/drawing-tools/`
   - Indicators (RSI, MACD, etc.): `docs/INDICATORS.md` -> `src/lib/indicators/`, `src/pages/trading/bottom-indicators/`
   - Orders, matching engine, positions, PnL: `docs/TRADING_ENGINE.md` -> `src/services/demo/engine/`, `src/pages/trading/order-panel/`
   - Market data, WebSocket, Binance klines: `docs/DATA_LAYER.md` -> `src/services/demo/binance/`, `src/components/market-data-bridge/`
   - UI layout, panels, mobile drawer, themes: `docs/UI_AND_STYLING.md` -> `src/pages/trading-page/`, `src/styles/`
   - Replay timeline: `docs/REPLAY_SYSTEM.md` -> `src/pages/trading/useReplay*.ts`
   - Watchlists & search: `docs/WATCHLIST_AND_SEARCH.md` -> `src/pages/trading/watchlist/`, `src/components/symbol-search/`
3. **Open ONLY the Target Files**: Open ONLY the 1-2 source files directly responsible for the bug or change.
4. **Fast, Surgical Execution**: Make minimal, direct tool calls. Diagnose from the feature doc and code, make the surgical edit, run tests/typecheck on the affected area, and finish promptly.
5. **300-Line Limit**: Every source file in `src/` must remain strictly under 300 lines.
6. **Architecture Maintenance**: If any file structure changes, update `docs/ARCHITECTURE.md`.

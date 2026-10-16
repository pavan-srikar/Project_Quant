---
trigger: always_on
---

# Project Quant Agent Rules

Before any task, read ARCHITECTURE.md and the specific feature doc in `docs/` related to the task, then open ONLY the 1-2 source files relevant to the task. Never scan the whole repo. After changing structure, update ARCHITECTURE.md.

## Speed Directives
- **Zero Whole-Repo Scans**: Never run `find` or `grep` across the whole codebase.
- **Consult Feature Docs**: Consult the dedicated doc in `docs/` (`CHART_ENGINE.md`, `DRAWINGS_AND_PLUGINS.md`, `INDICATORS.md`, `TRADING_ENGINE.md`, `DATA_LAYER.md`, `UI_AND_STYLING.md`, `REPLAY_SYSTEM.md`, `WATCHLIST_AND_SEARCH.md`) to get the exact file and lines immediately.
- **Surgical Changes**: Open only the target file, perform the change, run verification, and respond without excess iterations.

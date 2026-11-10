# Project Quant — Engineering Conventions & Runbook

This document defines the official engineering standards, architecture boundaries, file naming rules, and operational runbook for Project Quant.

---

## 1. Technology Stack

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Framework** | React | 19.x | UI component hierarchy, concurrent features, and hooks |
| **Language** | TypeScript | 5.x (Strict) | Strict static typing across all modules |
| **Build Tool** | Vite | 6.x | Fast ESM dev server and optimized Rollup production bundler |
| **Styling** | Tailwind CSS | 3.x | Utility-first CSS with custom CSS variables for dark/light themes |
| **Charts** | Lightweight Charts | 4.2.0 | Canvas-based high-performance financial charting engine |
| **Canvas Utilities** | Fancy Canvas | 2.1.0 | Device pixel ratio scaling for custom chart primitives |
| **Client State** | Zustand | 5.x | High-frequency in-memory state (ticks, active candle, replay) |
| **Server Cache** | TanStack Query | 5.x | Asynchronous data fetching, deduplication, and caching |
| **Icons** | Lucide React | Latest | Consistent UI iconography |
| **Validation** | Zod | 3.x | Runtime schema validation for API payloads and settings |
| **Testing** | Vitest | 2.x | Fast unit and component test runner with jsdom support |

---

## 2. Naming Conventions

### File & Directory Naming
- **React Components**: `PascalCase.tsx` (e.g., `ChartPanel.tsx`, `OrderPanel.tsx`, `WatchlistSymbolRow.tsx`).
- **React Hooks**: `camelCase.ts` starting with `use` (e.g., `useChartLifecycle.ts`, `useTradingStore.ts`).
- **Pure Modules & Utilities**: `camelCase.ts` or `kebab-case.ts` (e.g., `indicators.ts`, `livePnl.ts`, `drag-controller.ts`, `canvas-utils.ts`).
- **Feature Directories**: `kebab-case/` (e.g., `bottom-indicators/`, `drawing-overlay/`, `order-panel/`, `market-data-bridge/`).
- **Test Files**: `*.test.ts` or `*.test.tsx` located inside `src/__tests__/`.

### Code & Symbol Naming
- **Interfaces & Types**: `PascalCase` (e.g., `DrawingLine`, `Candle`, `Order`, `DragState`).
- **Enums & Const Arrays**: `UPPER_SNAKE_CASE` or `PascalCase` (e.g., `TIMEFRAME_LIST`, `TF_INTERVAL_MS`).
- **Component Props**: `[ComponentName]Props` (e.g., `BottomPanelProps`, `ChartToolbarProps`).
- **State Selectors**: Atomic arrow functions selecting specific keys (e.g., `useTradingStore((s) => s.ticks[symbol])`).

---

## 3. Code Separation: Where Code Lives

### Where UI Code Lives
All visual JSX elements, styling classes, and user-facing dialogs belong in:
- `src/components/`: Reusable, generic UI components (modals, search bars, inputs, error boundaries).
  - Example: `src/components/symbol-search/`, `src/components/indicator-settings/`.
- `src/pages/`: Terminal layout viewports, sidebars, toolbars, and specific feature panels.
  - Example: `src/pages/trading-page/`, `src/pages/trading/chart/`, `src/pages/trading/order-panel/`.
- **Constraint**: Components must remain presentation-focused. Complex calculations or state mutations must be delegated to hooks or service modules.

### Where Business Logic Lives
- **Financial & Technical Math**: `src/lib/indicators/` (pure functions with zero DOM dependencies).
- **Position Sizing & Mark-to-Market PnL**: `src/lib/livePnl.ts` and `src/services/demo/engine/positions.ts`.
- **Matching Engine & Margin Checks**: `src/services/demo/engine/` (`orders.ts`, `accounting.ts`).
- **Drawing Tool Geometry & Hit Testing**: `src/lib/chart-plugins/drawing-tools/` (`geometry.ts`, `hit-test/`, `snapping.ts`).
- **Data Fetching, Repository & Normalization**: `src/services/market-data/`, `src/services/demo/binance/` and `src/services/queries/`.
- **State Mutations**: `src/services/stores/` (Zustand action setters).

### The 300-Line Rule
- **Every single source file in `src/` must remain strictly under 300 lines.**
- If adding code causes a file to approach 300 lines, extract single-responsibility helpers, hooks, or subcomponents into a dedicated subdirectory.
- Always provide a facade barrel file if moving or splitting public components to guarantee backward compatibility.

### Documentation Synchronization (Strict Invariant)
- **Feature Docs**: Whenever you make changes in code (logic, types, UI, parameters, or new features), ALWAYS update the corresponding feature doc in `docs/` (e.g. `docs/CHART_ENGINE.md`, `docs/TRADING_ENGINE.md`, etc.) to keep documentation strictly in sync with the codebase.
- **Architecture Doc**: If any file structure changes or a subsystem is decomposed, update `docs/ARCHITECTURE.md`.

---

## 4. How to Run, Test, and Build Each Part

### Prerequisites
- Node.js: `>= 18.0.0`
- Package Manager: `npm`

### Commands Runbook

#### 1. Development Mode
Starts the Vite development server with Hot Module Replacement (HMR):
```bash
npm run dev
```
- Local URL: `http://localhost:5173/`
- Network URL: Displayed in the terminal console.

#### 2. Running Unit Tests
Executes the Vitest test runner across mathematical indicators, engine logic, and UI components:
```bash
# Run all tests once
npm test

# Run tests in watch mode during development
npm run test:watch
```

#### 3. TypeScript Type Checking
Validates static types across all source files without emitting files:
```bash
npm run typecheck
```
- Must complete with **0 errors**. Always run before committing code.

#### 4. Linting
Runs ESLint with React and TypeScript rules:
```bash
npm run lint
```
- Verifies code style, unused variables, and hooks dependencies.

#### 5. Production Build & Preview
Bundles and minifies the application into the `dist/` directory:
```bash
# Compile production build
npm run build

# Preview production build locally
npm run preview
```
- Verifies that tree-shaking, code-splitting, and asset bundling succeed cleanly.

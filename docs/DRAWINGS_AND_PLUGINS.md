# Drawing Tools & Custom Chart Plugins (`src/lib/chart-plugins/`)

This document details the architecture, math, rendering pipelines, and interaction models for all drawing tools and custom Lightweight Charts primitives in Project Quant.

---

## 1. Directory Structure

```
src/lib/chart-plugins/
├── drawing-tools/                  # Interactive vector drawing tools subsystem
│   ├── manager.ts                  # DrawingToolsManager coordinator (<290 lines)
│   ├── pointer-manager.ts          # Mouse and touch event listener coordinator
│   ├── placement-controller.ts     # Multi-click and press-drag placement state machine
│   ├── drag-session.ts             # Active drag interaction session lifecycle
│   ├── drag-controller.ts          # Math shifting single points, channels, and groups
│   ├── selection-manager.ts        # Selection and hover state management
│   ├── keyboard-manager.ts         # Keyboard shortcuts, clipboard, and nudging
│   ├── clipboard-nudge.ts          # Copy/paste cloning and arrow key nudging math
│   ├── cursor.ts                   # Hit-region CSS cursor resolver
│   ├── snapping.ts                 # Shift 45° angle snapping and OHLC magnet snapping
│   ├── touch.ts                    # Touch event adapters and LongPressTracker
│   ├── drawings-primitive.ts       # ISeriesPrimitive mounting canvas to chart series
│   ├── factories.ts                # Drawing object factory generating IDs and styles
│   ├── geometry.ts                 # Vector math: Euclidean distance and segment projection
│   ├── magnet.ts                   # OHLC price snap and nearby anchor snap
│   ├── shortcuts.ts                # Alt+key tool shortcuts and arrow nudge deltas
│   ├── types.ts                    # TypeScript types for drawings, anchors, and hits
│   ├── coords.ts                   # Coordinate conversion context (ResolveCtx)
│   ├── resolve.ts                  # Barrel facade re-exporting coordinate resolvers
│   ├── resolve-entry.ts            # Resolves data anchors to canvas coordinates
│   ├── resolve-fibonacci.ts        # Resolves multi-tier Fibonacci levels
│   ├── resolve-trendline.ts        # Resolves start/end endpoints and midpoint labels
│   ├── resolve-volume-profile.ts   # Computes volume profile histogram bins
│   ├── line-alerts.ts              # Price cross alert engine
│   ├── hit-test/                   # Geometric collision detection
│   │   ├── body-tests.ts           # Box, channel, and position body hit detection
│   │   ├── distance-tests.ts       # Point-to-segment distance calculations
│   │   └── point-tests.ts          # Anchor point resize handle hit detection
│   └── renderers/                  # Canvas2D rendering routines
│       ├── canvas-utils.ts         # High-DPI canvas scaling, handles, dashes
│       ├── channel-renderer.ts     # Parallel channel boundary and midline renderer
│       ├── fib-renderer.ts         # Fibonacci levels and colored zones renderer
│       ├── line-renderer.ts        # Trendlines, horizontal rays, and arrows renderer
│       ├── position-renderer.ts    # Long/short position risk/reward boxes renderer
│       ├── position-tracker-renderer.ts # Live position PnL badge and trailing target tag
│       ├── shape-renderer.ts       # Rectangles, circles, and shaded zones renderer
│       ├── text-renderer.ts        # Text callout annotations renderer
│       └── volume-profile-renderer.ts # Horizontal volume profile histogram renderer
├── footprint/                      # Order Flow Volume Footprint Subsystem
│   ├── footprint-primitive.ts      # Custom ISeriesPrimitive attaching footprint ladder
│   ├── footprint-renderer.ts       # Canvas2D rasterizer: Bid × Ask ladders, POC, delta cards
│   ├── footprint-generator.ts      # Generates volume clusters conserving bar delta
│   └── footprint-types.ts          # Types for footprint price levels and summary stats
├── heatmap/                        # Liquidation Heatmap Subsystem
│   ├── heatmap-primitive.ts        # Custom ISeriesPrimitive rendering heatmap behind candles
│   ├── heatmap-renderer.ts         # Viridis colormap rasterizer, diffuse glow & color scale
│   ├── heatmap-generator.ts        # Computes leverage tiers (10x-100x) & price sweep cutoffs
│   └── heatmap-types.ts            # Types for leverage tiers and liquidation pool bands
├── bands-indicator/                # Bollinger Bands Shaded Area Subsystem
│   └── bands-indicator.ts          # Primitive & Canvas2D renderer drawing filled band zones
├── pine-primitive/                 # Pine Script Drawing & Vector Primitive Subsystem
│   ├── index.ts                    # Barrel export
│   ├── pine-renderer-primitive.ts  # ISeriesPrimitive mounting background & foreground Pine renderers
│   └── pine-coord-resolver.ts      # Dual time & bar-index coordinate resolver with forward extrapolation
├── session-breaks/                 # Market Session Separators
│   └── session-breaks.ts           # Dotted vertical lines marking Asian, London, and NY opens
├── delta-tooltip/                  # Multi-Touch Candlestick Inspector
│   ├── delta-tooltip.ts            # Primitive coordinator and event listener
│   ├── delta-tooltip-pane.ts       # Floating inspection card renderer
│   ├── tooltip-layout.ts           # Coordinate clamping and boundary placement
│   ├── multi-touch-chart-events.ts # Touch event gestures for mobile inspection
│   └── crosshair-line-pane.ts      # Vertical & horizontal inspection guidelines
└── plugin-base.ts                  # Abstract base primitive class
```

---

## 2. Drawing Tools Subsystem

### A. Coordinate Resolution (`coords.ts` & `resolve-*.ts`)
Lightweight Charts operates in data coordinates (Time in integer seconds, Price as float). Canvas rendering operates in physical device pixels (`X`, `Y`).

- **Conversion Context (`ResolveCtx`)**:
  ```ts
  export interface ResolveCtx {
    chart: IChartApi;
    series: AnySeries;
    intervalSec: number;
    data: readonly { time: Time }[];
    candles?: readonly ResolveCandle[];
  }
  ```
- **Forward Projection (Data -> Pixels)**:
  - `timeToX(ctx, time)`: Projects timestamp to X pixel coordinate with bar-interval logical interpolation when anchors fall between bars or in future whitespace.
  - `series.priceToCoordinate(price)`: Projects price to Y pixel coordinate.
- **Inverse Projection (Pixels -> Data)**:
  - `xToTime(ctx, x)`: Maps cursor X to nearest time, snapping via logical index fallback when direct mapping returns null, and extrapolating future/past bars outside data.
  - `series.coordinateToPrice(y)`: Maps cursor Y to price float.
  - `pointer-manager.posFromClient`: Computes chart pane relative coordinates, falling back to canvas element dimensions when `timeScale.width()` collapses to 0.

### B. Placement & Editing State Machine
```
Idle State
    │
    ▼ (User clicks tool icon on DrawingToolRail)
Tool Armed: manager.setTool("trendline")
    │
    ▼ (User clicks or presses on canvas: pointer-manager -> placement-controller)
Anchor 1 Committed ──► Live Preview Mode
    │
    ├── Mode A (Click-Move-Click): User moves mouse, clicks second point
    │
    └── Mode B (Press-Drag-Release): User drags >10px and releases mouse
    │
    ▼ (placement-controller.commit())
Drawing Persisted ──► Broadcast to onAdd callback ──► Save in useChartDrawings
```

### C. Interaction Mechanics
- **Anchor Drag**: Grab any endpoint handle to resize the drawing with live angle snapping (`Shift` for 45°) or OHLC magnet snapping.
- **Body Drag**: Drag the body of any drawing to shift all anchors together in time and price.
- **Group Drag**: Multi-select drawings (`Shift + Click`) and drag any selected body to translate the entire selection.
- **Arrow Nudging**: `Arrow keys` nudge selection by 1px (or 10px with `Shift`).
- **Clipboard**: `Ctrl/Cmd + C` to copy, `Ctrl/Cmd + V` to paste shifted by 3 bars, `Ctrl/Cmd + D` to duplicate.
- **Settings Dialog**: Double-click or long-press on touch opens `DrawingSettingsDialog.tsx`.

### D. Position Drawing Tool (Long / Short Risk/Reward)
- **4-Handle Layout**:
  - `xa, yTarget`: Top/bottom target handle adjusting target price.
  - `xa, yStop`: Bottom/top stop handle adjusting stop price.
  - `xa, y1`: Middle entry handle controlling 2D movement (moves both date `time` in X and entry price in Y).
  - `xb, y1`: Right width handle controlling position duration (`time2`).
- **Badges & Bounds**:
  - Target badge placed outside target zone; Stop badge placed outside stop zone.
  - Center badge displays risk/reward ratio and real-time/closed PnL. Badges render only when hovered or selected, using solid `#3179f5` / `#ec407a` pills with crisp `#131722` text (and a `1.5px` white border on the center badge).
  - Risk/reward zones render as borderless flat translucent fills (`0.20` opacity) with a clean `1px` entry separator line, flat rectangular progress fill bounded to `[xEntry, xTrack] × [yEntry, yCurr]`, and a TradingView-style `1px` `[4, 4]` dashed lavender (`#9884e8`) trajectory line ending in a `6px` `30°` open-chevron arrowhead with zero glow halos or endpoint dots.
  - Hit detection is restricted to the inner bounds of the position rectangle (`xa` to `xb`, `top` to `bottom`).

### E. Rectangle Drawing Defaults & Settings Controls (`factories.ts`, `SettingControls.tsx`, `DrawingSettingsDialog.tsx`, `DrawingFloatingToolbar.tsx`)
- **Borderless by Default**: New rectangle drawings instantiate with `width: 0`.
- **Uniform Fill**: Rendered with uniform background color fill (`fillColor ?? color`) at opacity (`fillOpacity ?? RECT_FILL_ALPHA`).
- **Stroke Bypass**: When `borderWidth === 0`, `ctx.strokeRect` is bypassed entirely, drawing a clean uniform rectangle with zero border lines. Strokewidth is only applied if explicitly configured $> 0$ in drawing settings.
- **Width Value Box (`WidthValueBox`)**: The fixed 4-dash width selector (`[ —  —  —  ▬ ]`) is replaced by an exact numeric value box with stepper controls for rectangles in both `DrawingSettingsDialog` and `DrawingFloatingToolbar`. It defaults to `0 px` (borderless) and can be incremented to `1 px`, `2 px`, ..., `5 px`, etc., with custom up/down steppers and direct numeric input. Other line tools continue using standard `WidthButtons`.

### F. Measuring Tool & Trendline Stats (`resolve-trendline.ts` & `line-renderers.ts`)
- **Replaced Angle with Time Duration**: The third line in the floating stats box (`drawStatsBox`) now displays elapsed calendar time in `days:hours:min` format via `formatDuration(dtSec)` instead of screen-pixel angle degrees (`${angleDeg}°`).
- **Readable Duration Formats**:
  - Days + Hours + Minutes (e.g., `2d 5h 30m`, `1d 0h 0m`).
  - Hours + Minutes when $< 24$ hours (e.g., `4h 30m`).
  - Minutes when $< 60$ minutes (e.g., `15m`).
- **Full Measurement Card**:
  - Line 1: Price Delta and Percentage (e.g., `+1,250.00 (+5.20%)`).
  - Line 2: Bar count (e.g., `48 bars`).
  - Line 3: Elapsed Time Duration (e.g., `2d 0h 0m`).

### G. Fixed Range Volume Profile (`resolve-volume-profile.ts`, `volume-profile-renderer.ts`, `drawingToolMeta.ts`)
- **TradingView-Aligned Vector Icon**: The tool metadata is registered with a custom `VolumeProfileIcon` matching TradingView's dual-anchor fixed-range iconography:
  - Left vertical boundary with bottom circular anchor handle and stepped horizontal volume profile histogram bars.
  - Right vertical boundary with top circular anchor handle.
- **Histogram & Value Area**: Resolves volume distribution across price buckets bounded between start time (`time`) and end time (`time2`), highlighting Point of Control (POC) and Value Area (VA).

---

## 3. Order Flow Volume Footprint Subsystem (`footprint/`)

The footprint plugin attaches directly to the primary candlestick series, rendering institutional Bid × Ask volume profile clusters inside each bar:

1. **Volume Profile Generator (`footprint-generator.ts`)**:
   - Takes OHLCV and bar delta, generates discrete price ladders at configured tick sizes (e.g. 10 or 25 USD for BTC).
   - Preserves exact bar buy/sell volume and delta invariants. Identifies Point of Control (POC) level with maximum traded volume.
2. **Canvas2D Rasterizer (`footprint-renderer.ts`)**:
   - Renders split Bid × Ask ladder columns per candle:
     - Left column: Bid volume (selling aggression, red tint).
     - Right column: Ask volume (buying aggression, green tint).
   - Outlines Point of Control (POC) with high-contrast border.
   - Computes imbalance badges (e.g., Ask volume $> 3\times$ Bid volume at diagonal price level).
   - Renders bottom summary card: Bar Delta, Cumulative Volume Delta (CVD), and Total Volume.
3. **Primitive Attachment (`useFootprintAttachment.ts`)**:
   - Reduces main candle body opacity (`upColor: rgba(..., 0.15)`) when Footprint mode is active so clusters remain legible.

---

## 4. Liquidation Heatmap Subsystem (`heatmap/`)

The liquidation heatmap primitive attaches behind candles (`zOrder: "bottom"`), modeling where leveraged market participants face liquidation:

1. **Leverage Tier Simulator (`heatmap-generator.ts`)**:
   - Models standard retail and institutional leverage tiers: $10\times, 25\times, 50\times, 100\times$.
   - Estimates liquidation thresholds from open interest, bar delta, and volume.
   - Simulates price sweep cutoffs: once candle highs/lows breach a liquidation band, that pool is marked liquidated and its intensity drops.
2. **Canvas2D Viridis Rasterizer (`heatmap-renderer.ts`)**:
   - Uses perceptually uniform Viridis colormap (purple -> teal -> yellow) to represent pool density.
   - Implements diffuse horizontal blur and glow for visual depth.
   - Renders vertical intensity color scale on the price axis.
3. **Settings Integration (`HeatmapSettingsTab.tsx`)**:
   - Configurable brightness boost, band height multiplier, floor opacity, and colormap selection.

---

## 5. Other Custom Primitives

### A. Shaded Bollinger Bands (`bands-indicator/`)
- Custom primitive rendering a semi-transparent colored fill between Bollinger upper and lower bands.
- Redraws dynamically during time-scale scrolling and auto-scale events.

### B. Market Session Breaks (`session-breaks/`)
- Renders vertical dashed lines on the chart canvas corresponding to market open times:
  - Asian Session: 00:00 UTC
  - London Session: 08:00 UTC
  - New York Session: 13:30 UTC

### C. Delta Tooltip Inspector (`delta-tooltip/`)
- Multi-touch and cursor hover inspector displaying high-precision candle metrics:
  - Exact Open, High, Low, Close, Volume.
  - Taker Buy Volume vs Taker Sell Volume.
  - Net Delta and Delta % of candle volume.
  - Clamps to chart edges to prevent clipping.

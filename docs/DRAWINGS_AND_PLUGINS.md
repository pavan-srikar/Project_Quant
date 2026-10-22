# Drawing Tools & Custom Chart Plugins (`src/lib/chart-plugins/`)

This document details the architecture and implementation of Project Quant' drawing tools and custom Lightweight Charts plugin system.

---

## 1. Directory Structure

```
src/lib/chart-plugins/drawing-tools/
├── manager.ts                  # DrawingToolsManager coordinator (<290 lines)
├── pointer-manager.ts          # Mouse and touch event listener coordinator
├── placement-controller.ts     # Multi-click and press-drag placement state machine
├── drag-session.ts             # Active drag interaction session
├── drag-controller.ts          # Math shifting single points, channels, and groups
├── selection-manager.ts        # Selection and hover state management
├── keyboard-manager.ts         # Keyboard shortcuts, clipboard, and nudging
├── clipboard-nudge.ts          # Copy/paste cloning and arrow key nudging math
├── cursor.ts                   # Hit-region CSS cursor resolver
├── snapping.ts                 # Shift 45° angle snapping and OHLC magnet snapping
├── touch.ts                    # Touch event adapters and LongPressTracker
├── drawings-primitive.ts       # ISeriesPrimitive mounting canvas to chart series
├── factories.ts                # Drawing object factory generating IDs and styles
├── geometry.ts                 # Vector math: Euclidean distance and segment projection
├── magnet.ts                   # OHLC price snap and nearby anchor snap
├── shortcuts.ts                # Alt+key tool shortcuts and arrow nudge deltas
├── types.ts                    # TypeScript types for drawings, anchors, and hits
├── coords.ts                   # Coordinate conversion context (ResolveCtx)
├── resolve.ts                  # Barrel facade re-exporting coordinate resolvers
├── resolve-entry.ts            # Resolves data anchors to canvas coordinates
├── resolve-fibonacci.ts        # Resolves multi-tier Fibonacci levels
├── resolve-trendline.ts        # Resolves start/end endpoints and midpoint labels
├── resolve-volume-profile.ts   # Computes volume profile histogram bins
├── line-alerts.ts              # Price cross alert engine
├── hit-test/                   # Geometric collision detection
│   ├── body-tests.ts           # Box, channel, and position body hit detection
│   ├── distance-tests.ts       # Point-to-segment distance calculations
│   └── point-tests.ts          # Anchor point resize handle hit detection
└── renderers/                  # Canvas2D rendering routines
    ├── canvas-utils.ts         # High-DPI canvas scaling, handles, dashes
    ├── channel-renderer.ts     # Parallel channel boundary and midline renderer
    ├── fib-renderer.ts         # Fibonacci levels and colored zones renderer
    ├── line-renderer.ts        # Trendlines, horizontal rays, and arrows renderer
    ├── position-renderer.ts    # Long/short position risk/reward boxes renderer
    ├── position-tracker-renderer.ts # Live position PnL badge and trailing target tag
    ├── shape-renderer.ts       # Rectangles, circles, and shaded zones renderer
    ├── text-renderer.ts        # Text callout annotations renderer
    └── volume-profile-renderer.ts # Horizontal volume profile histogram renderer
```

---

## 2. Coordinate Resolution (`coords.ts` & `resolve-*.ts`)

Lightweight Charts operates in data coordinates (Time in integer seconds, Price as float). Canvas rendering operates in physical device pixels (`X`, `Y`).

### The Conversion Context (`ResolveCtx`):
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
  - `timeToX(ctx, time)`: Projects timestamp to X pixel coordinate. Falls back to bar-interval logical interpolation when anchors fall between bars or in future whitespace.
  - `series.priceToCoordinate(price)`: Projects price to Y pixel coordinate.
- **Inverse Projection (Pixels -> Data)**:
  - `xToTime(ctx, x)`: Maps cursor X to nearest time, snapping to bars via logical index fallback when direct mapping returns null, and extrapolating future/past bars if cursor is outside data.
  - `series.coordinateToPrice(y)`: Maps cursor Y to price float.
  - `pointer-manager.posFromClient`: Computes chart pane relative coordinates, falling back to canvas element dimensions when `timeScale.width()` collapses to 0 (e.g. during bottom indicator pane activation).

---

## 3. Placement & Editing State Machine

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

### Editing Interactions:
- **Anchor Drag**: Grab any endpoint handle to resize the drawing with live angle snapping (`Shift` for 45°) or OHLC magnet snapping. Position tools feature TradingView-aligned 4-handle control (Target Y, Stop Y, Middle Entry 2D X/Y, and Right Width X).
- **Body Drag**: Drag the body of any drawing to shift all anchors together in time and price.
- **Group Drag**: Multi-select drawings (`Shift + Click`) and drag any selected body to translate the entire selection.
- **Arrow Nudging**: `Arrow keys` nudge selection by 1px (or 10px with `Shift`).
- **Clipboard**: `Ctrl/Cmd + C` to copy, `Ctrl/Cmd + V` to paste shifted by 3 bars, `Ctrl/Cmd + D` to duplicate.
- **Settings Dialog**: Double-click or long-press on touch to open `DrawingSettingsDialog.tsx`.

### Position Drawing Tool (Long / Short Tool):
- **4-Handle Layout**:
  - `xa, yTarget`: Top/bottom target handle adjusting target price.
  - `xa, yStop`: Bottom/top stop handle adjusting stop price.
  - `xa, y1`: Middle entry handle controlling 2D movement (moves both date `time` in X and entry price in Y).
  - `xb, y1`: Right width handle controlling position duration (`time2`).
- **Badges & Visual Placement**:
  - Target badge placed outside target zone; Stop badge placed outside stop zone.
  - Badges use fixed coordinate bounds and are hidden when scrolled off-screen, preventing edge-clutter.
  - Center badge displays risk/reward ratio and real-time/closed PnL (`Closed: price [+x%]`).
  - Badges render only when hovered or selected.
- **Default Styling & Color Overrides**:
  - Default target color: `#3179f5` (blue); default stop color: `#ec407a` (red).
  - Target, stop, and middle separator colors are individually customizable in `DrawingSettingsDialog.tsx`.
- **Hit Testing**:
  - Hit-test detection is restricted strictly to the inner bounds of the position zone rectangle (`xa` to `xb`, `top` to `bottom`).
  - External badges do not capture clicks or hovers, preventing unintentional tool selection during chart navigation.


---

## 4. Custom Primitives (`DrawingsPrimitive`, `BandsPrimitive`)

Lightweight Charts v4.2 supports `ISeriesPrimitive<Time>`:
1. `series.attachPrimitive(primitive)`: Registers the primitive with the series.
2. `updateAllViews()`: Signals the chart that data or coordinates have changed.
3. `autoscaleInfo()`: Provides bounding boxes so drawing price ranges are included in auto-scale margins if desired.
4. `paneViews()`: Returns canvas renderers executed on every frame of the chart draw loop.

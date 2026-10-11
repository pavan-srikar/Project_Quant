# Drawing Tools & Custom Chart Plugins

This document details the drawing tools architecture and custom Lightweight Charts plugin system implemented in `src/lib/chart-plugins/`.

---

## 1. Drawing Tools Architecture

The drawing subsystem allows traders to draw geometric lines, shapes, and annotations on top of the Lightweight Charts canvas with persistence, magnet snapping, hit-testing, and line-cross alerts.

### Directory Structure (`src/lib/chart-plugins/drawing-tools/`):
```
drawing-tools/
├── drawings-primitive.ts   # Custom ISeriesPrimitive for Lightweight Charts
├── geometry.ts             # Mathematical vector math & line intersections
├── hit-test.ts             # Cursor collision detection (distance to line/polygon)
├── line-alerts.ts          # Line-cross price alert engine
├── manager.ts              # DrawingToolsManager: lifecycle, state, drag-drop
├── renderers.ts            # Canvas2D rendering routines for lines, shapes, text
└── resolve.ts              # Coordinate projection (Time/Price <-> Canvas X/Y)
```

---

## 2. Coordinate Resolution (`resolve.ts`)

Lightweight Charts operates in data coordinates (Time in seconds, Price as float). The HTML5 canvas operates in physical device pixels (X, Y).

Because time scales scroll and price scales zoom dynamically:
- Drawings **must store data coordinates** (`time: number`, `price: number`), never raw pixel coordinates.
- On every render tick, `resolve.ts` projects data points into canvas pixels:
  ```ts
  const x = timeScale.timeToCoordinate(point.time);
  const y = series.priceToCoordinate(point.price);
  ```
- Conversely, when a user clicks the chart, pixel coordinates are converted back to data coordinates:
  ```ts
  const time = timeScale.coordinateToTime(x);
  const price = series.coordinateToPrice(y);
  ```

---

## 3. Supported Drawing Tools

| Tool | Type | Anchor Points | Visual Features |
|---|---|---|---|
| **Trendline** | Line | 2 points | Customizable color, width, dashed/solid, ray extension. |
| **Horizontal Line** | Line | 1 point (Price) | Spans full chart width; shows price badge on right axis. |
| **Horizontal Ray** | Ray | 2 points | Anchors at start bar and extends infinitely to the right. |
| **Parallel Channel**| Channel | 3 points | 2 parallel lines with center midline and semi-transparent fill. |
| **Fibonacci Retracement** | Fib | 2 points | Standard levels (0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0) with colored zones. |
| **Rectangle** | Box | 2 points (Corners)| Shaded support/resistance zones. |
| **Long / Short Position**| Position | 2 points (Entry, SL)| Interactive risk/reward calculator displaying R:R ratio, target profit, and loss. |
| **Text & Callouts** | Annotation | 1 point | Editable text label rendered directly onto the canvas. |

---

## 4. Hit-Testing & Interaction Lifecycle (`hit-test.ts`, `manager.ts`)

1. **Hover Detection (`hit-test.ts`)**:
   - Calculates perpendicular distance from cursor `(mouseX, mouseY)` to line segments:
     \[
     \text{dist} = \frac{|(y_2 - y_1)x_0 - (x_2 - x_1)y_0 + x_2 y_1 - y_2 x_1|}{\sqrt{(y_2 - y_1)^2 + (x_2 - x_1)^2}}
     \]
   - If distance is within 6px threshold, the drawing is marked as hovered (`cursor: pointer`).
2. **Handle Grabbing**:
   - Each drawing features circular control points at its vertices.
   - Hovering over a handle changes cursor to `move` or `crosshair`, allowing the user to resize or pivot the drawing.
3. **Selection & Editing**:
   - Clicking a drawing selects it, showing its control handles and floating context bar (color picker, line thickness, delete button).
   - Selected drawings can be deleted via the `Delete` / `Backspace` key.

---

## 5. Magnet Snapping (`magnetMode`)

Project_Quant supports three magnet modes (`useChartPreferences.ts`):
- `none`: Cursor places coordinates precisely at mouse position.
- `weak`: Snaps to the nearest candle Open, High, Low, or Close if the cursor is within 15 pixels of a candle.
- `strong`: Forces the coordinate to lock to the nearest candle extreme, regardless of distance.

---

## 6. Line-Cross Price Alerts (`line-alerts.ts`)

Traders can attach price cross alerts to user-drawn trendlines and horizontal levels:
- On every incoming live tick (`applyTick` in `ChartPanel.tsx`), the current price is compared against the line's calculated price at the current timestamp.
- If a candle wick or close pierces the line, a toast alert is fired (`toast.info("Price Alert", ...)`), and an audio alert tone is played via `useTradeSound.ts`.

---

## 7. Custom Lightweight Charts Plugins

Project_Quant extends Lightweight Charts via its custom primitive API (`ISeriesPrimitive`):
1. **`bands-indicator/`**: Renders smooth polygon fills between the upper and lower Bollinger Bands without creating visual artifacts.
2. **`session-breaks/` & `session-highlighting/`**: Color-codes market trading sessions (London, New York, Asia) directly on the chart canvas background.
3. **`delta-tooltip/`**: Provides multi-touch gesture support and inspects candle metrics on mobile touch devices.

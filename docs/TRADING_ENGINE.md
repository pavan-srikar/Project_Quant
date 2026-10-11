# Trading Engine & Order Execution

This document details the trading engine, paper trading simulation, position management, chart-based SL/TP dragging, and historical market replay system.

---

## 1. Paper-Trading Matching Engine (`src/services/demo/engine.ts`)

Project_Quant includes an in-browser execution and matching engine that functions as an autonomous paper broker.

### Account Model:
- **Default Starting Balance**: \$100,000 USD
- **Default Leverage**: 100:1
- **Margin Calculation**:
  \[
  \text{Margin} = \frac{\text{Position Size} \times \text{Entry Price}}{\text{Leverage}}
  \]
- **Free Margin**: \( \text{Equity} - \text{Margin} \)
- **Mark-to-Market Valuation**:
  On every price tick from the live feed, all open positions are re-valued against the current bid (for Longs) or ask (for Shorts).

### Order Types & Execution:
1. **Market Orders**: Filled instantaneously at the current best market price:
   - Longs execute at `tick.ask`.
   - Shorts execute at `tick.bid`.
2. **Limit Orders**: Queued in `orders[]`; triggered when market price reaches or improves upon the limit price:
   - Buy Limit: Triggers when `tick.ask <= order.price`.
   - Sell Limit: Triggers when `tick.bid >= order.price`.
3. **Stop Orders**: Queued in `orders[]`; triggers a market order once the stop price is breached.

---

## 2. Real-Time PnL Calculation (`src/lib/livePnl.ts`)

Unrealized PnL is continuously computed:
```ts
// For a Long position:
const unrealizedPnl = (currentBid - position.entryPrice) * position.quantity;

// For a Short position:
const unrealizedPnl = (position.entryPrice - currentAsk) * position.quantity;
```
Account equity updates synchronously:
\[
\text{Equity} = \text{Balance} + \sum \text{Unrealized PnL}
\]

When a position is closed (partially or fully):
- Realized PnL is credited/debited to `account.balance`.
- Margin requirement is released back to `account.freeMargin`.
- A trade fill record is appended to `fills[]`.

---

## 3. Interactive Chart Trading & SL/TP Dragging (`useSlTpDrag.ts`)

Traders can manage trades visually on the chart canvas without opening modal dialogs:

1. **Position Lines on Chart**:
   - When a position is opened, `ChartPanel.tsx` draws horizontal price lines:
     - **Entry Line**: Cyan/Blue dashed line displaying quantity and unrealized PnL.
     - **Stop Loss Line**: Red dashed line.
     - **Take Profit Line**: Green dashed line.
2. **Drag-to-Adjust Interaction (`useSlTpDrag.ts`)**:
   - Hovering over an SL or TP handle changes cursor to `ns-resize`.
   - Dragging the handle vertically updates the SL/TP price in real-time.
   - An interactive HUD pill displays the prospective loss/profit in dollars and pips while dragging.
   - Releasing the mouse commits the change via `api.modifyPosition(positionId, { stopLoss, takeProfit })`.

---

## 4. Proprietary Challenge Rules & Risk Monitoring (`useChallengeLevels.ts`)

Project_Quant supports prop-firm style evaluation metrics:
- **Max Daily Drawdown**: Tracks drawdown against the day's starting equity (resets at 00:00 UTC).
- **Max Overall Drawdown**: Hard equity stop (e.g. 10% below initial balance).
- **Profit Target**: Benchmark goal (e.g. +8% or +10%).
- Real-time warning banners appear if account equity approaches within 1% of the maximum allowable loss.

---

## 5. Market Replay Engine (`useReplayPlayback.ts`, `ReplayScrubber.tsx`)

Traders can rewind market history and practice trading past market conditions bar-by-bar:

1. **Data Slicing (`useReplayChartData.ts`)**:
   - Fetches historical 1m candles for a selected date.
   - Slices candles up to `replayCursorTimestamp`.
   - Suppresses live WebSocket updates so real-time prices cannot overwrite playback candles.
2. **Playback Loop (`useReplayPlayback.ts`)**:
   - Driven by `requestAnimationFrame` with variable speed multipliers (1x, 5x, 10x, 60x).
   - Steps cursor forward, emitting `REPLAY_EVENT` with each bar.
   - Allows placing paper trades during playback; the engine evaluates fills against historical candles!
3. **Cache Invalidation (`replayVersion`)**:
   - Each replay session increments `replayVersion`.
   - `replayVersion` is embedded into React Query keys (`queryKeys.market.candles(...)`), ensuring React Query never re-uses stale live data or structural sharing.

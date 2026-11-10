# Paper Trading, Orders & Execution Engine

This document details the in-browser paper trading engine, order entry panel, risk management calculations, and trading dialogs in Project Quant.

---

## 1. Directory Structure

```
src/
├── services/demo/engine/            # In-memory paper trading matching engine (<200 lines each)
│   ├── index.ts                     # Central barrel re-export
│   ├── state.ts                     # In-memory storage for accounts, orders, positions, trades
│   ├── orders.ts                    # Order placement, tick-matching, and cancellation logic
│   ├── positions.ts                 # Position mark-to-market PnL, partial closes, TP/SL triggers
│   └── accounting.ts                # Margin requirements, equity calculation, liquidation checks
├── pages/trading/order-panel/       # Right sidebar order entry panel (<200 lines each)
│   ├── OrderPanel.tsx               # Primary order entry coordinator
│   ├── OrderPanelHeader.tsx         # Account balance, leverage selector, close-all button
│   ├── OrderSideSelector.tsx        # Segmented Buy (Long) / Sell (Short) control
│   ├── OrderQuantityInput.tsx       # Size input with equity percentage buttons (25%, 50%, 75%, 100%)
│   ├── OrderRiskAnalysis.tsx        # Real-time required margin, fee, and risk/reward preview
│   └── types.ts                     # Order form state models and validation types
├── components/trading-dialogs/      # Confirmation, modification & journal dialogs
│   ├── OrderConfirmDialog.tsx       # Safety confirmation modal for market/leveraged orders
│   ├── OrderModifyDialog.tsx        # Edits price, quantity, TP/SL on active working orders
│   ├── TradeCalculator.tsx          # Risk sizing and target profit calculator
│   ├── position-modify/             # Position TP/SL and partial close tabs
│   │   ├── PositionModifyDialog.tsx # Modal coordinator
│   │   ├── ModifyTpSlTab.tsx        # Price and percentage input for TP and SL
│   │   ├── PartialCloseTab.tsx      # Partial quantity close with instant PnL preview
│   │   └── types.ts                 # Form data contracts
│   └── journal/                     # Trade journal log subsystem
│       ├── TradeJournalPanel.tsx    # Journal entries container and filter bar
│       ├── JournalCard.tsx          # Render card showing trade tags, notes, and metrics
│       ├── JournalEntryForm.tsx     # Add/edit entry form
│       └── types.ts                 # Journal data contracts
├── pages/trading-page/
│   └── useTradingActions.ts         # Hook bridging UI actions to engine API & dialogs
└── services/demo/bus.ts             # Pub/Sub event bus decoupling engine from UI
```

---

## 2. Order Matching Mechanics (`orders.ts`)

The paper trading engine executes entirely client-side without network latency:

1. **Market Orders**:
   - Filled immediately against active best bid/ask from the tick feed.
   - Longs execute at `Tick.Ask`; Shorts execute at `Tick.Bid`.
2. **Limit Orders**:
   - Placed into working orders queue in `state.orders`.
   - Matched when incoming tick crosses the limit price:
     - Buy Limit: `Tick.Ask <= limitPrice`.
     - Sell Limit: `Tick.Bid >= limitPrice`.
3. **Stop & Stop-Limit Orders**:
   - Matched when incoming tick touches `stopPrice`.
   - Converted to immediate market fill or placed as active limit order at specified limit price.
4. **Order Cancellation**:
   - Released immediately from `state.orders`, restoring allocated margin to free margin.

---

## 3. Position Lifecycle & Margin Accounting (`positions.ts` & `accounting.ts`)

### A. Position State
Each open position tracks:
- `id`: Unique identifier.
- `symbol`: Trading pair (e.g., `"BTCUSD"`).
- `side`: `"LONG"` or `"SHORT"`.
- `quantity`: Position size in base currency.
- `entryPrice`: Volume-weighted average entry price (VWAP on scale-in).
- `leverage`: Selected leverage multiplier ($1\times$ to $100\times$).
- `takeProfit` & `stopLoss`: Optional bracket prices.
- `unrealizedPnl`: Current mark-to-market return.

### B. Mark-to-Market PnL Formulas
Calculated in real time on every price tick via `src/lib/livePnl.ts`:
$$\text{Long PnL} = (\text{Current Bid} - \text{Entry Price}) \times \text{Quantity}$$
$$\text{Short PnL} = (\text{Entry Price} - \text{Current Ask}) \times \text{Quantity}$$

### C. Margin Accounting
- **Initial Margin Required**:
  $$\text{Initial Margin} = \frac{\text{Entry Price} \times \text{Quantity}}{\text{Leverage}}$$
- **Account Equity**:
  $$\text{Equity} = \text{Balance} + \sum \text{Unrealized PnL}$$
- **Free Margin**:
  $$\text{Free Margin} = \text{Equity} - \sum \text{Used Margin}$$
- **Margin Level %**:
  $$\text{Margin Level} = \left(\frac{\text{Equity}}{\text{Used Margin}}\right) \times 100$$

### D. Liquidation Protection
If account equity drops below maintenance margin requirement (default 50% of used margin), positions are systematically liquidated at current market price to prevent negative balance.

---

## 4. Order Entry & Risk Analysis (`src/pages/trading/order-panel/`)

1. **Quick Size Buttons**:
   - $25\%, 50\%, 75\%, 100\%$ buttons calculate max affordable contracts from current `Free Margin \times Leverage`.
2. **Risk Analysis Breakdown (`OrderRiskAnalysis.tsx`)**:
   - Margin Required: Upfront capital deducted from available balance.
   - Estimated Fee: Calculated using maker/taker fee tiers.
   - Risk/Reward Ratio: Displayed when both TP and SL are configured.
   - Liquidation Estimate: Projected price level where margin exhaustion occurs.

---

## 5. Trading Dialogs & Position Management (`src/components/trading-dialogs/`)

- **Order Confirmation (`OrderConfirmDialog.tsx`)**: Optional dialog triggered when placing large positions or trading with leverage $> 20\times$.
- **Order Modification (`OrderModifyDialog.tsx`)**: Allows moving limit prices, stop triggers, or updating brackets without canceling the order.
- **Position Modification (`PositionModifyDialog.tsx`)**:
  - `ModifyTpSlTab`: Adjust TP/SL prices by absolute price or target percentage.
  - `PartialCloseTab`: Close a fraction of the open position (e.g. 50% derisk) while leaving remaining size open.
- **Trade Calculator (`TradeCalculator.tsx`)**: Computes optimal position size based on user's target risk in dollars or percentage of equity.
- **Trade Journal (`TradeJournalPanel.tsx`)**: Attaches notes, strategies, emotional state, and screenshots to trade records for post-trade review.

---

## 6. Event Bus & Audio Integration (`src/services/demo/bus.ts`)

Decoupled event publication:
- `ORDER_FILLED`: Emitted on execution. Triggers `useTradeSound.ts` audio chime and invalidates React Query `["orders"]` and `["positions"]`.
- `POSITION_CLOSED`: Emitted on manual close or TP/SL fill. Updates trade history ledger and balance.
- `SL_TP_HIT`: Emitted when candle high/low touches bracket price.

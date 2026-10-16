# In-Browser Paper Trading Engine (`src/services/demo/engine/`)

This document details the architecture, state lifecycle, order matching rules, and margin accounting formulas implemented in Project Quant' in-memory matching engine.

---

## 1. Modular Subsystem Layout

```
src/services/demo/engine/
├── index.ts        # Central barrel re-export
├── state.ts        # In-memory storage for accounts, orders, positions, trades
├── orders.ts       # Order placement, tick-matching, and cancellation logic
├── positions.ts    # Position mark-to-market PnL, partial closes, and TP/SL triggers
└── accounting.ts   # Margin requirements, equity calculation, and liquidation
```

---

## 2. Order Matching Mechanics (`orders.ts`)

The paper trading engine operates without external network requests:
1. **Market Orders**:
   - Filled immediately against active best bid/ask from the tick feed.
   - Longs execute at `Ask`; Shorts execute at `Bid`.
2. **Limit Orders**:
   - Placed in the in-memory order book (`state.orders`).
   - Matched when incoming tick crosses the limit price:
     - Buy Limit: `Tick.Ask <= limitPrice`.
     - Sell Limit: `Tick.Bid >= limitPrice`.
3. **Stop & Stop-Limit Orders**:
   - Triggered when market price reaches `stopPrice`.
   - On trigger, converted either to market execution or placed as working limit order.

---

## 3. Position Lifecycle & Margin Accounting (`positions.ts` & `accounting.ts`)

### A. Position State
Each open position tracks:
- `id`: Unique identifier.
- `symbol`: Trading pair (e.g., `"BTCUSD"`).
- `side`: `"LONG"` or `"SHORT"`.
- `quantity`: Position size in base currency.
- `entryPrice`: Volume-weighted average entry price.
- `leverage`: Selected leverage multiplier ($1\times$ to $100\times$).
- `takeProfit` & `stopLoss`: Optional trigger prices.
- `unrealizedPnl`: Current mark-to-market return.

### B. Mark-to-Market PnL Formula
Updated on every price tick:
$$\text{Long PnL} = (\text{Current Bid} - \text{Entry Price}) \times \text{Quantity}$$
$$\text{Short PnL} = (\text{Entry Price} - \text{Current Ask}) \times \text{Quantity}$$

### C. Margin Accounting
- **Initial Margin Required**:
  $$\text{Initial Margin} = \frac{\text{Entry Price} \times \text{Quantity}}{\text{Leverage}}$$
- **Account Equity**:
  $$\text{Equity} = \text{Balance} + \sum \text{Unrealized PnL}$$
- **Free Margin**:
  $$\text{Free Margin} = \text{Equity} - \sum \text{Used Margin}$$

### D. Liquidation Protection
If account equity drops below maintenance margin requirement (default 50% of initial margin), positions are automatically liquidated at current market price to prevent negative balance.

---

## 4. Event Bus Integration (`src/services/demo/bus.ts`)

When actions take place inside the engine, decoupled events are broadcast across the terminal:
- `ORDER_FILLED`: Fired on immediate market fill or limit trigger. Notifies `useTradeSound` and invalidates React Query.
- `POSITION_CLOSED`: Fired when user closes position or TP/SL triggers. Updates trade history and balance.
- `SL_TP_HIT`: Emitted when candle high/low crosses active bracket orders.

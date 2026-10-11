import { describe, it, expect, beforeEach } from "vitest";
import * as engine from "../services/demo/engine.ts";

describe("Paper Trading Matching Engine", () => {
  beforeEach(() => {
    // Reset positions and orders
    engine.closeAllPositions();
    for (const ord of engine.getOrders()) {
      engine.cancelOrder(ord.id);
    }
  });

  it("initializes account with default balance and equity", () => {
    const acc = engine.getAccount();
    expect(acc.balance).toBeGreaterThan(0);
    expect(acc.equity).toBe(acc.balance);
    expect(acc.status).toBe("ACTIVE");
  });

  it("places market order and opens position", () => {
    const initialPositions = engine.getPositions().length;
    const order = engine.placeOrder({
      accountId: engine.getAccount().id,
      symbol: "BTCUSD",
      side: "BUY",
      type: "MARKET",
      quantity: 1.5,
      price: 60000,
      takeProfit: 65000,
      stopLoss: 55000,
    });

    expect(order.status).toBe("FILLED");
    expect(order.symbolName).toBe("BTCUSD");
    expect(order.quantity).toBe(1.5);

    const positions = engine.getPositions();
    expect(positions.length).toBe(initialPositions + 1);

    const pos = positions.find((p) => p.symbolName === "BTCUSD");
    expect(pos).toBeDefined();
    expect(pos!.side).toBe("LONG");
    expect(pos!.quantity).toBe(1.5);
    expect(pos!.takeProfit).toBe(65000);
    expect(pos!.stopLoss).toBe(55000);
    expect(pos!.margin).toBeGreaterThan(0);
  });

  it("modifies an existing order", () => {
    const order = engine.placeOrder({
      accountId: engine.getAccount().id,
      symbol: "ETHUSD",
      side: "BUY",
      type: "LIMIT",
      quantity: 10,
      price: 3000,
    });

    const modified = engine.modifyOrder(order.id, {
      price: 2950,
      quantity: 15,
      takeProfit: 3500,
      stopLoss: 2800,
    });

    expect(modified).toBeDefined();
    expect(modified!.price).toBe(2950);
    expect(modified!.quantity).toBe(15);
    expect(modified!.takeProfit).toBe(3500);
    expect(modified!.stopLoss).toBe(2800);
  });

  it("modifies SL and TP on an open position", () => {
    engine.placeOrder({
      accountId: engine.getAccount().id,
      symbol: "SOLUSD",
      side: "BUY",
      type: "MARKET",
      quantity: 50,
      price: 150,
    });

    const pos = engine.getPositions().find((p) => p.symbolName === "SOLUSD")!;
    const updated = engine.modifyPosition(pos.id, {
      takeProfit: 180,
      stopLoss: 140,
    });

    expect(updated).toBeDefined();
    expect(updated!.takeProfit).toBe(180);
    expect(updated!.stopLoss).toBe(140);
  });

  it("closes position and updates balance with realized PnL", () => {
    const startBalance = engine.getAccount().balance;
    engine.placeOrder({
      accountId: engine.getAccount().id,
      symbol: "SOLUSD",
      side: "BUY",
      type: "MARKET",
      quantity: 10,
      price: 100,
    });

    const pos = engine.getPositions().find((p) => p.symbolName === "SOLUSD")!;
    // Simulate price gain to 120
    engine.mark("SOLUSD", 120);

    const closeResult = engine.closePosition(pos.id);
    expect(closeResult.success).toBe(true);

    const remaining = engine.getPositions().filter((p) => p.symbolName === "SOLUSD");
    expect(remaining.length).toBe(0);

    // Balance should have increased by (120 - 100) * 10 = +$200
    const newBalance = engine.getAccount().balance;
    expect(newBalance).toBeCloseTo(startBalance + 200, 2);

    const closed = engine.getClosedPositions();
    expect(closed.length).toBeGreaterThan(0);
    expect(closed[0]!.symbolName).toBe("SOLUSD");
    expect(closed[0]!.realizedPnl).toBeCloseTo(200, 2);
  });

  it("handles stop loss triggers during price mark", () => {
    engine.placeOrder({
      accountId: engine.getAccount().id,
      symbol: "BTCUSD",
      side: "BUY",
      type: "MARKET",
      quantity: 1,
      price: 60000,
      stopLoss: 58000,
    });

    expect(engine.getPositions().some((p) => p.symbolName === "BTCUSD")).toBe(true);

    // Mark price down past stop loss
    engine.mark("BTCUSD", 57900);

    // Position should be auto-closed
    expect(engine.getPositions().some((p) => p.symbolName === "BTCUSD")).toBe(false);
  });
});

import { useState } from "react";
import { useAuthStore } from "../../../services/store.tsx";
import { usePlaceOrder } from "../../../services/queries.ts";
import { readTraderPrefs } from "../../../hooks/useTraderPreferences.ts";
import { DisconnectedTradingBanner } from "../../../components/ConnectionIndicator.tsx";
import type { PlaceOrderInput } from "../../../services/schemas.ts";
import { toast } from "../../../services/toast.ts";
import { formatNumber, cn } from "@/lib/utils";
import type { OrderPanelProps } from "./types";
import { OrderPanelHeader } from "./OrderPanelHeader";
import { OrderSideSelector } from "./OrderSideSelector";
import { OrderQuantityInput } from "./OrderQuantityInput";
import { OrderRiskAnalysis } from "./OrderRiskAnalysis";

export function OrderPanel({
  symbol,
  symbolInfo,
  tick,
  accountId,
  oneClick,
  onToggleOneClick,
  onConfirmOrder,
  accountBalance,
  isFeedConnected = true,
  soundMuted,
  onToggleMute,
  onOrderSuccess,
}: OrderPanelProps) {
  const isDemo = useAuthStore((s) => s.isDemo);
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT" | "STOP">("MARKET");
  const [quantity, setQuantity] = useState(() => {
    const prefs = readTraderPrefs();
    const raw = prefs.defaultQty;
    if (raw) {
      const n = parseFloat(raw);
      if (Number.isFinite(n) && n > 0) return String(Math.round(n * 100) / 100);
    }
    return "0.1";
  });
  const [price, setPrice] = useState("");
  const [stopPrice, setStopPrice] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [stopLoss, setStopLoss] = useState("");

  const placeOrder = usePlaceOrder();

  const handleSubmit = () => {
    if (!isFeedConnected) {
      toast.warning("No Data Feed", "Cannot place orders while disconnected from the data feed");
      return;
    }
    if (!accountId) {
      toast.warning("No Account", "Please select a trading account first");
      return;
    }
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      toast.warning("Invalid Quantity", "Quantity must be a positive number");
      return;
    }
    if (qty > 1000) {
      toast.warning("Invalid Quantity", "Maximum quantity is 1000 lots");
      return;
    }
    if (orderType === "LIMIT" && (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0)) {
      toast.warning("Missing Price", "Limit orders require a valid price");
      return;
    }
    if (
      orderType === "STOP" &&
      (!stopPrice || isNaN(parseFloat(stopPrice)) || parseFloat(stopPrice) <= 0)
    ) {
      toast.warning("Missing Stop Price", "Stop orders require a valid stop price");
      return;
    }
    const effectiveType = orderType;

    const input: PlaceOrderInput = {
      accountId,
      symbol,
      side,
      type: effectiveType as PlaceOrderInput["type"],
      quantity: qty,
    };

    if (orderType === "LIMIT" && price) input.price = parseFloat(price);
    if (orderType === "STOP" && stopPrice) input.stopPrice = parseFloat(stopPrice);
    if (takeProfit) input.takeProfit = parseFloat(takeProfit) || undefined;
    if (stopLoss) input.stopLoss = parseFloat(stopLoss) || undefined;

    const doSubmit = () =>
      placeOrder.mutateAsync(input, {
        onSuccess: () => {
          toast.success("Order Sent", `${side} ${qty} ${symbol} (${effectiveType})`);
          onOrderSuccess?.();
        },
        onError: (err: unknown) => {
          const e = err as {
            error?: { code?: string; message?: string };
            message?: string;
            code?: string;
          };
          const code = e?.error?.code ?? e?.code;
          const msg = e?.error?.message || e?.message || "Failed to place order";
          if (code === "ACCOUNT_PASSED") {
            toast.success("Account Passed!", msg);
          } else if (code === "ACCOUNT_FAILED") {
            toast.error("Account Failed", msg);
          } else if (code === "REQUEST_TIMEOUT") {
            toast.error(
              "Order Timed Out",
              "The server didn't respond in time. Check your connection and try again.",
            );
          } else {
            toast.error("Order Failed", msg);
          }
        },
      });

    if (oneClick && orderType === "MARKET") {
      doSubmit().catch(() => {});
      return;
    }

    if (onConfirmOrder) {
      onConfirmOrder({
        accountId,
        symbol,
        side,
        type: effectiveType,
        quantity: qty,
        price: input.price,
        stopPrice: input.stopPrice,
        takeProfit: input.takeProfit,
        stopLoss: input.stopLoss,
        _submit: doSubmit,
      });
      return;
    }

    doSubmit();
  };

  return (
    <div className="flex flex-col h-full bg-[#131722]" data-testid="order-form">
      <OrderPanelHeader
        symbol={symbol}
        soundMuted={soundMuted}
        onToggleMute={onToggleMute}
        oneClick={oneClick}
        onToggleOneClick={onToggleOneClick}
      />

      <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
        {/* Side and Order Type Selection */}
        <OrderSideSelector
          side={side}
          onSelectSide={setSide}
          orderType={orderType}
          onSelectOrderType={setOrderType}
          tick={tick}
        />

        {/* Quantity */}
        <OrderQuantityInput quantity={quantity} setQuantity={setQuantity} />

        {/* Limit Price */}
        {orderType === "LIMIT" && (
          <div>
            <label className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
              Price
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={tick ? formatNumber(side === "BUY" ? tick.ask : tick.bid, 5) : ""}
              className="w-full mt-1 text-sm font-mono rounded-lg bg-[#131722] border border-[#2a2e39] text-neutral-100 px-3 py-1.5 outline-none focus:border-[#2962ff] transition-colors"
              step="0.00001"
            />
          </div>
        )}

        {/* Stop Price */}
        {orderType === "STOP" && (
          <div>
            <label className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
              Stop Price
            </label>
            <input
              type="number"
              value={stopPrice}
              onChange={(e) => setStopPrice(e.target.value)}
              className="w-full mt-1 text-sm font-mono rounded-lg bg-[#131722] border border-[#2a2e39] text-neutral-100 px-3 py-1.5 outline-none focus:border-[#2962ff] transition-colors"
              step="0.00001"
            />
          </div>
        )}

        {/* TP / SL */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
              Take Profit
            </label>
            <input
              type="number"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              className="w-full mt-1 text-sm font-mono rounded-lg bg-[#131722] border border-[#2a2e39] text-neutral-100 px-3 py-1.5 outline-none focus:border-[#2962ff] transition-colors"
              step="0.00001"
            />
          </div>
          <div>
            <label className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
              Stop Loss
            </label>
            <input
              type="number"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              className="w-full mt-1 text-sm font-mono rounded-lg bg-[#131722] border border-[#2a2e39] text-neutral-100 px-3 py-1.5 outline-none focus:border-[#2962ff] transition-colors"
              step="0.00001"
            />
          </div>
        </div>

        {/* Risk & Margin Analysis */}
        <OrderRiskAnalysis
          symbolInfo={symbolInfo}
          tick={tick}
          side={side}
          quantity={quantity}
          stopLoss={stopLoss}
          takeProfit={takeProfit}
          accountBalance={accountBalance}
        />

        {isDemo && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5 text-center">
            <p className="text-amber-400 text-[10px] font-bold uppercase tracking-wider">
              Demo Mode
            </p>
            <p className="text-neutral-400 text-xs mt-0.5">
              Trading is disabled in demo mode
            </p>
          </div>
        )}
        {!isDemo && !isFeedConnected && <DisconnectedTradingBanner />}
        <button
          type="button"
          className={cn(
            "w-full h-11 rounded-lg font-bold text-sm text-white shadow-lg transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed",
            side === "BUY"
              ? "bg-[#0ecb81] hover:bg-[#0ecb81]/90 shadow-[#0ecb81]/25"
              : "bg-[#f6465d] hover:bg-[#f6465d]/90 shadow-[#f6465d]/25",
          )}
          onClick={handleSubmit}
          disabled={!accountId || placeOrder.isPending || isDemo || !isFeedConnected}
        >
          {isDemo
            ? "Demo — Trading Disabled"
            : !isFeedConnected
              ? "Disconnected — Trading Disabled"
              : placeOrder.isPending
                ? "Placing…"
                : `${side === "BUY" ? "Buy" : "Sell"} ${quantity} ${symbol}`}
        </button>

        {placeOrder.isError && (
          <p className="text-[#f6465d] text-xs mt-1 p-2 bg-[#f6465d]/10 border border-[#f6465d]/20 rounded-lg">
            {(placeOrder.error as { message?: string } | null)?.message || "Order failed"}
          </p>
        )}
        {placeOrder.isSuccess && (
          <p className="text-[#0ecb81] text-xs mt-1 p-2 bg-[#0ecb81]/10 border border-[#0ecb81]/20 rounded-lg">
            Order placed successfully
          </p>
        )}
      </div>
    </div>
  );
}

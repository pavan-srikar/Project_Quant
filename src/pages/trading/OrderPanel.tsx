import { useState } from "react";
import {
  Minus,
  Plus,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Zap,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useAuthStore } from "../../services/store.tsx";
import { usePlaceOrder } from "../../services/queries.ts";
import { readTraderPrefs } from "../../hooks/useTraderPreferences.ts";
import { DisconnectedTradingBanner } from "../../components/ConnectionIndicator.tsx";
import type { PlaceOrderInput } from "../../services/schemas.ts";
import { toast } from "../../services/toast.ts";
import { formatCurrency, formatNumber, cn } from "../../lib/utils.ts";

type ConfirmableOrder = PlaceOrderInput & { _submit: () => Promise<unknown> };

export interface OrderPanelProps {
  symbol: string;
  symbolInfo?: {
    name?: string;
    description?: string;
    pipSize?: number;
    pricescale?: number;
    contractSize?: number;
    marginPercent?: number;
    commission?: number;
    [k: string]: unknown;
  };
  tick?: { bid: number; ask: number; timestamp: number };
  accountId: string | null;
  oneClick?: boolean;
  onToggleOneClick?: () => void;
  onConfirmOrder?: (order: ConfirmableOrder) => void;
  accountBalance?: number;
  isFeedConnected?: boolean;
  soundMuted?: boolean;
  onToggleMute?: () => void;
  onOrderSuccess?: () => void;
}

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

  const quickQty = [0.01, 0.05, 0.1, 0.5, 1.0];

  return (
    <div className="flex flex-col h-full bg-[#131722]" data-testid="order-form">
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-[#2a2e39] bg-[#1e222d]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
            Order
          </span>
          <span className="font-bold text-sm text-neutral-100">{symbol}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onToggleMute}
            className={cn(
              "flex items-center gap-1 px-1.5 py-1 rounded text-[10px] font-medium border transition-colors",
              !soundMuted
                ? "bg-[#2962ff]/15 text-[#2962ff] border-[#2962ff]/30"
                : "text-neutral-400 border-[#2a2e39] hover:bg-[#2a2e39]",
            )}
            title={soundMuted ? "Unmute trade sounds" : "Mute trade sounds"}
          >
            {soundMuted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
          </button>
          <button
            onClick={onToggleOneClick}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold border transition-colors",
              oneClick
                ? "bg-[#0ecb81]/15 text-[#0ecb81] border-[#0ecb81]/30"
                : "text-neutral-400 border-[#2a2e39] hover:bg-[#2a2e39]",
            )}
            title="One-click trading: skip confirmation for market orders"
          >
            <Zap className="h-3 w-3" />
            1-Click
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
        {/* Side Selection */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setSide("BUY")}
            className={cn(
              "h-10 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold transition-all",
              side === "BUY"
                ? "bg-[#0ecb81] text-white shadow-lg shadow-[#0ecb81]/20"
                : "bg-[#1e222d] border border-[#2a2e39] text-neutral-400 hover:text-neutral-200 hover:bg-[#2a2e39]",
            )}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            BUY {tick ? formatNumber(tick.ask, 5) : ""}
          </button>
          <button
            type="button"
            onClick={() => setSide("SELL")}
            className={cn(
              "h-10 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold transition-all",
              side === "SELL"
                ? "bg-[#f6465d] text-white shadow-lg shadow-[#f6465d]/20"
                : "bg-[#1e222d] border border-[#2a2e39] text-neutral-400 hover:text-neutral-200 hover:bg-[#2a2e39]",
            )}
          >
            <TrendingDown className="h-3.5 w-3.5" />
            SELL {tick ? formatNumber(tick.bid, 5) : ""}
          </button>
        </div>

        {/* Order Type */}
        <div>
          <label className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
            Order Type
          </label>
          <div className="grid grid-cols-3 gap-1.5 mt-1">
            {(["MARKET", "LIMIT", "STOP"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setOrderType(t)}
                className={cn(
                  "py-1.5 text-xs font-semibold rounded-lg border transition-colors",
                  t === orderType
                    ? "bg-[#2962ff] text-white border-[#2962ff] shadow-sm"
                    : "bg-[#1e222d] border-[#2a2e39] text-neutral-400 hover:text-neutral-200 hover:bg-[#2a2e39]",
                )}
              >
                {t.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Quantity */}
        <div>
          <label className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
            Volume (lots)
          </label>
          <div className="flex items-center gap-1.5 mt-1">
            <button
              onClick={() =>
                setQuantity((v) => String(Math.max(0.01, parseFloat(v) - 0.01).toFixed(2)))
              }
              className="px-2.5 py-1.5 rounded-lg bg-[#1e222d] hover:bg-[#2a2e39] border border-[#2a2e39] text-neutral-200 transition-colors"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="flex-1 text-center text-sm font-mono font-medium rounded-lg bg-[#131722] border border-[#2a2e39] text-neutral-100 py-1.5 outline-none focus:border-[#2962ff] transition-colors"
              step="0.01"
              min="0.01"
            />
            <button
              onClick={() => setQuantity((v) => String((parseFloat(v) + 0.01).toFixed(2)))}
              className="px-2.5 py-1.5 rounded-lg bg-[#1e222d] hover:bg-[#2a2e39] border border-[#2a2e39] text-neutral-200 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex gap-1.5 mt-1.5">
            {quickQty.map((q) => (
              <button
                key={q}
                onClick={() => setQuantity(String(q))}
                className={cn(
                  "flex-1 text-[11px] font-mono py-1 rounded-md border transition-colors",
                  parseFloat(quantity) === q
                    ? "bg-[#2962ff] text-white border-[#2962ff] font-semibold"
                    : "bg-[#1e222d] border-[#2a2e39] text-neutral-400 hover:text-neutral-200 hover:bg-[#2a2e39]",
                )}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

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

        {/* Risk-per-trade display */}
        {(() => {
          const slVal = parseFloat(stopLoss);
          const tpVal = parseFloat(takeProfit);
          const qtyVal = parseFloat(quantity) || 0;
          const contractSize = symbolInfo?.contractSize || 100000;
          const currentPrice = tick ? (side === "BUY" ? tick.ask : tick.bid) : null;

          if (!currentPrice || !slVal || qtyVal <= 0) return null;

          const slDistance = Math.abs(currentPrice - slVal);
          const riskDollar = slDistance * qtyVal * contractSize;
          const balance = accountBalance || 0;
          const riskPct = balance > 0 ? (riskDollar / balance) * 100 : 0;
          const tpDollar = tpVal ? Math.abs(tpVal - currentPrice) * qtyVal * contractSize : null;
          const rrRatio = tpDollar && riskDollar > 0 ? tpDollar / riskDollar : null;

          const riskColor =
            riskPct > 5 ? "text-[#f6465d]" : riskPct > 2 ? "text-amber-400" : "text-[#0ecb81]";

          return (
            <div className="bg-[#1e222d] rounded-xl p-3 text-xs space-y-1.5 border border-[#2a2e39]">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle className={cn("h-3.5 w-3.5", riskColor)} />
                <span className="font-bold text-[10px] uppercase tracking-wider text-neutral-300">
                  Risk Analysis
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Risk Amount</span>
                <span className={cn("font-mono font-semibold", riskColor)}>
                  {formatCurrency(riskDollar)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Risk % of Balance</span>
                <span className={cn("font-mono font-semibold", riskColor)}>
                  {riskPct.toFixed(2)}%
                </span>
              </div>
              {tpDollar != null && (
                <div className="flex justify-between">
                  <span className="text-neutral-400">Reward</span>
                  <span className="font-mono font-semibold text-[#0ecb81]">{formatCurrency(tpDollar)}</span>
                </div>
              )}
              {rrRatio != null && (
                <div className="flex justify-between">
                  <span className="text-neutral-400">R:R Ratio</span>
                  <span
                    className={cn(
                      "font-mono font-semibold",
                      rrRatio >= 2 ? "text-[#0ecb81]" : rrRatio >= 1 ? "text-neutral-100" : "text-[#f6465d]",
                    )}
                  >
                    1:{rrRatio.toFixed(2)}
                  </span>
                </div>
              )}
              {riskPct > 5 && (
                <div className="text-[#f6465d] text-[10px] flex items-center gap-1 mt-1">
                  <AlertTriangle className="h-3 w-3" />
                  High risk — exceeds 5% of balance
                </div>
              )}
            </div>
          );
        })()}

        {/* Margin info */}
        {symbolInfo && tick && (
          <div className="bg-[#1e222d] rounded-xl p-3 text-xs space-y-1.5 border border-[#2a2e39]">
            <div className="flex justify-between">
              <span className="text-neutral-400">Contract Size</span>
              <span className="font-mono text-neutral-200">{symbolInfo.contractSize?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Margin Required</span>
              <span className="font-mono text-neutral-200">
                {formatCurrency(
                  (parseFloat(quantity) || 0) *
                    (symbolInfo.contractSize ?? 0) *
                    (side === "BUY" ? tick.ask : tick.bid) *
                    ((symbolInfo.marginPercent ?? 0) / 100),
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Commission</span>
              <span className="font-mono text-neutral-200">
                {formatCurrency((symbolInfo.commission ?? 0) * (parseFloat(quantity) || 0))}
              </span>
            </div>
          </div>
        )}

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

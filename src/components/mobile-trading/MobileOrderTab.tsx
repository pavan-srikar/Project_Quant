import { useState } from "react";
import { cn } from "@/lib/utils";
import { LOT_PRESETS } from "./types";

export interface MobileOrderTabProps {
  symbol: string;
  bid: number;
  ask: number;
  spread: number;
  accountBalance: number;
  openPositionCount: number;
  onPlaceOrder: (order: {
    side: "BUY" | "SELL";
    quantity: number;
    type: "MARKET" | "LIMIT" | "STOP";
    price?: number;
    stopLoss?: number;
    takeProfit?: number;
    symbol: string;
    accountId?: string;
  }) => void;
}

export function MobileOrderTab({
  symbol,
  bid,
  ask,
  spread,
  accountBalance,
  openPositionCount,
  onPlaceOrder,
}: MobileOrderTabProps) {
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT" | "STOP">("MARKET");
  const [quantity, setQuantity] = useState(0.1);
  const [limitPrice, setLimitPrice] = useState<string>("");
  const [stopLoss, setStopLoss] = useState<string>("");
  const [takeProfit, setTakeProfit] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleOrder = (side: "BUY" | "SELL") => {
    onPlaceOrder({
      side,
      quantity,
      type: orderType,
      symbol,
      price: orderType !== "MARKET" && limitPrice ? Number(limitPrice) : undefined,
      stopLoss: stopLoss ? Number(stopLoss) : undefined,
      takeProfit: takeProfit ? Number(takeProfit) : undefined,
    });
  };

  return (
    <div className="p-3 space-y-3">
      {/* Symbol + Spread */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-white">{symbol}</span>
        <span className="text-xs text-slate-500">
          Spread: <span className="text-amber-400">{spread.toFixed(1)} pts</span>
        </span>
      </div>

      {/* Order type selector */}
      <div className="flex gap-1.5">
        {(["MARKET", "LIMIT", "STOP"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setOrderType(t)}
            className={cn(
              "flex-1 py-2 rounded-lg text-xs font-medium transition",
              orderType === t ? "bg-violet-600 text-white" : "bg-slate-800 text-slate-400",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Limit/Stop price input */}
      {orderType !== "MARKET" && (
        <div>
          <label className="text-xs text-slate-400 mb-1 block">
            {orderType === "LIMIT" ? "Limit Price" : "Stop Price"}
          </label>
          <input
            type="number"
            step="any"
            value={limitPrice}
            onChange={(e) => setLimitPrice(e.target.value)}
            placeholder={bid.toFixed(5)}
            className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm font-mono text-center focus:ring-2 focus:ring-violet-500"
          />
        </div>
      )}

      {/* Lot size presets */}
      <div>
        <label className="text-xs text-slate-400 mb-1.5 block">
          Lot Size: <span className="text-white font-mono">{quantity}</span>
        </label>
        <div className="grid grid-cols-3 min-[400px]:grid-cols-6 gap-1.5">
          {LOT_PRESETS.map((lot) => (
            <button
              key={lot}
              onClick={() => setQuantity(lot)}
              className={cn(
                "py-2.5 rounded-lg text-xs font-mono font-medium transition active:scale-95",
                quantity === lot
                  ? "bg-violet-600 text-white ring-1 ring-violet-400"
                  : "bg-slate-800 text-slate-300",
              )}
            >
              {lot}
            </button>
          ))}
        </div>
        {/* Custom input */}
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value) || 0.01)}
          className="w-full mt-2 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm font-mono text-center focus:ring-2 focus:ring-violet-500"
        />
      </div>

      {/* Advanced (SL/TP) toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="w-full text-xs text-slate-500 hover:text-slate-300 py-1 transition"
      >
        {showAdvanced ? "▾ Hide SL/TP" : "▸ Set Stop Loss / Take Profit"}
      </button>

      {showAdvanced && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-red-400 mb-1 block">Stop Loss</label>
            <input
              type="number"
              step="any"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              placeholder="Optional"
              className="w-full px-2 py-2 bg-slate-800 border border-red-500/30 rounded-lg text-white text-xs font-mono text-center focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div>
            <label className="text-xs text-emerald-400 mb-1 block">Take Profit</label>
            <input
              type="number"
              step="any"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              placeholder="Optional"
              className="w-full px-2 py-2 bg-slate-800 border border-emerald-500/30 rounded-lg text-white text-xs font-mono text-center focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      )}

      {/* BUY / SELL buttons — large touch targets */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => handleOrder("SELL")}
          className="py-4 rounded-xl bg-red-600 hover:bg-red-500 active:bg-red-700 active:scale-[0.98] text-white font-bold transition-all"
        >
          <div className="text-lg">SELL</div>
          <div className="text-xs font-mono opacity-80">{bid.toFixed(5)}</div>
        </button>
        <button
          onClick={() => handleOrder("BUY")}
          className="py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 active:scale-[0.98] text-white font-bold transition-all"
        >
          <div className="text-lg">BUY</div>
          <div className="text-xs font-mono opacity-80">{ask.toFixed(5)}</div>
        </button>
      </div>

      {/* Account info */}
      <div className="flex justify-between text-xs text-slate-500 pt-1">
        <span>
          Balance: ${accountBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </span>
        <span>Open: {openPositionCount} pos</span>
      </div>
    </div>
  );
}

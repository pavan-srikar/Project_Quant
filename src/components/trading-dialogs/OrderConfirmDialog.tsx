import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useInstrumentLabels } from "../../hooks/useInstrumentLabels.ts";

interface OrderConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  order: {
    symbol: string;
    side: "BUY" | "SELL";
    type: string;
    quantity: number;
    price?: number;
    stopPrice?: number;
    takeProfit?: number;
    stopLoss?: number;
  } | null;
  tick?: { bid: number; ask: number };
  symbolInfo?: {
    digits?: number;
    pip?: number;
    contractSize?: number;
    marginPercent?: number;
    commission?: number;
    [key: string]: unknown;
  } | null;
  loading?: boolean;
}

export function OrderConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  order,
  tick,
  symbolInfo,
  loading,
}: OrderConfirmDialogProps) {
  const { formatQty } = useInstrumentLabels();
  if (!isOpen || !order) return null;

  const executionPrice =
    order.type === "MARKET"
      ? order.side === "BUY"
        ? tick?.ask
        : tick?.bid
      : order.price || order.stopPrice;

  const marginRequired =
    executionPrice && symbolInfo
      ? order.quantity *
        (symbolInfo.contractSize || 100000) *
        executionPrice *
        ((symbolInfo.marginPercent || 1) / 100)
      : null;

  const commission = symbolInfo ? (symbolInfo.commission || 0) * order.quantity : null;

  const tpPnl =
    order.takeProfit && executionPrice
      ? (order.side === "BUY"
          ? order.takeProfit - executionPrice
          : executionPrice - order.takeProfit) *
        order.quantity *
        (symbolInfo?.contractSize || 100000)
      : null;

  const slPnl =
    order.stopLoss && executionPrice
      ? (order.side === "BUY" ? order.stopLoss - executionPrice : executionPrice - order.stopLoss) *
        order.quantity *
        (symbolInfo?.contractSize || 100000)
      : null;

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-[#131722] border border-[#2a2e39] rounded-xl shadow-2xl overflow-hidden">
          <div
            className={cn(
              "px-5 py-3.5 border-b flex items-center justify-between",
              order.side === "BUY"
                ? "bg-[#0ecb81]/10 border-[#0ecb81]/20 text-[#0ecb81]"
                : "bg-[#f6465d]/10 border-[#f6465d]/20 text-[#f6465d]",
            )}
          >
            <h3 className="text-sm font-semibold flex items-center gap-2">
              {order.side === "BUY" ? (
                <TrendingUp className="h-4 w-4 text-[#0ecb81]" />
              ) : (
                <TrendingDown className="h-4 w-4 text-[#f6465d]" />
              )}
              Confirm {order.side} Order
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1e222d] border border-[#2a2e39] text-neutral-300 uppercase tracking-wider font-semibold">
              {order.type}
            </span>
          </div>

          <div className="px-5 py-4 space-y-2.5 text-sm bg-[#131722]">
            <Row label="Symbol" value={order.symbol} bold />
            <Row
              label="Side"
              value={order.side}
              valueClass={order.side === "BUY" ? "text-[#0ecb81]" : "text-[#f6465d]"}
            />
            <Row label="Type" value={order.type} />
            <Row label="Volume" value={formatQty(order.quantity)} />
            {executionPrice && <Row label="Price" value={formatNumber(executionPrice, 5)} />}
            {order.takeProfit && (
              <Row
                label="Take Profit"
                value={formatNumber(order.takeProfit, 5)}
                extra={
                  tpPnl !== null ? `(${tpPnl >= 0 ? "+" : ""}${formatCurrency(tpPnl)})` : undefined
                }
                valueClass="text-[#0ecb81]"
              />
            )}
            {order.stopLoss && (
              <Row
                label="Stop Loss"
                value={formatNumber(order.stopLoss, 5)}
                extra={
                  slPnl !== null ? `(${slPnl >= 0 ? "+" : ""}${formatCurrency(slPnl)})` : undefined
                }
                valueClass="text-[#f6465d]"
              />
            )}
            {marginRequired !== null && (
              <Row label="Margin Required" value={formatCurrency(marginRequired)} />
            )}
            {commission !== null && <Row label="Commission" value={formatCurrency(commission)} />}
          </div>

          <div className="px-5 py-3.5 border-t border-[#2a2e39] bg-[#1e222d] flex gap-2.5">
            <Button
              variant="outline"
              className="flex-1 h-9 rounded-lg border-[#2a2e39] bg-transparent text-neutral-300 hover:bg-[#2a2e39] hover:text-white"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              className={cn(
                "flex-1 h-9 rounded-lg font-bold text-xs transition-all shadow-md",
                order.side === "BUY"
                  ? "bg-[#0ecb81] hover:bg-[#0ecb81]/90 text-black"
                  : "bg-[#f6465d] hover:bg-[#f6465d]/90 text-white",
              )}
              onClick={onConfirm}
              loading={loading}
              disabled={loading}
            >
              {loading ? "Placing..." : `Confirm ${order.side}`}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

function Row({
  label,
  value,
  valueClass,
  bold,
  extra,
}: {
  label: string;
  value: string;
  valueClass?: string;
  bold?: boolean;
  extra?: string;
}) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-neutral-400 text-xs">{label}</span>
      <span className={cn("font-mono text-xs text-neutral-200", valueClass, bold && "font-semibold text-sm text-white")}>
        {value}
        {extra && <span className="text-[10px] ml-1 opacity-80">{extra}</span>}
      </span>
    </div>
  );
}

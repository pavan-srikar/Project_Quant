import { useState, useEffect } from "react";
import { api } from "../../services/api";
import { toast } from "../../services/toast";
import { formatNumber } from "@/lib/utils";
import { X, SlidersHorizontal } from "lucide-react";
import { useInstrumentLabels } from "../../hooks/useInstrumentLabels.ts";

interface OrderModifyDialogProps {
  order: {
    id: string;
    symbolName: string;
    side: string;
    type: string;
    quantity: number;
    price?: number | null;
    stopPrice?: number | null;
    takeProfit?: number | null;
    stopLoss?: number | null;
  } | null;
  onClose: () => void;
  onSaved: () => void;
  tick?: { bid: number; ask: number };
}

export function OrderModifyDialog({ order, onClose, onSaved, tick }: OrderModifyDialogProps) {
  const { unitLabelCap, isFutures } = useInstrumentLabels();
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [tp, setTp] = useState("");
  const [sl, setSl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (order) {
      setPrice(
        order.price != null
          ? String(order.price)
          : order.stopPrice != null
            ? String(order.stopPrice)
            : "",
      );
      setQuantity(String(order.quantity));
      setTp(order.takeProfit != null ? String(order.takeProfit) : "");
      setSl(order.stopLoss != null ? String(order.stopLoss) : "");
    }
  }, [order]);

  if (!order) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const modifications: {
        price?: number;
        quantity?: number;
        takeProfit?: number | null;
        stopLoss?: number | null;
      } = {};
      const newPrice = parseFloat(price);
      const newQty = parseFloat(quantity);
      const newTp = tp ? parseFloat(tp) : null;
      const newSl = sl ? parseFloat(sl) : null;

      if (!isNaN(newPrice) && newPrice > 0) modifications.price = newPrice;
      if (!isNaN(newQty) && newQty > 0 && newQty !== order.quantity)
        modifications.quantity = newQty;
      if (tp !== "" && newTp !== order.takeProfit) modifications.takeProfit = newTp;
      if (sl !== "" && newSl !== order.stopLoss) modifications.stopLoss = newSl;
      if (tp === "" && order.takeProfit != null) modifications.takeProfit = null;
      if (sl === "" && order.stopLoss != null) modifications.stopLoss = null;

      if (Object.keys(modifications).length === 0) {
        toast.info("No Changes", "No modifications to apply");
        setSaving(false);
        return;
      }

      await api.modifyOrder(order.id, modifications);
      toast.success("Order Modified", "Pending order has been updated");
      onSaved();
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e?.code === "REQUEST_TIMEOUT") {
        toast.error(
          "Request Timed Out",
          "The server didn't respond in time. Check your connection and try again.",
        );
      } else {
        toast.error("Modify Failed", e?.message || "Could not modify order");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-[#131722] border border-[#2a2e39] rounded-xl shadow-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#2a2e39] bg-[#1e222d] flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-[#2962ff]" />
              Modify {order.side} {order.type} — {order.symbolName}
            </h3>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-[#2a2e39] text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-5 py-4 space-y-3.5 bg-[#131722]">
            <div>
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Price
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full mt-1 text-sm font-mono rounded-lg bg-[#131722] border border-[#2a2e39] text-neutral-100 px-3 py-2 outline-none focus:border-[#2962ff] transition-colors"
                step="0.00001"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Quantity ({unitLabelCap})
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full mt-1 text-sm font-mono rounded-lg bg-[#131722] border border-[#2a2e39] text-neutral-100 px-3 py-2 outline-none focus:border-[#2962ff] transition-colors"
                step={isFutures ? "1" : "0.01"}
                min={isFutures ? "1" : "0.01"}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  Take Profit
                </label>
                <input
                  type="number"
                  value={tp}
                  onChange={(e) => setTp(e.target.value)}
                  className="w-full mt-1 text-sm font-mono rounded-lg bg-[#131722] border border-[#2a2e39] text-neutral-100 px-3 py-2 outline-none focus:border-[#2962ff] transition-colors"
                  step="0.00001"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  Stop Loss
                </label>
                <input
                  type="number"
                  value={sl}
                  onChange={(e) => setSl(e.target.value)}
                  className="w-full mt-1 text-sm font-mono rounded-lg bg-[#131722] border border-[#2a2e39] text-neutral-100 px-3 py-2 outline-none focus:border-[#2962ff] transition-colors"
                  step="0.00001"
                />
              </div>
            </div>

            {tick && (
              <div className="text-xs text-neutral-400 flex gap-4 pt-1">
                <span>
                  Bid: <span className="font-mono font-semibold text-[#f6465d]">{formatNumber(tick.bid, 5)}</span>
                </span>
                <span>
                  Ask: <span className="font-mono font-semibold text-[#0ecb81]">{formatNumber(tick.ask, 5)}</span>
                </span>
              </div>
            )}
          </div>

          <div className="px-5 py-3.5 border-t border-[#2a2e39] bg-[#1e222d] flex gap-2">
            <button
              type="button"
              className="flex-1 h-9 rounded-lg bg-[#131722] border border-[#2a2e39] text-neutral-300 hover:bg-[#2a2e39] text-xs font-semibold transition-colors"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="flex-1 h-9 rounded-lg bg-[#2962ff] hover:bg-[#2962ff]/90 text-white text-xs font-bold shadow-md shadow-[#2962ff]/20 transition-all disabled:opacity-50"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

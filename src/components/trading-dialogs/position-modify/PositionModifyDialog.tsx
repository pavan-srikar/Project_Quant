import { useState, useEffect } from "react";
import { api } from "../../../services/api";
import { toast } from "../../../services/toast";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import { useInstrumentLabels } from "../../../hooks/useInstrumentLabels.ts";
import {
  X,
  TrendingUp,
  TrendingDown,
  SlidersHorizontal,
  ArrowLeftRight,
  WifiOff,
} from "lucide-react";
import type { PositionModifyDialogProps } from "./types";
import { ModifyTpSlTab } from "./ModifyTpSlTab";
import { PartialCloseTab } from "./PartialCloseTab";

export function PositionModifyDialog({
  position,
  onClose,
  onSaved,
  tick,
  isFeedConnected = true,
}: PositionModifyDialogProps) {
  const { formatQty, unitLabel, isFutures, instrumentType } = useInstrumentLabels();
  const [tp, setTp] = useState("");
  const [sl, setSl] = useState("");
  const [partialQty, setPartialQty] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"modify" | "partial">("modify");

  // BUG-62 FIX: Reinitialize form fields when the selected position changes.
  // Previously used useState() callback which only runs on initial mount,
  // meaning switching positions kept stale TP/SL values.
  useEffect(() => {
    if (position) {
      setTp(position.takeProfit != null ? String(position.takeProfit) : "");
      setSl(position.stopLoss != null ? String(position.stopLoss) : "");
      setPartialQty("");
    }
  }, [position]);

  if (!position) return null;

  const currentPrice = tick
    ? position.side === "LONG"
      ? tick.bid
      : tick.ask
    : position.currentPrice || position.entryPrice;

  const pnlPerUnit =
    position.side === "LONG"
      ? currentPrice - position.entryPrice
      : position.entryPrice - currentPrice;

  const handleModify = async () => {
    if (!isFeedConnected) {
      toast.error("No Data Feed", "Cannot modify positions while disconnected from the data feed");
      return;
    }
    const mods: { takeProfit?: number | null; stopLoss?: number | null } = {};
    // Empty string means "remove this level". Non-empty means "set to this value".
    // We only send the field if it actually changed from the persisted value.
    if (tp === "" && position.takeProfit != null) {
      mods.takeProfit = null; // removal
    } else if (tp !== "" && parseFloat(tp) !== position.takeProfit) {
      mods.takeProfit = parseFloat(tp);
    }
    if (sl === "" && position.stopLoss != null) {
      mods.stopLoss = null; // removal
    } else if (sl !== "" && parseFloat(sl) !== position.stopLoss) {
      mods.stopLoss = parseFloat(sl);
    }
    if (Object.keys(mods).length === 0) {
      toast.info("No Changes", "No modifications to apply");
      return;
    }
    setSaving(true);
    try {
      await api.modifyPosition(position.id, mods);
      toast.success("Position Modified", "TP/SL updated successfully");
      onSaved();
      onClose();
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e?.code === "REQUEST_TIMEOUT") {
        toast.error(
          "Request Timed Out",
          "The server didn't respond in time. Check your connection and try again.",
        );
      } else {
        toast.error("Modify Failed", e.message || "Could not modify position");
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePartialClose = async () => {
    if (!isFeedConnected) {
      toast.error("No Data Feed", "Cannot close positions while disconnected from the data feed");
      return;
    }
    const qty = parseFloat(partialQty);
    if (isNaN(qty) || qty <= 0 || qty > position.quantity) {
      toast.warning("Invalid Quantity", `Enter a value between 0.01 and ${position.quantity}`);
      return;
    }
    setSaving(true);
    try {
      await api.closePosition(position.id, qty);
      toast.success("Partial Close", `Closed ${formatQty(qty)} of ${formatQty(position.quantity)}`);
      onSaved();
      onClose();
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e?.code === "REQUEST_TIMEOUT") {
        toast.error(
          "Request Timed Out",
          "The server didn't respond in time. Check your connection and try again.",
        );
      } else {
        toast.error("Close Failed", e.message || "Could not partially close position");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSetBreakeven = () => {
    setSl(String(position.entryPrice));
    toast.info("Breakeven", "Stop Loss set to entry price — click Save to apply");
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#131722] border border-[#2a2e39] rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#2a2e39] bg-[#1e222d]">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "p-2 rounded-lg",
                  position.side === "LONG"
                    ? "bg-[#3179f5]/15 text-[#3179f5] border border-[#3179f5]/30"
                    : "bg-[#ec407a]/15 text-[#ec407a] border border-[#ec407a]/30",
                )}
              >
                {position.side === "LONG" ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-100">Modify {position.symbolName}</h3>
                <p className="text-[11px] text-neutral-400">
                  {position.side} {position.quantity} @ {formatNumber(position.entryPrice, 5)}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-[#2a2e39] text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Current Status */}
          <div className="px-5 py-3 grid grid-cols-3 gap-3 border-b border-[#2a2e39] bg-[#131722] text-center">
            <div>
              <div className="text-[10px] uppercase font-semibold text-neutral-400">Current</div>
              <div className="text-sm font-mono font-bold text-neutral-100">{formatNumber(currentPrice, 5)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-semibold text-neutral-400">P&L</div>
              <div
                className={cn(
                  "text-sm font-mono font-bold",
                  (position.unrealizedPnl || 0) >= 0 ? "text-[#0ecb81]" : "text-[#f6465d]",
                )}
              >
                {(position.unrealizedPnl || 0) >= 0 ? "+" : ""}
                {formatCurrency(position.unrealizedPnl || 0)}
              </div>
            </div>
            {instrumentType === "FOREX" && (
              <div>
                <div className="text-[10px] uppercase font-semibold text-neutral-400">Pips</div>
                <div
                  className={cn(
                    "text-sm font-mono font-bold",
                    pnlPerUnit >= 0 ? "text-[#0ecb81]" : "text-[#f6465d]",
                  )}
                >
                  {(pnlPerUnit * 10000).toFixed(1)}
                </div>
              </div>
            )}
          </div>

          {/* Disconnected warning */}
          {!isFeedConnected && (
            <div className="mx-5 mt-3 bg-[#f6465d]/10 border border-[#f6465d]/30 rounded-lg px-3 py-2 text-center">
              <div className="flex items-center justify-center gap-1.5 text-[#f6465d] text-xs font-semibold">
                <WifiOff className="h-3.5 w-3.5" />
                Data Feed Disconnected
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Modifications disabled until connection is restored
              </p>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-[#2a2e39] bg-[#1e222d]">
            <button
              className={cn(
                "flex-1 py-2.5 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5",
                activeTab === "modify"
                  ? "text-[#2962ff] border-b-2 border-[#2962ff] bg-[#2a2e39]/30"
                  : "text-neutral-400 hover:text-neutral-200",
              )}
              onClick={() => setActiveTab("modify")}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" /> Modify TP/SL
            </button>
            <button
              className={cn(
                "flex-1 py-2.5 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5",
                activeTab === "partial"
                  ? "text-[#2962ff] border-b-2 border-[#2962ff] bg-[#2a2e39]/30"
                  : "text-neutral-400 hover:text-neutral-200",
              )}
              onClick={() => setActiveTab("partial")}
            >
              <ArrowLeftRight className="h-3.5 w-3.5" /> Partial Close
            </button>
          </div>

          {/* Content */}
          <div className="px-5 py-4 space-y-3.5 bg-[#131722]">
            {activeTab === "modify" && (
              <ModifyTpSlTab
                position={position}
                tp={tp}
                setTp={setTp}
                sl={sl}
                setSl={setSl}
                saving={saving}
                isFeedConnected={isFeedConnected}
                onModify={handleModify}
                onSetBreakeven={handleSetBreakeven}
              />
            )}

            {activeTab === "partial" && (
              <PartialCloseTab
                position={position}
                partialQty={partialQty}
                setPartialQty={setPartialQty}
                saving={saving}
                isFeedConnected={isFeedConnected}
                onPartialClose={handlePartialClose}
                unitLabel={unitLabel}
                isFutures={isFutures}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTradeSound } from "../../hooks/useTradeSound";
import { posthog } from "../../lib/posthog";
import { api } from "../../services/api.ts";
import type { PlaceOrderInput, Position, Order } from "../../services/schemas.ts";
import { toast } from "../../services/toast.ts";
import { type ConfirmOrderState, getErrorMessage } from "./types.ts";

export interface UseTradingActionsParams {
  selectedSymbol: string;
  activeAccountId: string | null;
  isFeedConnected: boolean;
  updateTick: (symbol: string, bid: number, ask: number, timestamp: number) => void;
}

export function useTradingActions({
  selectedSymbol,
  activeAccountId,
  isFeedConnected,
  updateTick,
}: UseTradingActionsParams) {
  const queryClient = useQueryClient();

  const hasTrackedFirstTrade = useRef(false);
  const handleFirstTrade = useCallback(() => {
    if (!hasTrackedFirstTrade.current) {
      hasTrackedFirstTrade.current = true;
      posthog.capture("funnel.trade.first_executed", { sessionId: posthog.get_session_id?.() });
    }
  }, []);

  // One-click trading mode (#4)
  const [oneClick, setOneClick] = useState(
    () => localStorage.getItem("oneClickTrading") === "true",
  );
  const toggleOneClick = useCallback(() => {
    setOneClick((prev) => {
      const v = !prev;
      localStorage.setItem("oneClickTrading", String(v));
      return v;
    });
  }, []);

  // Trade sound effect
  const { muted: soundMuted, toggleMute: toggleSoundMute, playTradeSound } = useTradeSound();

  // Position modify dialog (#6)
  const [modifyingPosition, setModifyingPosition] = useState<Position | null>(null);

  // Order modify dialog (#30)
  const [modifyingOrder, setModifyingOrder] = useState<Order | null>(null);

  // Order confirmation dialog (#7)
  const [confirmOrder, setConfirmOrder] = useState<ConfirmOrderState>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Prime the active symbol with a fresh server-side snapshot immediately on
  // symbol switch so bid/ask appears without waiting for the next WS tick.
  useEffect(() => {
    let cancelled = false;
    void api
      .getTick(selectedSymbol)
      .then((tick) => {
        if (cancelled || !tick) return;
        const bid = Number(tick.bid);
        const ask = Number(tick.ask);
        if (!Number.isFinite(bid) || !Number.isFinite(ask) || bid <= 0 || ask <= 0) return;
        updateTick(
          selectedSymbol,
          bid,
          ask,
          typeof tick.timestamp === "number" ? tick.timestamp : Date.now(),
        );
      })
      .catch(() => {
        // Ignore snapshot misses; WS stream remains authoritative.
      });
    return () => {
      cancelled = true;
    };
  }, [selectedSymbol, updateTick]);

  // Handler for chart drag-to-edit SL/TP levels
  const handleChartModifyPosition = useCallback(
    async (positionId: string, mods: { takeProfit?: number | null; stopLoss?: number | null }) => {
      if (!isFeedConnected) {
        toast.warning(
          "No Data Feed",
          "Cannot modify positions while disconnected from the data feed",
        );
        if (activeAccountId) {
          queryClient.invalidateQueries({
            queryKey: ["positions", activeAccountId],
          });
        }
        return;
      }
      try {
        await api.modifyPosition(positionId, mods);
        const field = mods.takeProfit !== undefined ? "TP" : "SL";
        const price = mods.takeProfit !== undefined ? mods.takeProfit : mods.stopLoss;
        toast.success(`${field} Updated`, `${field} set to ${price}`);
        if (activeAccountId) {
          queryClient.invalidateQueries({
            queryKey: ["positions", activeAccountId],
          });
        }
      } catch (err: unknown) {
        toast.error("Modify Failed", getErrorMessage(err));
        // Refetch to revert price line to original value
        if (activeAccountId) {
          queryClient.invalidateQueries({
            queryKey: ["positions", activeAccountId],
          });
        }
      }
    },
    [activeAccountId, queryClient, isFeedConnected],
  );

  // Chart context-menu quick orders (Buy/Sell limit/stop at the clicked price).
  const handleQuickOrder = useCallback(
    (side: "BUY" | "SELL", type: "LIMIT" | "STOP", price: number) => {
      if (!activeAccountId) {
        toast.warning("No Account", "Select an account before placing orders");
        return;
      }
      const input: PlaceOrderInput = {
        accountId: activeAccountId,
        symbol: selectedSymbol,
        side,
        type,
        quantity: 1,
        ...(type === "LIMIT" ? { price } : { stopPrice: price }),
      };
      setConfirmOrder({
        symbol: selectedSymbol,
        side,
        type,
        quantity: 1,
        price: type === "LIMIT" ? price : undefined,
        stopPrice: type === "STOP" ? price : undefined,
        _submit: () => api.placeOrder(input),
      });
    },
    [activeAccountId, selectedSymbol],
  );

  const handleConfirmOrderSubmit = useCallback(() => {
    if (confirmOrder?._submit) {
      setConfirmLoading(true);
      confirmOrder
        ._submit()
        .then(() => {
          playTradeSound();
          handleFirstTrade();
        })
        .finally(() => {
          setConfirmLoading(false);
          setConfirmOrder(null);
        });
    }
  }, [confirmOrder, playTradeSound, handleFirstTrade]);

  return {
    oneClick,
    setOneClick,
    toggleOneClick,
    soundMuted,
    toggleSoundMute,
    playTradeSound,
    handleFirstTrade,
    modifyingPosition,
    setModifyingPosition,
    modifyingOrder,
    setModifyingOrder,
    confirmOrder,
    setConfirmOrder,
    confirmLoading,
    handleConfirmOrderSubmit,
    handleChartModifyPosition,
    handleQuickOrder,
  };
}

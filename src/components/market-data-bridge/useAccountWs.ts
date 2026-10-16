import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTradingStore } from "../../services/store.tsx";
import { wsClient } from "../../services/ws.ts";
import type { AccountWsEvent } from "./types.ts";

export function useAccountWs() {
  const updateAccountInStore = useTradingStore((s) => s.updateAccountInStore);
  const loadAccounts = useTradingStore((s) => s.loadAccounts);
  const queryClient = useQueryClient();

  // Account/equity events.
  useEffect(() => {
    const unsub = wsClient.subscribe("account", (event) => {
      const wsEvent = event as AccountWsEvent;
      if (wsEvent.eventType === "EquityUpdated" && wsEvent.accountId) {
        updateAccountInStore({
          id: wsEvent.accountId,
          equity: wsEvent.equity,
          balance: wsEvent.balance,
          freeMargin: wsEvent.freeMargin,
          margin: wsEvent.marginUsed,
        });
        // Live equity/balance is already in the zustand store — no HTTP refetch needed.
        // Invalidating here caused a 429 flood (one refetch per market tick per second).
      }
      if (["AccountFailed", "AccountPassed", "AccountFrozen"].includes(wsEvent.eventType)) {
        loadAccounts();
      }
    });
    return unsub;
  }, [loadAccounts, updateAccountInStore, queryClient]);
}

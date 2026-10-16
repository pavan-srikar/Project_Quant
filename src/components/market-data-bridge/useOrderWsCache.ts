import { useEffect, startTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { wsClient } from "../../services/ws.ts";
import { queryKeys } from "../../services/queries.ts";
import type { Order } from "../../services/schemas.ts";
import type { OrderWsEvent } from "./types.ts";
import { coalesceInvalidation } from "./coalesceInvalidation.ts";

// ── Orders — entity-enriched cache updates with coalesced REST fallback ──
//
//   OrderPlaced/OrderFilled/OrderCanceled — ws-handler attaches _entity;
//                                           update the orders cache directly.
//   Everything else — coalesced 150ms invalidation.
//
// Orders cache key includes an optional status segment; we use the base key
// ["orders", accountId] to match all status variants at once.
export function useOrderWsCache() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsub = wsClient.subscribe("orders", (event) => {
      const ev = event as OrderWsEvent;
      if (!ev.accountId) return;

      const ordKey = queryKeys.trading.orders(ev.accountId);

      if (
        ev._entity &&
        (ev.eventType === "OrderPlaced" ||
          ev.eventType === "OrderFilled" ||
          ev.eventType === "OrderCanceled")
      ) {
        const entity = ev._entity;
        startTransition(() => {
          // Upsert: replace if exists, append if new
          queryClient.setQueryData<Order[]>(ordKey, (old) => {
            if (!old) return [entity];
            const idx = old.findIndex((o) => o.id === entity.id);
            if (idx >= 0) {
              const next = [...old];
              next[idx] = entity;
              return next;
            }
            return [entity, ...old];
          });
        });
        return;
      }

      // Fallback for unrecognised events or missing enrichment
      coalesceInvalidation(queryClient, ordKey);
    });
    return unsub;
  }, [queryClient]);

  // Gap-fill on WS reconnect: refetch caches so anything that happened
  // while the socket was down lands instantly.
  useEffect(() => {
    let wasConnected = wsClient.state === "connected";
    return wsClient.onStateChange((state) => {
      if (state === "connected" && !wasConnected) {
        queryClient.invalidateQueries({ queryKey: ["candles"] });
        queryClient.invalidateQueries({ queryKey: ["positions"] });
        queryClient.invalidateQueries({ queryKey: ["orders"] });
        queryClient.invalidateQueries({ queryKey: ["accounts"] });
      }
      wasConnected = state === "connected";
    });
  }, [queryClient]);
}

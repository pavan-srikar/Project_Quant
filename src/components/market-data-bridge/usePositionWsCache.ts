import { useEffect, startTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { wsClient } from "../../services/ws.ts";
import { queryKeys } from "../../services/queries.ts";
import type { Position } from "../../services/schemas.ts";
import type { PositionWsEvent } from "./types.ts";
import { coalesceInvalidation } from "./coalesceInvalidation.ts";

// ── PositionOpened 50ms batch buffer (G) ─────────────────────────────────
// HFT burst fills emit multiple PositionOpened events in rapid succession.
// Instead of calling setQueryData once per event (N renders), we collect all
// entities that arrive within 50ms for the same account and flush them in one
// setQueryData call → one render cycle.
//
// Also handles optimistic placeholder cleanup (D): when the real entity
// arrives, any optimistic position with the same symbolName+side whose ID
// starts with "opt-" is evicted so there's no duplicate flash.
const _positionBatchBuffers = new Map<string, Position[]>();
const _positionBatchTimers = new Map<string, ReturnType<typeof setTimeout>>();

function bufferPositionOpened(
  accountId: string,
  entity: Position,
  queryClient: ReturnType<typeof useQueryClient>,
  posKey: readonly unknown[],
) {
  const existing = _positionBatchBuffers.get(accountId) ?? [];
  existing.push(entity);
  _positionBatchBuffers.set(accountId, existing);

  // Reset the flush timer on each new arrival
  const prev = _positionBatchTimers.get(accountId);
  if (prev) clearTimeout(prev);
  _positionBatchTimers.set(
    accountId,
    setTimeout(() => {
      const entities = _positionBatchBuffers.get(accountId) ?? [];
      _positionBatchBuffers.delete(accountId);
      _positionBatchTimers.delete(accountId);
      if (entities.length === 0) return;

      startTransition(() => {
        queryClient.setQueryData<Position[]>(posKey, (old) => {
          let next = [...(old ?? [])];
          for (const e of entities) {
            // Evict any optimistic placeholder for this symbol+side (D cleanup)
            next = next.filter(
              (p) => !(p.id.startsWith("opt-") && p.symbolName === e.symbolName && p.side === e.side),
            );
            // Upsert: replace if already present (safety for duplicate events), else append
            const idx = next.findIndex((p) => p.id === e.id);
            if (idx >= 0) {
              const arr = [...next];
              arr[idx] = e;
              next = arr;
            } else {
              next = [...next, e];
            }
          }
          return next;
        });
      });
    }, 50),
  );
}

// ── Positions — direct cache surgery, zero REST roundtrip ───────────────
//
// Strategy per event type:
//   PositionOpened  — ws-handler attaches full position as _entity; we append
//                     directly to the cache. If _entity is absent (DB lookup
//                     failed), fall back to 150ms coalesced invalidation.
//   PositionUpdated — event carries unrealizedPnl/quantity/averagePrice; patch
//                     the cached entry in place (no _entity / no DB needed).
//   PositionClosed  — remove by positionId; tombstone only, no DB needed.
//   unknown types   — coalesced invalidation as safety net.
//
// startTransition marks every cache write as non-urgent so React can yield
// to user input (scroll, tap) mid-render and batch updates.
export function usePositionWsCache() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsub = wsClient.subscribe("positions", (event) => {
      const ev = event as PositionWsEvent;
      if (!ev.accountId) return;

      const posKey = queryKeys.trading.positions(ev.accountId);

      if (ev.eventType === "PositionOpened") {
        if (ev._entity) {
          // Route through the 50ms batch buffer so a burst of fills (G)
          // collapses into one setQueryData and one render, and optimistic
          // placeholders are cleaned up atomically (D).
          bufferPositionOpened(ev.accountId, ev._entity, queryClient, posKey);
        } else {
          // _entity absent (DB lookup failed) — fall back to REST
          coalesceInvalidation(queryClient, posKey);
        }
        return;
      }

      if (ev.eventType === "PositionUpdated") {
        startTransition(() => {
          queryClient.setQueryData<Position[]>(posKey, (old) =>
            (old ?? []).map((p) =>
              p.id === ev.positionId
                ? {
                    ...p,
                    unrealizedPnl: ev.unrealizedPnl ?? p.unrealizedPnl,
                    quantity: ev.quantity ?? p.quantity,
                    entryPrice: ev.averagePrice ?? p.entryPrice,
                  }
                : p,
            ),
          );
        });
        return;
      }

      if (ev.eventType === "PositionClosed") {
        startTransition(() => {
          queryClient.setQueryData<Position[]>(posKey, (old) =>
            (old ?? []).filter((p) => p.id !== ev.positionId),
          );
        });
        // Closed positions list needs a refresh — coalesced so burst closes → 1 fetch
        coalesceInvalidation(queryClient, ["closedPositions", ev.accountId]);
        return;
      }

      // Unknown event type — coalesced invalidation
      coalesceInvalidation(queryClient, posKey);
    });
    return unsub;
  }, [queryClient]);
}

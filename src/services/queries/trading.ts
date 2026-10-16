import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import type {
  ClosedPosition,
  Fill,
  Order,
  Position,
  PlaceOrderInput,
} from "../schemas";
import { queryKeys } from "./keys";

export function usePositions(accountId: string | null) {
  return useQuery<Position[]>({
    queryKey: queryKeys.trading.positions(accountId!),
    queryFn: () => api.getPositions(accountId!),
    enabled: !!accountId,
    staleTime: 10_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: false,
  });
}

/** Cross-account total open position count */
export function useOpenPositionCount() {
  return useQuery<number>({
    queryKey: ["openPositionCount"],
    queryFn: () => api.getOpenPositionCount(),
    refetchInterval: 5_000,
  });
}

export function useOrders(accountId: string | null, status?: string) {
  return useQuery<Order[]>({
    queryKey: queryKeys.trading.orders(accountId!, status),
    queryFn: () => api.getOrders(accountId!, status),
    enabled: !!accountId,
    staleTime: 10_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useFills(accountId: string | null, page = 1) {
  return useQuery<{
    data: Fill[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>({
    queryKey: queryKeys.trading.fills(accountId!, page),
    queryFn: () => api.getFills(accountId!, page),
    enabled: !!accountId,
    staleTime: 30_000,
  });
}

export function useClosedPositions(accountId: string | null, page = 1) {
  return useQuery<{
    data: ClosedPosition[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>({
    queryKey: queryKeys.trading.closedPositions(accountId!, page),
    queryFn: () => api.getClosedPositions(accountId!, page),
    enabled: !!accountId,
    staleTime: 30_000,
  });
}

export function useClosedPositionsSummary(
  accountId: string | null,
  from: string | null,
  to: string | null,
) {
  return useQuery<{ pnl: number; commission: number; swap: number; tradeCount: number }>({
    queryKey: ["closedPositionsSummary", accountId, from, to] as const,
    queryFn: () => api.getClosedPositionsSummary(accountId!, from!, to!),
    enabled: !!(accountId && from && to),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useFillQuality(accountId: string | null) {
  return useQuery<{
    avgScore: number | null;
    count: number;
    entries: Array<{
      id: string;
      symbol: string;
      side: string;
      slippageBps: number;
      latencyMs: number;
      integrityCoupled: boolean;
      qualityScore: number | null;
      createdAt: string;
    }>;
  }>({
    queryKey: ["fillQuality", accountId] as const,
    queryFn: () => api.getFillQuality(accountId!),
    enabled: !!accountId,
    staleTime: 60_000,
  });
}

export function usePlaceOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PlaceOrderInput) => api.placeOrder(input),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: queryKeys.trading.orders(vars.accountId),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.trading.positions(vars.accountId),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.accounts.detail(vars.accountId),
      });
    },
  });
}

export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId }: { orderId: string; accountId: string }) => api.cancelOrder(orderId),
    onMutate: async ({ orderId, accountId }) => {
      await qc.cancelQueries({ queryKey: queryKeys.trading.orders(accountId) });
      const prev = qc.getQueryData<Order[]>(queryKeys.trading.orders(accountId));
      if (prev) {
        qc.setQueryData(
          queryKeys.trading.orders(accountId),
          prev.map((o) => (o.id === orderId ? { ...o, status: "CANCELLED" } : o)),
        );
      }
      return { prev };
    },
    onError: (_err, { accountId }, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKeys.trading.orders(accountId), ctx.prev);
    },
    onSettled: (_data, _err, { accountId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.trading.orders(accountId) });
    },
  });
}

export function useClosePosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      positionId,
      quantity,
    }: {
      positionId: string;
      accountId: string;
      quantity?: number;
    }) => api.closePosition(positionId, quantity),
    onSuccess: (_data, { accountId }) => {
      qc.invalidateQueries({
        queryKey: queryKeys.trading.positions(accountId),
      });
      qc.invalidateQueries({ queryKey: queryKeys.accounts.detail(accountId) });
      qc.invalidateQueries({ queryKey: ["fills", accountId] });
    },
  });
}

export function useModifyPosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      positionId,
      modifications,
    }: {
      positionId: string;
      accountId: string;
      modifications: { takeProfit?: number | null; stopLoss?: number | null };
    }) => api.modifyPosition(positionId, modifications),
    onSuccess: (_data, { accountId }) => {
      qc.invalidateQueries({
        queryKey: queryKeys.trading.positions(accountId),
      });
    },
  });
}

export function useCloseAllPositions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (accountId: string) => api.closeAllPositions(accountId),
    onSuccess: (_data, accountId) => {
      qc.invalidateQueries({
        queryKey: queryKeys.trading.positions(accountId),
      });
      qc.invalidateQueries({ queryKey: queryKeys.accounts.detail(accountId) });
    },
  });
}

export function useModifyOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      modifications,
    }: {
      orderId: string;
      accountId: string;
      modifications: {
        price?: number;
        quantity?: number;
        takeProfit?: number | null;
        stopLoss?: number | null;
      };
    }) => api.modifyOrder(orderId, modifications),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({
        queryKey: queryKeys.trading.orders(vars.accountId),
      });
    },
  });
}

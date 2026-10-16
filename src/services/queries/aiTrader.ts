import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { queryKeys } from "./keys";

export function useAiTraderEnabled() {
  return useQuery({
    queryKey: ["ai-trader", "enabled"] as const,
    queryFn: () => api.isAiTraderEnabled(),
    staleTime: 60_000,
    retry: 1,
    refetchOnWindowFocus: true,
  });
}

export function useAiTraderHistory(accountId: string | null) {
  return useQuery({
    queryKey: ["ai-trader", "history", accountId] as const,
    queryFn: () => api.getAiTraderHistory(accountId!),
    enabled: !!accountId,
    staleTime: 30_000,
  });
}

export function useCreateAiTraderPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      accountId: string;
      message: string;
      context?: {
        selectedSymbol?: string;
        timezone?: string;
        deterministicMode?: boolean;
        readOnlyMode?: boolean;
      };
    }) => api.createAiTraderPlan(data),
    onSuccess: (result, vars) => {
      qc.invalidateQueries({
        queryKey: ["ai-trader", "history", vars.accountId],
      });
      // If auto-executed, also refresh trading data
      if ((result as any)?.autoExecuted) {
        qc.invalidateQueries({
          queryKey: queryKeys.trading.positions(vars.accountId),
        });
        qc.invalidateQueries({
          queryKey: queryKeys.trading.orders(vars.accountId),
        });
        qc.invalidateQueries({
          queryKey: queryKeys.accounts.detail(vars.accountId),
        });
      }
    },
  });
}

export function useExecuteAiTraderPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { planId: string; accountId: string; confirm: true }) =>
      api.executeAiTraderPlan(data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({
        queryKey: ["ai-trader", "history", vars.accountId],
      });
      qc.invalidateQueries({
        queryKey: queryKeys.trading.positions(vars.accountId),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.trading.orders(vars.accountId),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.accounts.detail(vars.accountId),
      });
    },
  });
}

export function useClearAiTraderHistory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (accountId: string) => api.clearAiTraderHistory(accountId),
    onSuccess: (_d, accountId) =>
      qc.invalidateQueries({ queryKey: ["ai-trader", "history", accountId] }),
  });
}

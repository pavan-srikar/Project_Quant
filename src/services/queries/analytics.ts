import { useQuery } from "@tanstack/react-query";
import { api } from "../api";

export function useAnalyticsSnapshots(
  accountId: string | null,
  opts?: { startDate?: string; endDate?: string; page?: number; limit?: number },
) {
  return useQuery({
    queryKey: ["analytics", "snapshots", accountId, opts] as const,
    queryFn: () =>
      api.getAnalyticsSnapshots({
        accountId: accountId || undefined,
        ...opts,
      }),
    enabled: !!accountId,
    staleTime: 30_000,
  });
}

export function useAnalyticsAggregate(accountId: string | null) {
  return useQuery({
    queryKey: ["analytics", "aggregate", accountId] as const,
    queryFn: () => api.getAnalyticsAggregate(accountId || undefined),
    enabled: !!accountId,
    staleTime: 30_000,
  });
}

export function usePatternDetection(accountId: string | null, lookbackDays?: number) {
  return useQuery({
    queryKey: ["patterns", accountId, lookbackDays] as const,
    queryFn: () => api.getPatterns(accountId!, lookbackDays),
    enabled: !!accountId,
    staleTime: 60_000,
  });
}

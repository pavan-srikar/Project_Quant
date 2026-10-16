import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { api } from "../api";
import type { AllPayoutsResponse } from "../api/accounts";
import type {
  Account,
  AccountStats,
  EquityPoint,
  LedgerEntry,
} from "../schemas";
import { queryKeys } from "./keys";

export function useMyAccounts(opts?: Partial<UseQueryOptions<Account[]>>) {
  return useQuery<Account[]>({
    queryKey: queryKeys.accounts.mine(),
    queryFn: () => api.getMyAccounts(),
    staleTime: 5_000,
    ...opts,
  });
}

export function useAccount(id: string | null, opts?: Partial<UseQueryOptions<Account>>) {
  return useQuery<Account>({
    queryKey: queryKeys.accounts.detail(id!),
    queryFn: () => api.getAccount(id!),
    enabled: !!id,
    staleTime: 15_000,
    ...opts,
  });
}

export function useAccountStats(id: string | null) {
  return useQuery<AccountStats>({
    queryKey: queryKeys.accounts.stats(id!),
    queryFn: () => api.getAccountStats(id!),
    enabled: !!id,
    staleTime: 10_000,
  });
}

export function useEquityHistory(id: string | null) {
  return useQuery<EquityPoint[]>({
    queryKey: queryKeys.accounts.equity(id!),
    queryFn: () => api.getEquityHistory(id!),
    enabled: !!id,
    staleTime: 5_000,
  });
}

export function useLedger(id: string | null, page = 1) {
  return useQuery<{
    data: LedgerEntry[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>({
    queryKey: queryKeys.accounts.ledger(id!, page),
    queryFn: () => api.getLedger(id!, page),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useAllPayouts() {
  return useQuery<AllPayoutsResponse>({
    queryKey: ["allPayouts"],
    queryFn: () => api.getAllPayouts(),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useAccountMetrics(accountId: string | null) {
  return useQuery({
    queryKey: ["account-metrics", accountId] as const,
    queryFn: () => api.getAccountMetrics(accountId!),
    enabled: !!accountId,
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}

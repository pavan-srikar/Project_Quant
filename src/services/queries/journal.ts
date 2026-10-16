import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import type { JournalEntriesResponse, CreateJournalEntryInput } from "../api/journal";

export function useJournalEntries(accountId: string | null, opts?: { symbol?: string }) {
  return useQuery<JournalEntriesResponse>({
    queryKey: ["journal", accountId, opts?.symbol] as const,
    queryFn: () => api.getJournalEntries(accountId!, { limit: 100, symbol: opts?.symbol }),
    enabled: !!accountId,
    staleTime: 10_000,
  });
}

export function useCreateJournalEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateJournalEntryInput) => api.createJournalEntry(data),
    onSuccess: (_d, vars: any) => qc.invalidateQueries({ queryKey: ["journal", vars?.accountId] }),
  });
}

export function useUpdateJournalEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      accountId: string;
      emotion?: string;
      rating?: number;
      tags?: string[];
      notes?: string;
    }) => api.updateJournalEntry(id, data),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["journal", vars.accountId] }),
  });
}

export function useDeleteJournalEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; accountId: string }) => api.deleteJournalEntry(id),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["journal", vars.accountId] }),
  });
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";

// ── Change Password Mutation ──
export function useChangePassword() {
  return useMutation({
    mutationFn: ({
      currentPassword,
      newPassword,
    }: {
      currentPassword: string;
      newPassword: string;
    }) => api.changePassword(currentPassword, newPassword),
  });
}

// ── Support Tickets ──
export function useMyTickets() {
  return useQuery({
    queryKey: ["my-tickets"],
    queryFn: () => api.getMyTickets(),
    staleTime: 10_000,
  });
}

export function useTicketDetail(id: string | null) {
  return useQuery({
    queryKey: ["ticket", id],
    queryFn: () => api.getTicket(id!),
    enabled: !!id,
    staleTime: 5_000,
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      subject: string;
      message: string;
      category?: string;
      priority?: string;
      accountId?: string | null;
    }) => api.createTicket(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-tickets"] }),
  });
}

export function useReplyToTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      message,
      attachments,
    }: {
      id: string;
      message: string;
      attachments?: string[];
    }) => api.replyToTicket(id, message, attachments),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["ticket", v.id] }),
  });
}

export function useCloseTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.closeTicket(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-tickets"] }),
  });
}

// ── Coupon ──
export function useValidateCoupon() {
  return useMutation({
    mutationFn: (code: string) => api.validateCoupon(code),
  });
}

// ── Firm Branding ──
// Hostname-scoped so visiting the demo site or another firm never contaminates
// a real firm's cached branding.
const FIRM_CACHE_KEY = `propsim:firm-cache:v2:${typeof window !== "undefined" ? window.location.hostname : "ssr"}`;

type CachedFirm = { data: unknown; cachedAt: number };

function readCachedFirm(): unknown | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(FIRM_CACHE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as CachedFirm;
    return parsed?.data;
  } catch {
    return undefined;
  }
}

function writeCachedFirm(data: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      FIRM_CACHE_KEY,
      JSON.stringify({ data, cachedAt: Date.now() } satisfies CachedFirm),
    );
  } catch {
    // ignore quota / privacy-mode errors
  }
}

export function useMyFirm() {
  return useQuery({
    queryKey: ["my-firm"],
    queryFn: async () => {
      const fresh = await api.getMyFirm();
      writeCachedFirm(fresh);
      return fresh;
    },
    staleTime: 300_000,
    gcTime: Infinity,
    // Lazy: only read localStorage once per QueryClient cache miss, not every render.
    initialData: () => readCachedFirm() as Awaited<ReturnType<typeof api.getMyFirm>> | undefined,
    // Treat hydrated cache as stale so we refetch in the background on mount.
    initialDataUpdatedAt: 0,
  });
}

// ── Feature Flags (trader-accessible) ──
export function useFeatureFlags() {
  return useQuery<Record<string, boolean>>({
    queryKey: ["feature-flags"],
    queryFn: () => api.getFeatureFlags(),
    staleTime: 300_000, // cache 5 min — flags rarely change
    retry: 1,
  });
}

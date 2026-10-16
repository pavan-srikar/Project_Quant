import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import type { ReplaySessionResponse } from "../api/accounts";
import type { PnlCalendarResponse } from "@propsim/types";
import { queryKeys } from "./keys";

export * from "./botAndNotifications.ts";

// ─── Public Trader Profiles ──────────────────────────────────────

export function useMyProfile() {
  return useQuery({
    queryKey: ["features", "my-profile"],
    queryFn: () => api.getMyProfile(),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      displayName: string;
      bio?: string;
      avatarUrl?: string;
      isVisible?: boolean;
      showStats?: boolean;
      showEquityCurve?: boolean;
      socialLinks?: Record<string, string>;
    }) => api.updateProfile(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["features", "my-profile"] }),
  });
}

export function usePublicProfiles(page?: number) {
  return useQuery({
    queryKey: ["features", "public-profiles", page],
    queryFn: () => api.getPublicProfiles(page),
  });
}

export function usePublicProfile(userId: string) {
  return useQuery({
    queryKey: ["features", "public-profile", userId],
    queryFn: () => api.getPublicProfile(userId),
    enabled: !!userId,
  });
}

// ─── Scaling Plans ───────────────────────────────────────────────

export function useScalingPlans() {
  return useQuery({
    queryKey: ["features", "scaling-plans"],
    queryFn: () => api.getScalingPlans(),
  });
}

export function useCreateScalingPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      description?: string;
      milestones: Array<{
        targetPnl: number;
        scalePercent: number;
        minDays: number;
        label: string;
      }>;
      isDefault?: boolean;
    }) => api.createScalingPlan(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["features", "scaling-plans"] }),
  });
}

export function useScalingProgress(accountId: string) {
  return useQuery({
    queryKey: ["features", "scaling-progress", accountId],
    queryFn: () => api.getScalingProgress(accountId),
    enabled: !!accountId,
  });
}

export function useEnrollScaling() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { accountId: string; scalingPlanId: string }) =>
      api.enrollScaling(data.accountId, data.scalingPlanId),
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: ["features", "scaling-progress", vars.accountId] }),
  });
}

// ─── Profit Split Escalation ─────────────────────────────────────

export function useProfitSplitConfig() {
  return useQuery({
    queryKey: ["features", "profit-split-config"],
    queryFn: () => api.getProfitSplitConfig(),
  });
}

export function useUpdateProfitSplitConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tiers: Array<{ minPayouts: number; splitPercent: number; label: string }>) =>
      api.updateProfitSplitConfig(tiers),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["features", "profit-split-config"] }),
  });
}

export function useMyProfitSplit() {
  return useQuery({
    queryKey: ["features", "my-profit-split"],
    queryFn: () => api.getMyProfitSplit(),
  });
}

// ─── Account Merge ───────────────────────────────────────────────

export function useRequestAccountMerge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { sourceAccountId: string; targetAccountId: string; reason?: string }) =>
      api.requestAccountMerge(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["features", "merge-requests"] }),
  });
}

export function useMergeRequests() {
  return useQuery({
    queryKey: ["features", "merge-requests"],
    queryFn: () => api.getMergeRequests(),
  });
}

export function useProcessMergeRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: string; status: "APPROVED" | "REJECTED"; adminNotes?: string }) =>
      api.processMergeRequest(data.id, data.status, data.adminNotes),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["features", "merge-requests"] }),
  });
}

// ── Replay Queries ─────────────────────────────────────
export function useReplaySession(accountId: string | null, sessionDate: string | null) {
  return useQuery<ReplaySessionResponse | null>({
    queryKey: queryKeys.replay.session(accountId!, sessionDate!),
    queryFn: () => api.replayGetSession(accountId!, sessionDate!),
    enabled: !!accountId && !!sessionDate,
    // 30s, not Infinity — replaying *today* a second time must pick up trades
    // and candles recorded since the previous run.
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
  });
}

// ── Daily PNL Calendar ─────────────────────────────────
export function useDailyPnl(accountIds: string[], from: string, to: string) {
  return useQuery<PnlCalendarResponse>({
    queryKey: ["daily-pnl", accountIds.slice().sort().join(","), from, to],
    queryFn: () => api.getDailyPnl(accountIds, from, to),
    enabled: accountIds.length > 0 && !!from && !!to,
    staleTime: 60_000,
  });
}

// ── Firm Announcements ──────────────────────────────────

export function useAnnouncements(page = 1) {
  return useQuery({
    queryKey: ["announcements", page] as const,
    queryFn: () => api.getAnnouncements(page),
    staleTime: 30_000,
  });
}

export function useAnnouncementsUnreadCount() {
  return useQuery({
    queryKey: ["announcements", "unread-count"] as const,
    queryFn: () => api.getAnnouncementsUnreadCount(),
    staleTime: 30_000,
    refetchInterval: 60_000, // poll every minute for badge updates
  });
}

export function useMarkAnnouncementRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.markAnnouncementRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["announcements"] });
    },
  });
}

export function useMarkAllAnnouncementsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.markAllAnnouncementsRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["announcements"] });
    },
  });
}

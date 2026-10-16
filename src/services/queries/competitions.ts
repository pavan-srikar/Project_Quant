import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";

// ── Leaderboard & Competitions ──
export function useLeaderboard(period?: string) {
  return useQuery({
    queryKey: ["leaderboard", period],
    queryFn: () => api.getLeaderboard(period),
    staleTime: 30_000,
  });
}

export function useFirmLeaderboard(period?: string) {
  return useQuery({
    queryKey: ["firm-leaderboard", period],
    queryFn: () => api.getFirmLeaderboard(period),
    staleTime: 30_000,
  });
}

export function useLeaderboardStats(period?: string) {
  return useQuery({
    queryKey: ["leaderboard-stats", period],
    queryFn: () => api.getLeaderboardStats(period),
    staleTime: 30_000,
  });
}

export function useLeaderboardPrizes() {
  return useQuery({
    queryKey: ["leaderboard-prizes"],
    queryFn: () => api.getLeaderboardPrizes(),
    staleTime: 60_000,
  });
}

export function useMyLeaderboardRank(period?: string) {
  return useQuery({
    queryKey: ["my-leaderboard-rank", period],
    queryFn: () => api.getMyLeaderboardRank(period),
    staleTime: 15_000,
  });
}

export function useMyAwards() {
  return useQuery({
    queryKey: ["my-awards"],
    queryFn: () => api.getMyAwards(),
    staleTime: 30_000,
  });
}

// ── Competition Enrollment ──
export function useActiveCompetitions() {
  return useQuery({
    queryKey: ["active-competitions"],
    queryFn: () => api.getActiveCompetitions(),
    staleTime: 30_000,
  });
}

export function useMyCompetitionEntries() {
  return useQuery({
    queryKey: ["my-competition-entries"],
    queryFn: () => api.getMyCompetitionEntries(),
    staleTime: 30_000,
  });
}

export function useCompetitionRankings(competitionId: string | undefined, limit?: number) {
  return useQuery({
    queryKey: ["competition-rankings", competitionId, limit],
    queryFn: () => api.getCompetitionRankings(competitionId!, limit),
    enabled: !!competitionId,
    staleTime: 30_000,
  });
}

export function useEnrollInCompetition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (competitionId: string) => api.enrollInCompetition(competitionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["active-competitions"] });
      qc.invalidateQueries({ queryKey: ["my-competition-entries"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

// ── Certificates ──
export function useMyCertificates() {
  return useQuery({
    queryKey: ["my-certificates"],
    queryFn: () => api.getMyCertificates(),
    staleTime: 60_000,
  });
}

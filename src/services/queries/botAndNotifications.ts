import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";

// ─── Bot Activity ────────────────────────────────────────────────

export function useBotActivityLogs(limit = 50) {
  return useQuery({
    queryKey: ["bot-activity", "logs"],
    queryFn: () => api.getBotActivityLogs(limit),
    refetchInterval: 10_000, // Auto-refresh every 10s
    staleTime: 5_000,
  });
}

export function useBotStatus() {
  return useQuery({
    queryKey: ["bot-activity", "status"],
    queryFn: () => api.getBotStatus(),
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
}

export function useConnectBot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.connectBot(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bot-activity"] });
    },
  });
}

export function useDisconnectBot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.disconnectBot(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bot-activity"] });
    },
  });
}

// ─── Push Notifications ──────────────────────────────────────────

export function useVapidPublicKey() {
  return useQuery({
    queryKey: ["push", "vapid-key"],
    queryFn: () => api.getVapidPublicKey(),
    staleTime: Infinity,
  });
}

export function usePushSubscriptions() {
  return useQuery({
    queryKey: ["push", "subscriptions"],
    queryFn: () => api.getPushSubscriptions(),
  });
}

export function useSubscribePush() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sub: { endpoint: string; keys: { p256dh: string; auth: string } }) =>
      api.subscribePush(sub),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["push", "subscriptions"] }),
  });
}

export function useUnsubscribePush() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (endpoint: string) => api.unsubscribePush(endpoint),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["push", "subscriptions"] }),
  });
}

export function useSendTestNotification() {
  return useMutation({
    mutationFn: () => api.sendTestNotification(),
  });
}

// ─── Bot Integrations (Discord/Telegram) ─────────────────────────

export function useBotIntegrations() {
  return useQuery({
    queryKey: ["features", "bot-integrations"],
    queryFn: () => api.getBotIntegrations(),
  });
}

export function useCreateBotIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      platform: "discord" | "telegram";
      webhookUrl?: string;
      chatId?: string;
      botToken?: string;
      events: string[];
    }) => api.createBotIntegration(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["features", "bot-integrations"] }),
  });
}

export function useUpdateBotIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      id: string;
      platform?: "discord" | "telegram";
      webhookUrl?: string;
      chatId?: string;
      botToken?: string;
      events?: string[];
      isEnabled?: boolean;
    }) => api.updateBotIntegration(data.id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["features", "bot-integrations"] }),
  });
}

export function useDeleteBotIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteBotIntegration(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["features", "bot-integrations"] }),
  });
}

export function useTestBotIntegration() {
  return useMutation({
    mutationFn: (id: string) => api.testBotIntegration(id),
  });
}

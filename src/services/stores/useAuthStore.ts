import { create } from "zustand";
import { api } from "../api.ts";
import { wsClient } from "../ws.ts";
import type { User } from "../schemas.ts";

export type LoginMfaResponse = {
  mfaRequired: true;
  mfaToken: string;
  userId: string;
};

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isDemo: boolean;
  mfaPending: { mfaToken: string; userId: string } | null;
  login: (email: string, password: string) => Promise<void>;
  googleLogin: (credential: string, firmSlug: string) => Promise<void>;
  demoLogin: () => Promise<void>;
  completeMfa: (code: string) => Promise<void>;
  cancelMfa: () => void;
  logout: () => void;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: localStorage.getItem("access_token"),
  refreshToken: localStorage.getItem("refresh_token"),
  user: JSON.parse(localStorage.getItem("user") || "null"),
  isDemo: localStorage.getItem("is_demo") === "true",
  mfaPending: null,

  login: async (email, password) => {
    const data = await api.login(email, password);
    // Check if MFA is required
    if ("mfaRequired" in data && data.mfaRequired) {
      const mfaData = data as unknown as LoginMfaResponse;
      set({
        mfaPending: {
          mfaToken: mfaData.mfaToken,
          userId: mfaData.userId,
        },
      });
      return;
    }
    localStorage.setItem("access_token", data.accessToken);
    localStorage.setItem("refresh_token", data.refreshToken);
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.removeItem("is_demo");
    set({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.user,
      isDemo: false,
      mfaPending: null,
    });
    wsClient.connect(data.accessToken);
  },

  googleLogin: async (credential, firmSlug) => {
    const BASE = import.meta.env.VITE_API_URL || "";
    const res = await fetch(`${BASE}/api/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential, firmSlug }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error?.message || "Google login failed");
    const data = json?.data ?? json;
    localStorage.setItem("access_token", data.accessToken);
    localStorage.setItem("refresh_token", data.refreshToken);
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.removeItem("is_demo");
    set({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.user,
      isDemo: false,
      mfaPending: null,
    });
    wsClient.connect(data.accessToken);
  },

  demoLogin: async () => {
    // Clear any stale account selection from a previous session
    localStorage.removeItem("active_account");
    // Force dark mode for demo
    localStorage.setItem("theme", "dark");
    const data = await api.demoLogin();
    localStorage.setItem("access_token", data.accessToken);
    localStorage.setItem("refresh_token", data.refreshToken);
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("is_demo", "true");
    set({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.user,
      isDemo: true,
      mfaPending: null,
    });
    wsClient.connect(data.accessToken);
  },

  completeMfa: async (code) => {
    const pending = get().mfaPending;
    if (!pending) throw new Error("No MFA pending");
    const data = await api.completeMfaLogin(pending.mfaToken, code);
    localStorage.setItem("access_token", data.accessToken);
    localStorage.setItem("refresh_token", data.refreshToken);
    localStorage.setItem("user", JSON.stringify(data.user));
    set({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.user,
      mfaPending: null,
    });
    wsClient.connect(data.accessToken);
  },

  cancelMfa: () => {
    set({ mfaPending: null });
  },

  logout: () => {
    // AUTH-VULN-06/07: Send refresh token to server for proper revocation
    const rt = localStorage.getItem("refresh_token");
    api.logout(rt || undefined).catch(() => {});
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    localStorage.removeItem("is_demo");
    localStorage.removeItem("active_account");
    set({ accessToken: null, refreshToken: null, user: null, isDemo: false });
    wsClient.disconnect();
  },

  restoreSession: async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const rt = localStorage.getItem("refresh_token");
    if (rt && isTokenStale(token)) {
      try {
        const result = await api.refreshToken(rt);
        localStorage.setItem("access_token", result.accessToken);
        localStorage.setItem("refresh_token", result.refreshToken);
        set({ accessToken: result.accessToken, refreshToken: result.refreshToken });
        wsClient.connect(result.accessToken);
        startTokenRefresh();
      } catch {
        get().logout();
      }
      return;
    }
    wsClient.connect(token);
    if (rt) startTokenRefresh();
  },
}));

// Silent token refresh - refresh 60s before expiry
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

export function isTokenStale(token: string, thresholdMs = 5 * 60 * 1000): boolean {
  if (!token || !token.includes(".")) return false;
  try {
    const parts = token.split(".");
    if (parts.length < 2 || !parts[1]) return false;
    const payload = JSON.parse(atob(parts[1]));
    return payload.exp * 1000 - Date.now() < thresholdMs;
  } catch {
    return true;
  }
}

export function getTokenExpiresIn(token: string): number {
  if (!token || !token.includes(".")) return 13 * 60 * 1000;
  try {
    const parts = token.split(".");
    if (parts.length < 2 || !parts[1]) return 13 * 60 * 1000;
    const payload = JSON.parse(atob(parts[1]));
    const exp = payload.exp;
    if (typeof exp !== "number") return 13 * 60 * 1000; // fallback
    const msRemaining = exp * 1000 - Date.now();
    return Math.max(msRemaining - 60_000, 60_000);
  } catch {
    return 13 * 60 * 1000;
  }
}

export function startTokenRefresh() {
  stopTokenRefresh();

  let retries = 0;
  const MAX_RETRIES = 3;

  const doRefresh = async () => {
    const rt = localStorage.getItem("refresh_token");
    if (!rt) return;
    try {
      const result = await api.refreshToken(rt);
      retries = 0; // reset on success
      localStorage.setItem("access_token", result.accessToken);
      localStorage.setItem("refresh_token", result.refreshToken);
      useAuthStore.setState({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
      wsClient.reauthenticate(result.accessToken);
      const nextDelay = getTokenExpiresIn(result.accessToken);
      refreshTimer = setTimeout(doRefresh, nextDelay);
    } catch {
      retries++;
      if (retries <= MAX_RETRIES) {
        const backoff = retries * 5_000;
        refreshTimer = setTimeout(doRefresh, backoff);
      } else {
        useAuthStore.getState().logout();
      }
    }
  };

  const currentToken = localStorage.getItem("access_token");
  const firstDelay = currentToken ? getTokenExpiresIn(currentToken) : 13 * 60 * 1000;
  refreshTimer = setTimeout(doRefresh, firstDelay);
}

export function stopTokenRefresh() {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

import { create } from "zustand";
import { api } from "./api.ts";
import { wsClient } from "./ws.ts";
import type { Account, Order, Position, Symbol, User } from "./schemas.ts";

type LoginMfaResponse = {
  mfaRequired: true;
  mfaToken: string;
  userId: string;
};

// ── Auth Store ──────────────────────────────────────────────
interface AuthState {
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
    // If the token is expired or within 5 minutes of expiry, refresh immediately
    // rather than waiting for the scheduler (which floors at 60s and won't help
    // a token that's already dead after the phone was locked).
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

function isTokenStale(token: string, thresholdMs = 5 * 60 * 1000): boolean {
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

// BUG-63 FIX: Calculate time-to-expiry from the JWT so the first refresh
// fires before the token actually expires, not on a blind 13-min interval.
// Floor is 60s — never refresh more often than once a minute, even if the
// token expiry math returns something tiny (clock skew, short-TTL token).
// Refreshing tighter than that just trips the gateway rate-limiter and
// cascades into a forced logout.
function getTokenExpiresIn(token: string): number {
  if (!token || !token.includes(".")) return 13 * 60 * 1000;
  try {
    const parts = token.split(".");
    if (parts.length < 2 || !parts[1]) return 13 * 60 * 1000;
    const payload = JSON.parse(atob(parts[1]));
    const exp = payload.exp;
    if (typeof exp !== "number") return 13 * 60 * 1000; // fallback
    const msRemaining = exp * 1000 - Date.now();
    // Refresh 60 seconds before expiry, with a hard floor of 60s.
    return Math.max(msRemaining - 60_000, 60_000);
  } catch {
    return 13 * 60 * 1000; // fallback: 13 minutes
  }
}

function startTokenRefresh() {
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
      // Schedule next refresh based on new token's expiry
      const nextDelay = getTokenExpiresIn(result.accessToken);
      refreshTimer = setTimeout(doRefresh, nextDelay);
    } catch {
      retries++;
      if (retries <= MAX_RETRIES) {
        // Retry after a short backoff instead of logging out immediately
        const backoff = retries * 5_000; // 5s, 10s, 15s
        refreshTimer = setTimeout(doRefresh, backoff);
      } else {
        // All retries exhausted — force logout
        useAuthStore.getState().logout();
      }
    }
  };

  // Schedule first refresh based on current token's actual expiry
  const currentToken = localStorage.getItem("access_token");
  const firstDelay = currentToken ? getTokenExpiresIn(currentToken) : 13 * 60 * 1000;
  refreshTimer = setTimeout(doRefresh, firstDelay);
}

function stopTokenRefresh() {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

// ── Trading Store ───────────────────────────────────────────
interface CandleBar {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
}

export type TickEntry = {
  bid: number;
  ask: number;
  timestamp: number;
  /** Pre-formatted with symbol-correct decimal places — avoids toFixed() during renders */
  bidFmt: string;
  askFmt: string;
};

// RAF tick buffers — batch all WS ticks arriving in one frame into a single set()
const _pendingTicks = new Map<string, TickEntry>();
let _tickRafId: number | null = null;
const _pendingLiveTicks = new Map<string, TickEntry>();
let _liveTickRafId: number | null = null;

/** Per-symbol decimal precision cache — populated on first tick, avoids O(n) symbol lookup per tick */
const _symbolDecimals = new Map<string, number>();
function _pipDecimals(tickSize?: number | null): number {
  if (!tickSize) return 5;
  const s = String(tickSize);
  const dot = s.indexOf(".");
  return dot >= 0 ? s.length - dot - 1 : 2;
}

export interface UserWatchlist {
  id: string;
  name: string;
  symbols: string[];
}

const DEFAULT_WATCHLIST_SYMBOLS = ["BTCUSD", "ETHUSD", "SOLUSD", "BNBUSD", "XRPUSD", "ADAUSD"];

function loadWatchlists(): UserWatchlist[] {
  try {
    const raw = localStorage.getItem("oc_user_watchlists");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((w: any, idx: number) => ({
          id: String(w.id || `wl_${idx}`),
          name: String(w.name || `Watchlist ${idx + 1}`),
          symbols: Array.isArray(w.symbols) ? w.symbols.filter((s: any) => typeof s === "string") : [],
        }));
      }
    }
    // Migration: check old single watchlist
    const oldRaw = localStorage.getItem("oc_user_watchlist");
    if (oldRaw) {
      const oldParsed = JSON.parse(oldRaw);
      if (Array.isArray(oldParsed) && oldParsed.length > 0) {
        const symbols = oldParsed.filter((s) => typeof s === "string" && s.length > 0);
        const migrated: UserWatchlist[] = [
          { id: "main", name: "Main", symbols },
        ];
        localStorage.setItem("oc_user_watchlists", JSON.stringify(migrated));
        return migrated;
      }
    }
  } catch {
    /* ignore */
  }
  const fallback: UserWatchlist[] = [
    { id: "main", name: "Main", symbols: DEFAULT_WATCHLIST_SYMBOLS },
  ];
  try {
    localStorage.setItem("oc_user_watchlists", JSON.stringify(fallback));
  } catch {}
  return fallback;
}

function loadActiveWatchlistId(watchlists: UserWatchlist[]): string {
  try {
    const saved = localStorage.getItem("oc_active_watchlist_id");
    if (saved && watchlists.some((w) => w.id === saved)) {
      return saved;
    }
  } catch {}
  return watchlists[0]?.id || "main";
}

function loadFlaggedSymbols(): string[] {
  try {
    const raw = localStorage.getItem("oc_flagged_symbols");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((s) => typeof s === "string");
      }
    }
    // Migration from old watchlist_favorites
    const favRaw = localStorage.getItem("watchlist_favorites");
    if (favRaw) {
      const favParsed = JSON.parse(favRaw);
      if (Array.isArray(favParsed)) {
        return favParsed.filter((s) => typeof s === "string");
      }
    }
  } catch {}
  return [];
}

const initialWatchlists = loadWatchlists();
const initialActiveWatchlistId = loadActiveWatchlistId(initialWatchlists);
const initialActiveList = initialWatchlists.find((w) => w.id === initialActiveWatchlistId) || initialWatchlists[0];

interface TradingState {
  activeAccountId: string | null;
  accounts: Account[];
  positions: Position[];
  orders: Order[];
  symbols: Symbol[];
  selectedSymbol: string;
  watchlists: UserWatchlist[];
  activeWatchlistId: string;
  flaggedSymbols: string[];
  watchlistSymbols: string[];
  /** Delayed ticks — HFT lag applied; what the account "sees" */
  ticks: Record<string, TickEntry>;
  /** Live (undelayed) ticks — pushed as HftLiveTick by ws-handler for HFT clients.
   *  Empty for non-HFT users. Replaces the 500ms REST poll for gap detection. */
  liveTicks: Record<string, TickEntry>;
  /** Latest WS candle update keyed by "symbol:timeframe" */
  liveCandleUpdates: Record<string, CandleBar>;
  /** Monotonic counter bumped on each ReplayStateChanged event — included in
   *  the candle query key so React Query treats every replay session as a
   *  brand-new query, eliminating any stale-data / structural-sharing issues. */
  replayVersion: number;
  /** Whether the market-data adapter is currently in replay mode (started, paused, or playing). */
  isReplaying: boolean;
  /** True only when replay is active but paused. */
  replayPaused: boolean;
  /** Current playback speed multiplier. */
  replaySpeed: number;
  /** Cursor position in the replay timeline (epoch ms). */
  replayCursorTimestamp: number | null;
  /** Session date (YYYY-MM-DD) of the active replay, set when replay starts. */
  replaySessionDate: string | null;

  setActiveAccount: (id: string) => void;
  loadAccounts: () => Promise<void>;
  updateAccountInStore: (updated: Partial<Account> & Pick<Account, "id">) => void;
  loadPositions: () => Promise<void>;
  loadOrders: () => Promise<void>;
  loadSymbols: () => Promise<void>;
  createWatchlist: (name: string) => string;
  renameWatchlist: (id: string, name: string) => void;
  deleteWatchlist: (id: string) => void;
  setActiveWatchlist: (id: string) => void;
  toggleFlagSymbol: (symbolName: string) => void;
  addToWatchlist: (symbolName: string, watchlistId?: string) => void;
  removeFromWatchlist: (symbolName: string, watchlistId?: string) => void;
  reorderWatchlist: (symbols: string[], watchlistId?: string) => void;
  updateTick: (symbolName: string, bid: number, ask: number, timestamp: number) => void;
  updateLiveTick: (symbolName: string, bid: number, ask: number, timestamp: number) => void;
  updateCandleFromWs: (symbol: string, timeframe: string, bar: CandleBar) => void;
  setSelectedSymbol: (symbol: string) => void;
  setPositions: (positions: Position[]) => void;
  setOrders: (orders: Order[]) => void;
  setReplaySessionDate: (date: string | null) => void;
  /** Bump replay version and update replay state — call on ReplayStateChanged WS events */
  onReplayStateChanged: (
    action: string,
    opts?: { speed?: number; cursorTimestamp?: number },
  ) => void;
}

export const useTradingStore = create<TradingState>((set, get) => ({
  activeAccountId: localStorage.getItem("active_account"),
  accounts: [],
  positions: [],
  orders: [],
  symbols: [],
  selectedSymbol: "BTCUSD",
  watchlists: initialWatchlists,
  activeWatchlistId: initialActiveWatchlistId,
  flaggedSymbols: loadFlaggedSymbols(),
  watchlistSymbols: initialActiveList?.symbols || DEFAULT_WATCHLIST_SYMBOLS,
  ticks: {},
  liveTicks: {},
  liveCandleUpdates: {},
  replayVersion: 0,
  isReplaying: false,
  replayPaused: false,
  replaySpeed: 1,
  replayCursorTimestamp: null,
  replaySessionDate: null,

  setActiveAccount: (id) => {
    localStorage.setItem("active_account", id);
    set({ activeAccountId: id });
  },

  loadAccounts: async () => {
    const accounts = await api.getMyAccounts();
    set({ accounts });
    const currentId = get().activeAccountId;
    // Auto-select first account if none selected OR if current selection isn't in the list
    const currentValid = currentId && accounts.some((account) => account.id === currentId);
    if (!currentValid && accounts.length > 0) {
      const firstAccountId = accounts[0]?.id;
      if (firstAccountId) get().setActiveAccount(firstAccountId);
    }
    // Register all account IDs with the WS client so EquityUpdated events are received
    wsClient.subscribeAccounts(accounts.map((account) => account.id));
  },

  updateAccountInStore: (updated) => {
    set((state) => ({
      accounts: state.accounts.map((account) =>
        account.id === updated.id ? { ...account, ...updated } : account,
      ),
    }));
  },

  loadPositions: async () => {
    const id = get().activeAccountId;
    if (!id) return;
    const positions = await api.getPositions(id);
    set({ positions });
  },

  loadOrders: async () => {
    const id = get().activeAccountId;
    if (!id) return;
    const orders = await api.getOrders(id);
    set({ orders });
  },

  loadSymbols: async () => {
    const symbols = await api.getSymbols();
    set({ symbols });
  },

  createWatchlist: (name) => {
    const trimmed = name.trim() || `Watchlist ${get().watchlists.length + 1}`;
    const id = `wl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newList: UserWatchlist = { id, name: trimmed, symbols: [] };
    set((state) => {
      const nextLists = [...state.watchlists, newList];
      try {
        localStorage.setItem("oc_user_watchlists", JSON.stringify(nextLists));
        localStorage.setItem("oc_active_watchlist_id", id);
        localStorage.setItem("oc_user_watchlist", JSON.stringify([]));
      } catch {}
      return {
        watchlists: nextLists,
        activeWatchlistId: id,
        watchlistSymbols: [],
      };
    });
    return id;
  },

  renameWatchlist: (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    set((state) => {
      const nextLists = state.watchlists.map((w) =>
        w.id === id ? { ...w, name: trimmed } : w,
      );
      try {
        localStorage.setItem("oc_user_watchlists", JSON.stringify(nextLists));
      } catch {}
      return { watchlists: nextLists };
    });
  },

  deleteWatchlist: (id) => {
    set((state) => {
      if (state.watchlists.length <= 1) return state;
      const nextLists = state.watchlists.filter((w) => w.id !== id);
      let nextActiveId = state.activeWatchlistId;
      if (nextActiveId === id) {
        nextActiveId = nextLists[0]?.id || "main";
      }
      const activeList = nextLists.find((w) => w.id === nextActiveId) || nextLists[0];
      const activeSymbols = activeList?.symbols || [];
      try {
        localStorage.setItem("oc_user_watchlists", JSON.stringify(nextLists));
        localStorage.setItem("oc_active_watchlist_id", nextActiveId);
        localStorage.setItem("oc_user_watchlist", JSON.stringify(activeSymbols));
      } catch {}
      return {
        watchlists: nextLists,
        activeWatchlistId: nextActiveId,
        watchlistSymbols: activeSymbols,
      };
    });
  },

  setActiveWatchlist: (id) => {
    set((state) => {
      const target = state.watchlists.find((w) => w.id === id);
      if (!target) return state;
      try {
        localStorage.setItem("oc_active_watchlist_id", id);
        localStorage.setItem("oc_user_watchlist", JSON.stringify(target.symbols));
      } catch {}
      return {
        activeWatchlistId: id,
        watchlistSymbols: target.symbols,
      };
    });
  },

  toggleFlagSymbol: (symbolName) => {
    set((state) => {
      const exists = state.flaggedSymbols.includes(symbolName);
      const next = exists
        ? state.flaggedSymbols.filter((s) => s !== symbolName)
        : [...state.flaggedSymbols, symbolName];
      try {
        localStorage.setItem("oc_flagged_symbols", JSON.stringify(next));
      } catch {}
      return { flaggedSymbols: next };
    });
  },

  addToWatchlist: (symbolName, targetWatchlistId) => {
    set((state) => {
      const targetId = targetWatchlistId || state.activeWatchlistId;
      const nextLists = state.watchlists.map((w) => {
        if (w.id !== targetId) return w;
        if (w.symbols.includes(symbolName)) return w;
        return { ...w, symbols: [...w.symbols, symbolName] };
      });
      const currentActive = nextLists.find((w) => w.id === state.activeWatchlistId);
      const activeSymbols = currentActive ? currentActive.symbols : state.watchlistSymbols;
      try {
        localStorage.setItem("oc_user_watchlists", JSON.stringify(nextLists));
        localStorage.setItem("oc_user_watchlist", JSON.stringify(activeSymbols));
      } catch {}
      return {
        watchlists: nextLists,
        watchlistSymbols: activeSymbols,
      };
    });
  },

  removeFromWatchlist: (symbolName, targetWatchlistId) => {
    set((state) => {
      const targetId = targetWatchlistId || state.activeWatchlistId;
      const nextLists = state.watchlists.map((w) => {
        if (w.id !== targetId) return w;
        return { ...w, symbols: w.symbols.filter((s) => s !== symbolName) };
      });
      const currentActive = nextLists.find((w) => w.id === state.activeWatchlistId);
      const activeSymbols = currentActive ? currentActive.symbols : state.watchlistSymbols;
      try {
        localStorage.setItem("oc_user_watchlists", JSON.stringify(nextLists));
        localStorage.setItem("oc_user_watchlist", JSON.stringify(activeSymbols));
      } catch {}
      return {
        watchlists: nextLists,
        watchlistSymbols: activeSymbols,
      };
    });
  },

  reorderWatchlist: (newOrder, targetWatchlistId) => {
    set((state) => {
      const targetId = targetWatchlistId || state.activeWatchlistId;
      const nextLists = state.watchlists.map((w) => {
        if (w.id !== targetId) return w;
        return { ...w, symbols: newOrder };
      });
      const currentActive = nextLists.find((w) => w.id === state.activeWatchlistId);
      const activeSymbols = currentActive ? currentActive.symbols : state.watchlistSymbols;
      try {
        localStorage.setItem("oc_user_watchlists", JSON.stringify(nextLists));
        localStorage.setItem("oc_user_watchlist", JSON.stringify(activeSymbols));
      } catch {}
      return {
        watchlists: nextLists,
        watchlistSymbols: activeSymbols,
      };
    });
  },

  updateTick: (symbolName, bid, ask, timestamp) => {
    // 1. Check pending buffer (same-frame dedup with timestamp awareness)
    const pending = _pendingTicks.get(symbolName);
    if (pending && pending.bid === bid && pending.ask === ask && pending.timestamp >= timestamp)
      return;
    // 2. When buffer is empty, also check committed state (cross-RAF dedup — prevents redundant flush)
    if (!pending) {
      const committed = get().ticks[symbolName];
      if (
        committed &&
        committed.bid === bid &&
        committed.ask === ask &&
        committed.timestamp >= timestamp
      )
        return;
    }
    // 3. Resolve symbol-correct decimal precision (cached after first hit)
    if (!_symbolDecimals.has(symbolName)) {
      const sym = get().symbols.find((s) => s.name === symbolName);
      if (sym) _symbolDecimals.set(symbolName, _pipDecimals(sym.tickSize));
    }
    const decimals = _symbolDecimals.get(symbolName) ?? 5;
    _pendingTicks.set(symbolName, {
      bid,
      ask,
      timestamp,
      bidFmt: bid.toFixed(decimals),
      askFmt: ask.toFixed(decimals),
    });
    if (_tickRafId === null) {
      _tickRafId = requestAnimationFrame(() => {
        const updates = Object.fromEntries(_pendingTicks);
        // Clear BEFORE set() so any tick that arrives synchronously inside a Zustand
        // subscriber during set() goes into a fresh buffer and gets its own RAF.
        _pendingTicks.clear();
        _tickRafId = null;
        set((s) => ({ ticks: { ...s.ticks, ...updates } }));
      });
    }
  },

  updateLiveTick: (symbolName, bid, ask, timestamp) => {
    const pending = _pendingLiveTicks.get(symbolName);
    if (pending && pending.bid === bid && pending.ask === ask && pending.timestamp >= timestamp)
      return;
    if (!pending) {
      const committed = get().liveTicks[symbolName];
      if (
        committed &&
        committed.bid === bid &&
        committed.ask === ask &&
        committed.timestamp >= timestamp
      )
        return;
    }
    if (!_symbolDecimals.has(symbolName)) {
      const sym = get().symbols.find((s) => s.name === symbolName);
      if (sym) _symbolDecimals.set(symbolName, _pipDecimals(sym.tickSize));
    }
    const decimals = _symbolDecimals.get(symbolName) ?? 5;
    _pendingLiveTicks.set(symbolName, {
      bid,
      ask,
      timestamp,
      bidFmt: bid.toFixed(decimals),
      askFmt: ask.toFixed(decimals),
    });
    if (_liveTickRafId === null) {
      _liveTickRafId = requestAnimationFrame(() => {
        const updates = Object.fromEntries(_pendingLiveTicks);
        _pendingLiveTicks.clear();
        _liveTickRafId = null;
        set((s) => ({ liveTicks: { ...s.liveTicks, ...updates } }));
      });
    }
  },

  updateCandleFromWs: (symbol, timeframe, bar) => {
    const key = `${symbol}:${timeframe}`;
    set((state) => ({
      liveCandleUpdates: { ...state.liveCandleUpdates, [key]: bar },
    }));
  },

  setSelectedSymbol: (symbol) =>
    set((state) =>
      state.selectedSymbol === symbol
        ? { selectedSymbol: symbol }
        : { selectedSymbol: symbol, liveCandleUpdates: {} },
    ),
  setPositions: (positions) => set({ positions }),
  setOrders: (orders) => set({ orders }),
  setReplaySessionDate: (date) => set({ replaySessionDate: date }),

  onReplayStateChanged: (action, opts) => {
    set((state) => nextReplayState(state, action, opts));
  },
}));

/**
 * Play/pause state after a replay action. Seek and speed changes must not
 * alter it — a seek while paused stays paused; only transport actions and
 * stop change the flag.
 */
function replayPausedAfter(action: string, prevPaused: boolean): boolean {
  if (action === "stopped" || action === "started" || action === "resumed") return false;
  if (action === "paused") return true;
  return prevPaused;
}

function nextReplayState(
  state: Pick<
    TradingState,
    "replayVersion" | "replayPaused" | "replaySpeed" | "replayCursorTimestamp" | "replaySessionDate"
  >,
  action: string,
  opts?: { speed?: number; cursorTimestamp?: number },
): Partial<TradingState> {
  const isStopped = action === "stopped";
  return {
    replayVersion: state.replayVersion + 1,
    isReplaying: !isStopped,
    replayPaused: replayPausedAfter(action, state.replayPaused),
    replaySpeed: isStopped ? 1 : (opts?.speed ?? state.replaySpeed),
    replayCursorTimestamp: isStopped
      ? null
      : (opts?.cursorTimestamp ?? state.replayCursorTimestamp),
    replaySessionDate: isStopped ? null : state.replaySessionDate,
    liveCandleUpdates: {},
  };
}

// Re-register account IDs on every WS (re)connect so sensitive-channel
// subscriptions (positions/orders/account/ledger) never go out with an empty
// accountIds filter after a reconnect, network blip, or token rotation.
let wasWsConnected = wsClient.state === "connected";
wsClient.onStateChange((state) => {
  if (state === "connected" && !wasWsConnected) {
    const accountIds = useTradingStore.getState().accounts.map((a) => a.id);
    if (accountIds.length > 0) wsClient.subscribeAccounts(accountIds);
  }
  wasWsConnected = state === "connected";
});

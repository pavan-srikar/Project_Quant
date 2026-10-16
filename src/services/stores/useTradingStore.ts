import { create } from "zustand";
import { api } from "../api.ts";
import { wsClient } from "../ws.ts";
import type { Account, Order, Position, Symbol } from "../schemas.ts";
import { createWatchlistSlice, type WatchlistSlice } from "./watchlistSlice.ts";
import {
  type TickEntry,
  _pendingTicks,
  _pendingLiveTicks,
  _symbolDecimals,
  _pipDecimals,
} from "./useTickStore.ts";

export interface CandleBar {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
}

let _tickRafId: number | null = null;
let _liveTickRafId: number | null = null;

export interface TradingState extends WatchlistSlice {
  activeAccountId: string | null;
  accounts: Account[];
  positions: Position[];
  orders: Order[];
  symbols: Symbol[];
  selectedSymbol: string;
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
  ...createWatchlistSlice(set, get),

  activeAccountId: localStorage.getItem("active_account"),
  accounts: [],
  positions: [],
  orders: [],
  symbols: [],
  selectedSymbol: "BTCUSD",
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

  updateTick: (symbolName, bid, ask, timestamp) => {
    const pending = _pendingTicks.get(symbolName);
    if (pending && pending.bid === bid && pending.ask === ask && pending.timestamp >= timestamp)
      return;
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

let wasWsConnected = wsClient.state === "connected";
wsClient.onStateChange((state) => {
  if (state === "connected" && !wasWsConnected) {
    const accountIds = useTradingStore.getState().accounts.map((a) => a.id);
    if (accountIds.length > 0) wsClient.subscribeAccounts(accountIds);
  }
  wasWsConnected = state === "connected";
});

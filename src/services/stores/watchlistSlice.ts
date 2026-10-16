import type { UserWatchlist } from "./watchlistStorage.ts";
import {
  DEFAULT_WATCHLIST_SYMBOLS,
  loadWatchlists,
  loadActiveWatchlistId,
  loadFlaggedSymbols,
} from "./watchlistStorage.ts";

export interface WatchlistSlice {
  watchlists: UserWatchlist[];
  activeWatchlistId: string;
  flaggedSymbols: string[];
  watchlistSymbols: string[];
  createWatchlist: (name: string) => string;
  renameWatchlist: (id: string, name: string) => void;
  deleteWatchlist: (id: string) => void;
  setActiveWatchlist: (id: string) => void;
  toggleFlagSymbol: (symbolName: string) => void;
  addToWatchlist: (symbolName: string, watchlistId?: string) => void;
  removeFromWatchlist: (symbolName: string, watchlistId?: string) => void;
  reorderWatchlist: (symbols: string[], watchlistId?: string) => void;
}

export function createWatchlistSlice(
  set: (fn: (state: any) => any) => void,
  get: () => any,
): WatchlistSlice {
  const initialWatchlists = loadWatchlists();
  const initialActiveWatchlistId = loadActiveWatchlistId(initialWatchlists);
  const initialActiveList =
    initialWatchlists.find((w) => w.id === initialActiveWatchlistId) || initialWatchlists[0];

  return {
    watchlists: initialWatchlists,
    activeWatchlistId: initialActiveWatchlistId,
    flaggedSymbols: loadFlaggedSymbols(),
    watchlistSymbols: initialActiveList?.symbols || DEFAULT_WATCHLIST_SYMBOLS,

    createWatchlist: (name: string) => {
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

    renameWatchlist: (id: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      set((state) => {
        const nextLists = state.watchlists.map((w: UserWatchlist) =>
          w.id === id ? { ...w, name: trimmed } : w,
        );
        try {
          localStorage.setItem("oc_user_watchlists", JSON.stringify(nextLists));
        } catch {}
        return { watchlists: nextLists };
      });
    },

    deleteWatchlist: (id: string) => {
      set((state) => {
        if (state.watchlists.length <= 1) return state;
        const nextLists = state.watchlists.filter((w: UserWatchlist) => w.id !== id);
        let nextActiveId = state.activeWatchlistId;
        if (nextActiveId === id) {
          nextActiveId = nextLists[0]?.id || "main";
        }
        const activeList = nextLists.find((w: UserWatchlist) => w.id === nextActiveId) || nextLists[0];
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

    setActiveWatchlist: (id: string) => {
      set((state) => {
        const target = state.watchlists.find((w: UserWatchlist) => w.id === id);
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

    toggleFlagSymbol: (symbolName: string) => {
      set((state) => {
        const exists = state.flaggedSymbols.includes(symbolName);
        const next = exists
          ? state.flaggedSymbols.filter((s: string) => s !== symbolName)
          : [...state.flaggedSymbols, symbolName];
        try {
          localStorage.setItem("oc_flagged_symbols", JSON.stringify(next));
        } catch {}
        return { flaggedSymbols: next };
      });
    },

    addToWatchlist: (symbolName: string, targetWatchlistId?: string) => {
      set((state) => {
        const targetId = targetWatchlistId || state.activeWatchlistId;
        const nextLists = state.watchlists.map((w: UserWatchlist) => {
          if (w.id !== targetId) return w;
          if (w.symbols.includes(symbolName)) return w;
          return { ...w, symbols: [...w.symbols, symbolName] };
        });
        const currentActive = nextLists.find((w: UserWatchlist) => w.id === state.activeWatchlistId);
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

    removeFromWatchlist: (symbolName: string, targetWatchlistId?: string) => {
      set((state) => {
        const targetId = targetWatchlistId || state.activeWatchlistId;
        const nextLists = state.watchlists.map((w: UserWatchlist) => {
          if (w.id !== targetId) return w;
          return { ...w, symbols: w.symbols.filter((s: string) => s !== symbolName) };
        });
        const currentActive = nextLists.find((w: UserWatchlist) => w.id === state.activeWatchlistId);
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

    reorderWatchlist: (newOrder: string[], targetWatchlistId?: string) => {
      set((state) => {
        const targetId = targetWatchlistId || state.activeWatchlistId;
        const nextLists = state.watchlists.map((w: UserWatchlist) => {
          if (w.id !== targetId) return w;
          return { ...w, symbols: newOrder };
        });
        const currentActive = nextLists.find((w: UserWatchlist) => w.id === state.activeWatchlistId);
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
  };
}

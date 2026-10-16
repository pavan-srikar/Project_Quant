export interface UserWatchlist {
  id: string;
  name: string;
  symbols: string[];
}

export const DEFAULT_WATCHLIST_SYMBOLS = [
  "BTCUSD",
  "ETHUSD",
  "SOLUSD",
  "BNBUSD",
  "XRPUSD",
  "ADAUSD",
];

export function loadWatchlists(): UserWatchlist[] {
  try {
    const raw = localStorage.getItem("oc_user_watchlists");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((w: any, idx: number) => ({
          id: String(w.id || `wl_${idx}`),
          name: String(w.name || `Watchlist ${idx + 1}`),
          symbols: Array.isArray(w.symbols)
            ? w.symbols.filter((s: any) => typeof s === "string")
            : [],
        }));
      }
    }
    // Migration: check old single watchlist
    const oldRaw = localStorage.getItem("oc_user_watchlist");
    if (oldRaw) {
      const oldParsed = JSON.parse(oldRaw);
      if (Array.isArray(oldParsed) && oldParsed.length > 0) {
        const symbols = oldParsed.filter((s: any) => typeof s === "string" && s.length > 0);
        const migrated: UserWatchlist[] = [{ id: "main", name: "Main", symbols }];
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

export function loadActiveWatchlistId(watchlists: UserWatchlist[]): string {
  try {
    const saved = localStorage.getItem("oc_active_watchlist_id");
    if (saved && watchlists.some((w) => w.id === saved)) {
      return saved;
    }
  } catch {}
  return watchlists[0]?.id || "main";
}

export function loadFlaggedSymbols(): string[] {
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

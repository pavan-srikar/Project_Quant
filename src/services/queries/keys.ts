// ── Query Key Factories ─────────────────────────────────
export const queryKeys = {
  accounts: {
    all: ["accounts"] as const,
    mine: () => [...queryKeys.accounts.all, "mine"] as const,
    detail: (id: string) => [...queryKeys.accounts.all, id] as const,
    stats: (id: string) => [...queryKeys.accounts.all, id, "stats"] as const,
    ledger: (id: string, page: number) => [...queryKeys.accounts.all, id, "ledger", page] as const,
    equity: (id: string) => [...queryKeys.accounts.all, id, "equity"] as const,
  },
  trading: {
    positions: (accountId: string) => ["positions", accountId] as const,
    orders: (accountId: string, status?: string) => ["orders", accountId, status] as const,
    fills: (accountId: string, page: number) => ["fills", accountId, page] as const,
    closedPositions: (accountId: string, page: number) =>
      ["closedPositions", accountId, page] as const,
  },
  market: {
    symbols: ["symbols"] as const,
    candles: (symbol: string, tf: string) => ["candles", symbol, tf] as const,
    economicCalendar: (currencies: string[]) => ["economicCalendar", ...currencies] as const,
  },
  replay: {
    session: (accountId: string, date: string) => ["replay", "session", accountId, date] as const,
  },
} as const;

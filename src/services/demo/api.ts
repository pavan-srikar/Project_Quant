import type { DrawingLine } from "../../pages/trading/constants.ts";
import type { Candle } from "../schemas.ts";
import { ensureCandlesLoaded } from "./candles.ts";
import * as engine from "./engine.ts";
import { registerFeedSymbol } from "./feed.ts";
import { DEMO_SYMBOLS } from "./instruments.ts";

/**
 * Demo-mode API. Replaces the HTTP client for everything the terminal needs:
 * trading actions hit the in-browser paper engine, market data comes from the
 * bundled real OHLC, and chart drawings persist to localStorage. Methods not
 * implemented here fall through to a benign stub (see services/api.ts).
 */

const DEMO_USER = {
  id: "demo-user",
  email: "demo@project_quant.dev",
  firstName: "Demo",
  lastName: "Trader",
  roles: ["trader"],
  status: "ACTIVE",
  createdAt: new Date().toISOString(),
};

function authResponse() {
  return { accessToken: "demo-token", refreshToken: "demo-refresh", user: DEMO_USER };
}

// ── Chart drawings (localStorage) ─────────────────────────
const DRAW_KEY = (symbol: string) => `oc_drawings_${symbol}`;

function readDrawings(symbol: string): DrawingLine[] {
  try {
    return JSON.parse(localStorage.getItem(DRAW_KEY(symbol)) ?? "[]");
  } catch {
    return [];
  }
}
function writeDrawings(symbol: string, list: DrawingLine[]): void {
  localStorage.setItem(DRAW_KEY(symbol), JSON.stringify(list));
}

const chartDrawings = {
  list: (symbol: string) => Promise.resolve(readDrawings(symbol)),
  save: (symbol: string, _tf: string, drawing: DrawingLine) => {
    const list = readDrawings(symbol).filter((d) => d.id !== drawing.id);
    list.push(drawing);
    writeDrawings(symbol, list);
    return Promise.resolve({ saved: true });
  },
  remove: (drawingId: string) => {
    for (const s of DEMO_SYMBOLS) {
      writeDrawings(s.name, readDrawings(s.name).filter((d) => d.id !== drawingId));
    }
    return Promise.resolve({ deleted: true });
  },
  clear: (symbol: string) => {
    writeDrawings(symbol, []);
    return Promise.resolve({ cleared: true });
  },
};

const candlesMeta = (candles: Candle[]) => ({
  candles: candles.map((c) => ({
    ...c,
    timestamp: c.timestamp ?? c.time * 1000,
  })),
  metadata: { isPartial: false, backfillQueued: false, historicalCoverageStart: null },
});

export const demoApi = {
  // ── Auth (no real auth in demo) ──
  login: (_email?: string, _password?: string) => Promise.resolve(authResponse()),
  demoLogin: () => Promise.resolve(authResponse()),
  register: (_data?: unknown) => Promise.resolve(authResponse()),
  completeMfaLogin: (_mfaToken?: string, _code?: string) => Promise.resolve(authResponse()),
  logout: (_rt?: string) => Promise.resolve({ success: true }),
  refreshToken: (_rt?: string) =>
    Promise.resolve({ accessToken: "demo-token", refreshToken: "demo-refresh" }),
  getMyProfile: () => Promise.resolve(DEMO_USER),
  getMe: () => Promise.resolve(DEMO_USER),

  // ── Accounts ──
  getMyAccounts: () => Promise.resolve(engine.getAccounts()),
  getAccount: (_id?: string) => Promise.resolve(engine.getAccount()),
  getEquityHistory: (_id?: string) => Promise.resolve([]),
  getLedger: (_id?: string, _page?: number) =>
    Promise.resolve({ data: [], total: 0, page: 1, pageSize: 50, totalPages: 0 }),
  getAccountStats: (_id?: string) =>
    Promise.resolve({
      totalTrades: 0,
      winRate: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0,
      bestTrade: 0,
      worstTrade: 0,
    }),
  setAccountLabel: (_id?: string, _label?: string) => Promise.resolve({ success: true }),
  getAccountMetrics: (_id?: string) => {
    const a = engine.getAccount();
    return Promise.resolve({
      accountId: a.id,
      equity: a.equity,
      balance: a.balance,
      freeMargin: a.freeMargin,
      marginUsed: a.margin,
      floatingPnl: a.equity - a.balance,
      dailyPnl: 0,
      ddDaily: null,
      ddDailyMax: null,
      ddTotal: null,
      ddTotalMax: null,
      ddTrailing: null,
      ddTrailingMax: null,
      trailingDrawdownFloor: null,
      trailingDrawdownPeak: null,
      trailingDrawdownMode: null,
      trailingDrawdownTrailMode: null,
      trailingDrawdownFloorLocked: false,
      trailingDrawdownTrailToBreakeven: false,
      profitTargetPercent: null,
      profitTargetProgress: 0,
      minTradingDays: null,
      tradingDaysCompleted: 0,
      minDaysProgress: 0,
      status: a.status,
      phase: a.phase,
      highWaterMark: a.balance,
      startingBalance: a.template?.startingBalance ?? a.balance,
      currency: "USD",
      lastMarkTs: new Date().toISOString(),
    });
  },

  // ── Symbols & market data ──
  getSymbols: () => Promise.resolve(DEMO_SYMBOLS),
  getCandles: async (
    symbol: string,
    timeframe: string,
    limit?: number,
    range?: { fromMs: number; toMs: number },
    targetTimeSec?: number,
  ) => {
    const candles = await ensureCandlesLoaded(symbol, timeframe, limit, range, targetTimeSec);
    registerFeedSymbol(symbol);
    return candles;
  },
  getCandlesWithMeta: async (
    symbol: string,
    timeframe: string,
    limit?: number,
    range?: { fromMs: number; toMs: number },
    targetTimeSec?: number,
  ) => {
    const candles = await ensureCandlesLoaded(symbol, timeframe, limit, range, targetTimeSec);
    registerFeedSymbol(symbol);
    return candlesMeta(candles);
  },
  getTick: (symbol: string) => {
    const price = engine.getLastPrice(symbol);
    if (!Number.isFinite(price) || price <= 0) {
      return Promise.resolve(null);
    }
    const s = DEMO_SYMBOLS.find((item) => item.name === symbol);
    const spread = Math.max(s?.tickSize ?? 0.01, price * 0.0001);
    return Promise.resolve({
      symbol,
      bid: price - spread / 2,
      ask: price + spread / 2,
      timestamp: Date.now(),
    });
  },
  getMarketDataHealth: () => Promise.resolve({ status: "ok" }),
  getEconomicCalendar: (_currencies?: unknown, _from?: unknown, _to?: unknown) =>
    Promise.resolve([]),

  // ── Trading (paper engine) ──
  placeOrder: (data: engine.PlaceOrderArgs) => Promise.resolve(engine.placeOrder(data)),
  cancelOrder: (orderId: string) => Promise.resolve(engine.cancelOrder(orderId)),
  modifyOrder: (
    orderId: string,
    mods?: {
      price?: number | null;
      stopPrice?: number | null;
      quantity?: number;
      takeProfit?: number | null;
      stopLoss?: number | null;
    },
  ) => Promise.resolve(engine.modifyOrder(orderId, mods ?? {})),
  cancelAllOrders: () => Promise.resolve({ success: true }),
  getOrders: (_accountId?: string, _status?: string) => Promise.resolve(engine.getOrders()),
  getPositions: (_accountId?: string) => Promise.resolve(engine.getPositions()),
  getOpenPositionCount: (_accountId?: string) =>
    Promise.resolve(engine.getPositions().length),
  closePosition: (positionId: string, quantity?: number) =>
    Promise.resolve(engine.closePosition(positionId, quantity)),
  closeAllPositions: (_accountId?: string) => Promise.resolve(engine.closeAllPositions()),
  modifyPosition: (
    positionId: string,
    mods: { takeProfit?: number | null; stopLoss?: number | null },
  ) => Promise.resolve(engine.modifyPosition(positionId, mods)),
  getFills: (_accountId?: string, _page?: number) =>
    Promise.resolve({
      data: engine.getFills(),
      total: engine.getFills().length,
      page: 1,
      pageSize: 50,
      totalPages: 1,
    }),
  getClosedPositions: (_accountId?: string, _page?: number) =>
    Promise.resolve({
      data: engine.getClosedPositions(),
      total: engine.getClosedPositions().length,
      page: 1,
      pageSize: 50,
      totalPages: 1,
    }),
  getClosedPositionsSummary: (_accountId?: string, _from?: string, _to?: string) =>
    Promise.resolve({
      realizedPnl: 0,
      trades: 0,
      wins: 0,
      losses: 0,
      pnl: 0,
      commission: 0,
      swap: 0,
      tradeCount: 0,
    }),
  getFillQuality: (_accountId?: string) =>
    Promise.resolve({ avgScore: null, count: 0, entries: [] as any[] }),

  // ── Trade journal ──
  getJournalEntries: (_accountId?: string, _opts?: unknown) =>
    Promise.resolve({ entries: [] as any[], total: 0 }),
  createJournalEntry: (_data?: unknown) => Promise.resolve(null as any),
  updateJournalEntry: (_id?: string, _data?: unknown) => Promise.resolve(null as any),
  deleteJournalEntry: (_id?: string) => Promise.resolve({ success: true }),

  // ── Chart persistence ──
  chartDrawings,
  getPreferences: () => Promise.resolve({}),
  savePreferences: (_prefs?: unknown) => Promise.resolve({ success: true }),

  // ── Feature gating / misc (terminal reads these on mount) ──
  getFeatureFlags: () => Promise.resolve({}),
  isAiTraderEnabled: () => Promise.resolve(false),
  getAnnouncements: (_page?: number) => Promise.resolve([]),
  getAnnouncementsUnreadCount: () => Promise.resolve(0),
  markAnnouncementRead: (_id?: string) => Promise.resolve({ success: true }),
  markAllAnnouncementsRead: () => Promise.resolve({ success: true }),
  getDailyPnl: (_accountIds?: string[], _from?: string, _to?: string) =>
    Promise.resolve({} as any),
  replayGetSession: (_accountId?: string, _sessionDate?: string) =>
    Promise.resolve(null as any),
};

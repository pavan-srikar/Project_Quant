import { useState, useEffect, useRef } from "react";
import { TrendingUp, Clock, History, Bot, Activity, ChevronDown, ChevronUp } from "lucide-react";
import type { CandlestickData, Time, IChartApi } from "lightweight-charts";
import { INDICATOR_REGISTRY, type IndicatorType } from "../../lib/indicators.ts";
import { BottomIndicatorsPanel } from "./BottomIndicatorsPanel.tsx";
import { useAuthStore } from "../../services/store.tsx";
import { useTradingStore } from "../../services/store.tsx";
import {
  useCancelOrder,
  useClosePosition,
  useCloseAllPositions,
  useClosedPositions,
} from "../../services/queries.ts";
import type {
  JournalEntry,
  CreateJournalEntryInput,
  UpdateJournalEntryInput,
} from "../../services/api/journal.ts";
import type { Account, ClosedPosition, Order, Position } from "../../services/schemas.ts";
import { TradeJournalPanel } from "../../components/TradingDialogs.tsx";
import { AiTraderPanel } from "../AiTraderPage.tsx";
import { toast } from "../../services/toast.ts";
import { formatCurrency, formatNumber, formatDate, cn } from "../../lib/utils.ts";
import { PositionsTable } from "./PositionsTable.tsx";
import { OrdersTable } from "./OrdersTable.tsx";
import { computeLivePnl, computeLivePrice } from "../../lib/livePnl.ts";

type TradingActionError = {
  error?: { message?: string };
  message?: string;
};

type AccountOption = Pick<Account, "id"> & { label?: string | null };

function getErrorMessage(error: unknown): string {
  const actionError = error as TradingActionError;
  return actionError.error?.message || actionError.message || "Request failed";
}

export type BottomPanelTab =
  | "positions"
  | "orders"
  | "history"
  | "journal"
  | "ai-trader"
  | "indicators";

export interface BottomPanelProps {
  tab: BottomPanelTab;
  onTabChange: (t: BottomPanelTab) => void;
  positions: Position[];
  orders: Order[];
  accountId: string | null;
  onModifyPosition?: (position: Position) => void;
  onModifyOrder?: (order: Order) => void;
  onSelectPositionSymbol?: (symbolName: string) => void;
  onSelectOrderSymbol?: (symbolName: string) => void;
  journalEntries: JournalEntry[];
  journalLoading: boolean;
  onCreateJournal: (data: CreateJournalEntryInput) => void;
  onUpdateJournal: (id: string, data: UpdateJournalEntryInput) => void;
  onDeleteJournal: (id: string) => void;
  aiTraderEnabled?: boolean;
  height?: number;
  isFeedConnected?: boolean;
  // Sub-chart indicators props
  candles?: CandlestickData<Time>[];
  activeIndicators?: IndicatorType[];
  onToggleIndicator?: (type: IndicatorType) => void;
  isDark?: boolean;
  timeframe?: string;
  mainChart?: IChartApi | null;
  // Collapsible support
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function BottomPanel({
  tab,
  onTabChange,
  positions,
  orders,
  accountId,
  onModifyPosition,
  onModifyOrder,
  onSelectPositionSymbol,
  onSelectOrderSymbol,
  journalEntries,
  journalLoading,
  onCreateJournal,
  onUpdateJournal,
  onDeleteJournal,
  aiTraderEnabled,
  height = 220,
  isFeedConnected = true,
  candles = [],
  activeIndicators = [],
  onToggleIndicator,
  isDark = true,
  timeframe = "15m",
  mainChart,
  isCollapsed = false,
  onToggleCollapse,
}: BottomPanelProps) {
  const isDemo = useAuthStore((s) => s.isDemo);
  const cancelOrder = useCancelOrder();
  const closePosition = useClosePosition();
  const closeAllPositions = useCloseAllPositions();
  const accounts = useTradingStore((s) => s.accounts as AccountOption[]);
  const activeAccount = accounts.find((account) => account.id === accountId);

  const handleCancel = (orderId: string) => {
    if (!accountId || isDemo) {
      if (isDemo) toast.warning("Demo Mode", "Trading actions are disabled in demo mode");
      return;
    }
    if (!isFeedConnected) {
      toast.warning("No Data Feed", "Cannot cancel orders while disconnected");
      return;
    }
    if (cancelOrder.isPending) return;
    cancelOrder.mutate(
      { orderId, accountId },
      {
        onSuccess: () => toast.info("Order Cancelled", "Pending order has been cancelled"),
        onError: (err: unknown) => toast.error("Cancel Failed", getErrorMessage(err)),
      },
    );
  };

  const handleClosePosition = (positionId: string) => {
    if (!accountId || isDemo) {
      if (isDemo) toast.warning("Demo Mode", "Trading actions are disabled in demo mode");
      return;
    }
    if (!isFeedConnected) {
      toast.warning("No Data Feed", "Cannot close positions while disconnected");
      return;
    }
    if (closePosition.isPending) return;
    closePosition.mutate(
      { positionId, accountId },
      {
        onSuccess: () => toast.success("Position Closed", "Position has been closed"),
        onError: (err: unknown) => toast.error("Close Failed", getErrorMessage(err)),
      },
    );
  };

  const handlePartialClose = (positionId: string, quantity: number) => {
    if (!accountId || isDemo) {
      if (isDemo) toast.warning("Demo Mode", "Trading actions are disabled in demo mode");
      return;
    }
    if (!isFeedConnected) {
      toast.warning("No Data Feed", "Cannot close positions while disconnected");
      return;
    }
    if (closePosition.isPending) return;
    closePosition.mutate(
      { positionId, accountId, quantity },
      {
        onSuccess: () =>
          toast.success("Partial Close", `Closed ${quantity} lot(s) of the position`),
        onError: (err: unknown) => toast.error("Partial Close Failed", getErrorMessage(err)),
      },
    );
  };

  const handleCloseAll = () => {
    if (!accountId || isDemo) {
      if (isDemo) toast.warning("Demo Mode", "Trading actions are disabled in demo mode");
      return;
    }
    if (!isFeedConnected) {
      toast.warning("No Data Feed", "Cannot close positions while disconnected");
      return;
    }
    closeAllPositions.mutate(accountId, {
      onSuccess: () => toast.success("All Closed", "All positions have been closed"),
      onError: (err: unknown) => toast.error("Close All Failed", getErrorMessage(err)),
    });
  };

  const ticks = useTradingStore((s) => s.ticks);
  const openPositions = positions
    .filter((position) => position.quantity > 0)
    .map((p) => {
      const tick = ticks[p.symbolName];
      if (!tick) return p;
      return {
        ...p,
        currentPrice: computeLivePrice(p, tick),
        unrealizedPnl: computeLivePnl(p, tick),
      };
    });
  const pendingOrders = orders.filter(
    (order) => order.status === "PENDING" || order.status === "NEW",
  );
  const totalPnl = openPositions.reduce((sum, position) => sum + (position.unrealizedPnl || 0), 0);

  const activeBelowCount = activeIndicators.filter((t) => {
    const cfg = INDICATOR_REGISTRY.find((r) => r.type === t);
    return cfg && cfg.pane === "below";
  }).length;

  const tabs: {
    key: typeof tab;
    label: string;
    icon: typeof Clock;
    count?: number;
  }[] = [
    {
      key: "indicators",
      label: "Indicators",
      icon: Activity,
      count: activeBelowCount > 0 ? activeBelowCount : undefined,
    },
    { key: "positions", label: "Positions", icon: TrendingUp, count: openPositions.length },
    { key: "orders", label: "Orders", icon: Clock, count: pendingOrders.length },
    { key: "history", label: "Trade History", icon: History },
    // { key: "journal", label: "Journal", icon: BookOpen }, // hidden pending QA (PS-285)
    ...(aiTraderEnabled ? [{ key: "ai-trader" as const, label: "AI Trader", icon: Bot }] : []),
  ];

  return (
    <div
      className={cn(
        "border-t border-[#2a2e39] flex flex-col shrink-0 bg-[#131722] relative z-20",
        !isCollapsed && "max-h-[150px] md:max-h-none",
      )}
      style={isCollapsed ? undefined : { height }}
    >
      {/* Content */}
      <div
        className={cn(
          "flex-1 min-h-0",
          tab === "indicators" ? "overflow-visible" : "overflow-auto",
          isCollapsed && "hidden",
        )}
      >
        {tab === "indicators" && (
          <BottomIndicatorsPanel
            candles={candles}
            activeIndicators={activeIndicators}
            onToggleIndicator={onToggleIndicator || (() => {})}
            isDark={isDark}
            timeframe={timeframe}
            mainChart={mainChart}
            onCollapse={onToggleCollapse}
          />
        )}
        {tab === "positions" && (
          <PositionsTable
            positions={openPositions}
            onClose={handleClosePosition}
            onModify={onModifyPosition as unknown as ((p: { id: string }) => void) | undefined}
            onPartialClose={handlePartialClose}
            onSelectSymbol={onSelectPositionSymbol}
          />
        )}
        {tab === "orders" && (
          <OrdersTable
            orders={pendingOrders}
            onCancel={handleCancel}
            onModify={onModifyOrder as unknown as ((order: { id: string }) => void) | undefined}
            onSelectSymbol={onSelectOrderSymbol}
          />
        )}
        {tab === "history" && <TradeHistoryTable accountId={accountId} />}
        {tab === "journal" && (
          <TradeJournalPanel
            entries={journalEntries}
            isLoading={journalLoading}
            accountId={accountId}
            onCreateEntry={
              onCreateJournal as unknown as (
                data: Partial<{ notes: string; tags: string[] }> & {
                  notes: string;
                  tags: string[];
                },
              ) => void
            }
            onUpdateEntry={
              onUpdateJournal as unknown as (
                id: string,
                data: Partial<{ notes: string; tags: string[] }> & {
                  notes: string;
                  tags: string[];
                },
              ) => void
            }
            onDeleteEntry={onDeleteJournal}
          />
        )}
        {tab === "ai-trader" && <AiTraderPanel accountId={accountId} />}
      </div>

      {/* Tab bar - Docked at the bottom */}
      <div className="shrink-0 flex items-center gap-1 px-3 py-1.5 border-t border-[#2a2e39] bg-[#1e222d] text-xs overflow-x-auto no-scrollbar">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => onTabChange(t.key)}
            title={tab === t.key ? (isCollapsed ? "Click to expand" : "Click to collapse") : t.label}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-md shrink-0 whitespace-nowrap text-xs transition-colors",
              tab === t.key
                ? isCollapsed
                  ? "bg-[#2962ff]/20 text-[#2962ff] border border-[#2962ff]/40 font-semibold"
                  : "bg-[#2962ff] text-white font-semibold shadow-sm"
                : "text-neutral-400 hover:text-neutral-200 hover:bg-[#2a2e39]",
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            <span className="hidden md:inline">{t.label}</span>
            {t.count !== undefined && t.count > 0 && (
              <span
                className={cn(
                  "rounded-full px-1.5 text-[9px] font-bold",
                  tab === t.key && !isCollapsed ? "bg-white/20 text-white" : "bg-[#2a2e39] text-neutral-300",
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}

        {tab === "positions" && openPositions.length > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <span
              className={cn(
                "font-mono text-xs font-bold",
                totalPnl >= 0 ? "text-[#0ecb81]" : "text-[#f6465d]",
              )}
            >
              P&L: {totalPnl >= 0 ? "+" : ""}
              {formatCurrency(totalPnl)}
            </span>
            <button
              onClick={handleCloseAll}
              className="px-2 py-0.5 text-[10px] font-bold rounded bg-[#f6465d]/15 text-[#f6465d] hover:bg-[#f6465d] hover:text-white border border-[#f6465d]/30 transition-colors disabled:opacity-50"
              disabled={closeAllPositions.isPending || isDemo || !isFeedConnected}
            >
              Close All
            </button>
          </div>
        )}

        {/* Right side controls: Account info + Collapse/Expand button */}
        <div className="ml-auto flex items-center gap-1.5 shrink-0 pl-2">
          {activeAccount &&
            (tab === "positions" || tab === "orders" || tab === "history" || tab === "indicators") &&
            !(tab === "positions" && openPositions.length > 0) && (
              <span className="text-[10px] text-neutral-400 font-mono px-1">
                {activeAccount.label || accountId?.slice(0, 8)}
              </span>
            )}

          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="flex items-center justify-center p-1 rounded hover:bg-[#2a2e39] text-neutral-400 hover:text-white transition-colors"
              title={isCollapsed ? "Expand panel" : "Collapse panel"}
            >
              {isCollapsed ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Trade History Table ──────────────────────────────────────
function TradeHistoryTable({ accountId }: { accountId: string | null }) {
  const [page, setPage] = useState(1);
  const { data: closedData, isLoading } = useClosedPositions(accountId, page);
  const trades: ClosedPosition[] = closedData?.data || [];
  const totalPages = closedData?.totalPages || 1;
  const accounts = useTradingStore((s) => s.accounts as AccountOption[]);
  const activeAccount = accounts.find((account) => account.id === accountId);

  const prevAccRef = useRef(accountId);
  useEffect(() => {
    if (prevAccRef.current !== accountId) {
      setPage(1);
      prevAccRef.current = accountId;
    }
  }, [accountId]);

  if (!accountId)
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
        Select an account
      </div>
    );
  if (isLoading)
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
        Loading...
      </div>
    );
  if (trades.length === 0)
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
        No trade history yet
        {activeAccount ? ` for ${activeAccount.label || accountId?.slice(0, 8)}` : ""}
      </div>
    );

  return (
    <div className="flex flex-col h-full bg-[#131722]">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-[#1e222d] border-b border-[#2a2e39] z-10">
          <tr>
            <th className="py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Closed</th>
            <th className="py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Symbol</th>
            <th className="py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Side</th>
            <th className="py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Volume</th>
            <th className="py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Entry</th>
            <th className="py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Exit</th>
            <th className="py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Commission</th>
            <th className="py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Gross P&L</th>
            <th className="py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Net P&L</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1e222d]">
          {trades.map((t) => {
            const comm = t.commission ?? 0;
            const gross = t.realizedPnl ?? 0;
            const net = gross - comm;
            return (
              <tr key={t.id} className="hover:bg-[#1e222d]/60 transition-colors">
                <td className="text-neutral-400 font-mono py-1.5 px-3">
                  {formatDate(t.closedAt || t.openedAt)}
                </td>
                <td className="font-bold text-neutral-100 py-1.5 px-3">{t.symbolName}</td>
                <td className="py-1.5 px-3">
                  <span
                    className={cn(
                      "font-semibold text-[10px] px-1.5 py-0.5 rounded",
                      t.side === "LONG"
                        ? "bg-[#0ecb81]/15 text-[#0ecb81] border border-[#0ecb81]/30"
                        : "bg-[#f6465d]/15 text-[#f6465d] border border-[#f6465d]/30",
                    )}
                  >
                    {t.side}
                  </span>
                </td>
                <td className="font-mono text-neutral-200 py-1.5 px-3">{t.quantity}</td>
                <td className="font-mono text-neutral-200 py-1.5 px-3">{t.entryPrice ? formatNumber(t.entryPrice, 5) : "--"}</td>
                <td className="font-mono text-neutral-200 py-1.5 px-3">{t.exitPrice ? formatNumber(t.exitPrice, 5) : "--"}</td>
                <td className="font-mono text-neutral-400 py-1.5 px-3">
                  {comm > 0 ? `-${comm.toFixed(2)}` : "0.00"}
                </td>
                <td
                  className={cn(
                    "font-mono py-1.5 px-3 font-medium",
                    gross >= 0 ? "text-[#0ecb81]" : "text-[#f6465d]",
                  )}
                >
                  {`${gross >= 0 ? "+" : ""}${gross.toFixed(2)}`}
                </td>
                <td
                  className={cn(
                    "font-mono font-bold py-1.5 px-3",
                    net >= 0 ? "text-[#0ecb81]" : "text-[#f6465d]",
                  )}
                >
                  {`${net >= 0 ? "+" : ""}${net.toFixed(2)}`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-1 border-t border-border text-[10px]">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="px-1.5 py-0.5 rounded bg-secondary hover:bg-secondary/80 disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-muted-foreground">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="px-1.5 py-0.5 rounded bg-secondary hover:bg-secondary/80 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

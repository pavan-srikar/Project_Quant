import { Activity, Bot, Clock, History, TrendingUp } from "lucide-react";
import { INDICATOR_REGISTRY } from "../../../lib/indicators.ts";
import { BottomIndicatorsPanel } from "../BottomIndicatorsPanel.tsx";
import { useAuthStore, useTradingStore } from "../../../services/store.tsx";
import {
  useCancelOrder,
  useClosePosition,
  useCloseAllPositions,
} from "../../../services/queries.ts";
import { TradeJournalPanel } from "../../../components/TradingDialogs.tsx";
import { AiTraderPanel } from "../../AiTraderPage.tsx";
import { toast } from "../../../services/toast.ts";
import { cn } from "@/lib/utils";
import { PositionsTable } from "../PositionsTable.tsx";
import { OrdersTable } from "../OrdersTable.tsx";
import { computeLivePnl, computeLivePrice } from "../../../lib/livePnl.ts";
import type { BottomPanelProps, AccountOption } from "./types";
import { getErrorMessage } from "./types";
import { TradeHistoryTable } from "./TradeHistoryTable";
import { BottomPanelTabBar, type TabItem } from "./BottomPanelTabBar";

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
  timeframe = "4h",
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

  const tabs: TabItem[] = [
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
      <BottomPanelTabBar
        tab={tab}
        onTabChange={onTabChange}
        tabs={tabs}
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse}
        totalPnl={totalPnl}
        openPositionCount={openPositions.length}
        onCloseAll={handleCloseAll}
        isClosingAllPending={closeAllPositions.isPending}
        isDemo={isDemo}
        isFeedConnected={isFeedConnected}
        activeAccountLabel={activeAccount?.label || accountId?.slice(0, 8)}
      />
    </div>
  );
}

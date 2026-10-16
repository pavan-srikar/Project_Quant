import { ChevronDown, ChevronUp, type LucideIcon } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import type { BottomPanelTab } from "./types";

export interface TabItem {
  key: BottomPanelTab;
  label: string;
  icon: LucideIcon;
  count?: number;
}

export interface BottomPanelTabBarProps {
  tab: BottomPanelTab;
  onTabChange: (t: BottomPanelTab) => void;
  tabs: TabItem[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  totalPnl: number;
  openPositionCount: number;
  onCloseAll: () => void;
  isClosingAllPending: boolean;
  isDemo: boolean;
  isFeedConnected: boolean;
  activeAccountLabel?: string | null;
}

export function BottomPanelTabBar({
  tab,
  onTabChange,
  tabs,
  isCollapsed = false,
  onToggleCollapse,
  totalPnl,
  openPositionCount,
  onCloseAll,
  isClosingAllPending,
  isDemo,
  isFeedConnected,
  activeAccountLabel,
}: BottomPanelTabBarProps) {
  return (
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

      {tab === "positions" && openPositionCount > 0 && (
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
            onClick={onCloseAll}
            className="px-2 py-0.5 text-[10px] font-bold rounded bg-[#f6465d]/15 text-[#f6465d] hover:bg-[#f6465d] hover:text-white border border-[#f6465d]/30 transition-colors disabled:opacity-50"
            disabled={isClosingAllPending || isDemo || !isFeedConnected}
          >
            Close All
          </button>
        </div>
      )}

      {/* Right side controls: Account info + Collapse/Expand button */}
      <div className="ml-auto flex items-center gap-1.5 shrink-0 pl-2">
        {activeAccountLabel &&
          (tab === "positions" || tab === "orders" || tab === "history" || tab === "indicators") &&
          !(tab === "positions" && openPositionCount > 0) && (
            <span className="text-[10px] text-neutral-400 font-mono px-1">
              {activeAccountLabel}
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
  );
}

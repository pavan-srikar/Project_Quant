import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { MobileTradingPanelProps, Tab } from "./types";
import { TABS } from "./types";
import { MobileOrderTab } from "./MobileOrderTab";
import { MobilePositionsTab } from "./MobilePositionsTab";

export function MobileTradingPanel({
  symbol,
  bid = 0,
  ask = 0,
  spread: spreadProp,
  accountBalance = 0,
  onPlaceOrder,
  positions,
  onClosePosition,
  onCloseAllPositions,
  closingPositionId = null,
  closingAll = false,
}: MobileTradingPanelProps) {
  const spread = spreadProp ?? ask - bid;
  const [activeTab, setActiveTab] = useState<Tab>("order");

  // Swipe tracking
  const touchStartX = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]!.clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const dx = e.changedTouches[0]!.clientX - touchStartX.current;
      if (Math.abs(dx) > 60) {
        const currentIdx = TABS.indexOf(activeTab);
        if (dx > 0 && currentIdx > 0) {
          setActiveTab(TABS[currentIdx - 1]!);
        } else if (dx < 0 && currentIdx < TABS.length - 1) {
          setActiveTab(TABS[currentIdx + 1]!);
        }
      }
    },
    [activeTab],
  );

  const openPositionCount = positions.filter((p) => (p.symbol ?? p.symbolName) === symbol).length;

  return (
    <div
      className="md:hidden flex flex-col bg-slate-900 border-t border-slate-700 safe-area-bottom"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Tab bar */}
      <div className="flex border-b border-slate-700">
        {[
          { key: "order" as const, label: "Order" },
          { key: "positions" as const, label: `Positions (${positions.length})` },
          { key: "alerts" as const, label: "Alerts" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition",
              activeTab === tab.key
                ? "text-violet-400 border-b-2 border-violet-500"
                : "text-slate-500",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ORDER TAB */}
      {activeTab === "order" && (
        <MobileOrderTab
          symbol={symbol}
          bid={bid}
          ask={ask}
          spread={spread}
          accountBalance={accountBalance}
          openPositionCount={openPositionCount}
          onPlaceOrder={onPlaceOrder}
        />
      )}

      {/* POSITIONS TAB */}
      {activeTab === "positions" && (
        <MobilePositionsTab
          positions={positions}
          onClosePosition={onClosePosition}
          onCloseAllPositions={onCloseAllPositions}
          closingPositionId={closingPositionId}
          closingAll={closingAll}
        />
      )}

      {/* ALERTS TAB */}
      {activeTab === "alerts" && (
        <div className="p-3 space-y-3">
          <div className="text-center py-8">
            <p className="text-slate-500 text-sm">Price alerts coming soon</p>
            <p className="text-xs text-slate-600 mt-1">
              Set alerts for price levels and get push notifications
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

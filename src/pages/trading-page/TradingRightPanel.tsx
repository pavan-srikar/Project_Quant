import type { Dispatch, SetStateAction } from "react";
import type { Symbol } from "../../services/schemas.ts";
import { AiTraderPanel } from "../AiTraderPage.tsx";
import { DOMPanel } from "../trading/DOMPanel.tsx";
import { OrderPanel } from "../trading/OrderPanel.tsx";
import { WatchlistPanel } from "../trading/WatchlistPanel.tsx";
import type { ConfirmOrderState } from "./types.ts";

export interface TradingRightPanelProps {
  showRightPanel: boolean;
  rightPanel: "watchlist" | "order" | "dom" | "ai-trader";
  rightPanelWidth: number;
  symbols: Symbol[];
  ticks: Record<string, { bid: number; ask: number; timestamp: number }>;
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  onOpenSymbolSearch: () => void;
  oneClick: boolean;
  activeAccountId: string | null;
  isFeedConnected: boolean;
  symbolInfo?: Symbol;
  tick?: { bid: number; ask: number; timestamp: number };
  onToggleOneClick: () => void;
  setConfirmOrder: Dispatch<SetStateAction<ConfirmOrderState>>;
  accountBalance?: number;
  soundMuted: boolean;
  onToggleMute: () => void;
  onOrderSuccess: () => void;
}

export function TradingRightPanel({
  showRightPanel,
  rightPanel,
  rightPanelWidth,
  symbols,
  ticks,
  selectedSymbol,
  onSelectSymbol,
  onOpenSymbolSearch,
  oneClick,
  activeAccountId,
  isFeedConnected,
  symbolInfo,
  tick,
  onToggleOneClick,
  setConfirmOrder,
  accountBalance,
  soundMuted,
  onToggleMute,
  onOrderSuccess,
}: TradingRightPanelProps) {
  if (!showRightPanel) return null;

  return (
    <div
      style={{ width: `${rightPanelWidth}px` }}
      className="hidden md:flex border-t md:border-t-0 flex-col bg-[#1e222d] overflow-hidden shrink-0 md:max-h-none"
    >
      {rightPanel === "watchlist" && (
        <WatchlistPanel
          symbols={symbols}
          ticks={ticks}
          selectedSymbol={selectedSymbol}
          onSelect={onSelectSymbol}
          onOpenSymbolSearch={onOpenSymbolSearch}
          oneClick={oneClick}
          accountId={activeAccountId}
          isFeedConnected={isFeedConnected}
        />
      )}
      {rightPanel === "order" && (
        <OrderPanel
          symbol={selectedSymbol}
          symbolInfo={symbolInfo}
          tick={tick}
          accountId={activeAccountId}
          oneClick={oneClick}
          onToggleOneClick={onToggleOneClick}
          onConfirmOrder={setConfirmOrder}
          accountBalance={accountBalance}
          isFeedConnected={isFeedConnected}
          soundMuted={soundMuted}
          onToggleMute={onToggleMute}
          onOrderSuccess={onOrderSuccess}
        />
      )}
      {rightPanel === "dom" && <DOMPanel symbol={selectedSymbol} tick={tick} />}
      {rightPanel === "ai-trader" && (
        <div className="flex-1 overflow-hidden">
          <AiTraderPanel accountId={activeAccountId} />
        </div>
      )}
    </div>
  );
}

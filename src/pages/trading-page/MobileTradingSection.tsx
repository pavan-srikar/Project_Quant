import { useState, type Dispatch, type SetStateAction } from "react";
import { MobileAccountBar, MobileTradingPanel } from "../../components/MobileTradingPanel.tsx";
import { api } from "../../services/api.ts";
import type { Account, PlaceOrderInput, Position } from "../../services/schemas.ts";
import type { ConfirmOrderState } from "./types.ts";

export interface MobileTradingSectionProps {
  account?: Account;
  positionPnl: number;
  selectedSymbol: string;
  tick?: { bid: number; ask: number };
  positions: Position[];
  oneClick: boolean;
  activeAccountId: string | null;
  setConfirmOrder: Dispatch<SetStateAction<ConfirmOrderState>>;
}

export function MobileTradingSection({
  account,
  positionPnl,
  selectedSymbol,
  tick,
  positions,
  oneClick,
  activeAccountId,
  setConfirmOrder,
}: MobileTradingSectionProps) {
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  return (
    <>
      {/* ── Mobile Account Bar (small screens only) ────── */}
      <div className="md:hidden">
        <MobileAccountBar
          balance={account?.balance ?? 0}
          equity={account?.equity ?? account?.balance ?? 0}
          margin={account?.margin ?? 0}
          pnl={positionPnl}
        />
      </div>

      {/* ── Mobile Trading Panel (small screens only) ──── */}
      <div className="md:hidden">
        {!mobilePanelOpen && (
          <button
            onClick={() => setMobilePanelOpen(true)}
            className="fixed bottom-20 right-4 z-40 bg-primary text-primary-foreground rounded-full w-14 h-14 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          >
            <span className="text-2xl font-bold">$</span>
          </button>
        )}
        {mobilePanelOpen && (
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[70vh] overflow-y-auto bg-card border-t border-border rounded-t-2xl shadow-2xl safe-area-bottom">
            <div className="flex justify-center py-1">
              <button
                onClick={() => setMobilePanelOpen(false)}
                className="w-10 h-1.5 rounded-full bg-muted-foreground/30"
              />
            </div>
            <MobileTradingPanel
              symbol={selectedSymbol}
              bid={tick?.bid}
              ask={tick?.ask}
              positions={positions || []}
              onPlaceOrder={(order) => {
                if (oneClick) {
                  api
                    .placeOrder({ ...order, accountId: activeAccountId! } as PlaceOrderInput)
                    .catch(() => {});
                  setMobilePanelOpen(false);
                  return;
                }
                setConfirmOrder({
                  ...order,
                  _submit: () =>
                    api.placeOrder({ ...order, accountId: activeAccountId! } as PlaceOrderInput),
                });
                setMobilePanelOpen(false);
              }}
            />
          </div>
        )}
      </div>
    </>
  );
}

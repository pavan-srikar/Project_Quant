import { SymbolSearchModal } from "../../components/SymbolSearchModal.tsx";
import {
  OrderConfirmDialog,
  OrderModifyDialog,
  PositionModifyDialog,
} from "../../components/TradingDialogs.tsx";
import type { Order, Position, Symbol } from "../../services/schemas.ts";
import type { ConfirmOrderState } from "./types.ts";

export interface TradingDialogContainerProps {
  isSymbolSearchOpen: boolean;
  onCloseSymbolSearch: () => void;
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  symbolSearchInitialQuery: string;
  symbolSearchMode: "switch" | "add_to_watchlist";
  modifyingPosition: Position | null;
  onCloseModifyingPosition: () => void;
  modifyingOrder: Order | null;
  onCloseModifyingOrder: () => void;
  confirmOrder: ConfirmOrderState;
  onConfirmOrder: () => void;
  onCancelConfirmOrder: () => void;
  confirmLoading: boolean;
  tick?: { bid: number; ask: number; timestamp?: number };
  symbolInfo?: Symbol;
  isFeedConnected: boolean;
}

export function TradingDialogContainer({
  isSymbolSearchOpen,
  onCloseSymbolSearch,
  selectedSymbol,
  onSelectSymbol,
  symbolSearchInitialQuery,
  symbolSearchMode,
  modifyingPosition,
  onCloseModifyingPosition,
  modifyingOrder,
  onCloseModifyingOrder,
  confirmOrder,
  onConfirmOrder,
  onCancelConfirmOrder,
  confirmLoading,
  tick,
  symbolInfo,
  isFeedConnected,
}: TradingDialogContainerProps) {
  return (
    <>
      <SymbolSearchModal
        isOpen={isSymbolSearchOpen}
        onClose={onCloseSymbolSearch}
        selectedSymbol={selectedSymbol}
        onSelectSymbol={onSelectSymbol}
        initialQuery={symbolSearchInitialQuery}
        mode={symbolSearchMode}
      />
      <PositionModifyDialog
        position={modifyingPosition}
        onClose={onCloseModifyingPosition}
        onSaved={onCloseModifyingPosition}
        tick={tick}
        isFeedConnected={isFeedConnected}
      />
      <OrderModifyDialog
        order={modifyingOrder}
        onClose={onCloseModifyingOrder}
        onSaved={onCloseModifyingOrder}
        tick={tick}
      />
      <OrderConfirmDialog
        isOpen={!!confirmOrder}
        order={confirmOrder}
        onConfirm={onConfirmOrder}
        onCancel={onCancelConfirmOrder}
        tick={tick}
        symbolInfo={symbolInfo}
        loading={confirmLoading}
      />
    </>
  );
}

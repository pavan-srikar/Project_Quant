import type { PlaceOrderInput } from "../../../services/schemas.ts";

export type ConfirmableOrder = PlaceOrderInput & { _submit: () => Promise<unknown> };

export interface SymbolInfo {
  name?: string;
  description?: string;
  pipSize?: number;
  pricescale?: number;
  contractSize?: number;
  marginPercent?: number;
  commission?: number;
  [k: string]: unknown;
}

export interface OrderPanelProps {
  symbol: string;
  symbolInfo?: SymbolInfo;
  tick?: { bid: number; ask: number; timestamp: number };
  accountId: string | null;
  oneClick?: boolean;
  onToggleOneClick?: () => void;
  onConfirmOrder?: (order: ConfirmableOrder) => void;
  accountBalance?: number;
  isFeedConnected?: boolean;
  soundMuted?: boolean;
  onToggleMute?: () => void;
  onOrderSuccess?: () => void;
}

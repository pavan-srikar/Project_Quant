export interface Position {
  id: string;
  symbolName: string;
  side: string;
  quantity: number;
  entryPrice: number;
  currentPrice?: number;
  unrealizedPnl?: number;
  stopLoss?: number | null;
  takeProfit?: number | null;
  openedAt: string;
  /** Units per contract/lot. Defaults to 100000 (forex) when not provided. */
  contractSize?: number;
}

export interface PositionModifyDialogProps {
  position: Position | null;
  onClose: () => void;
  onSaved: () => void;
  tick?: { bid: number; ask: number };
  isFeedConnected?: boolean;
}

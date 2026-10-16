export interface WatchlistSymbol {
  id?: string;
  name: string;
  displayName?: string | null;
  assetClass?: string;
  category?: string;
  isActive?: boolean;
  tickSize?: number;
}

export interface WatchlistPanelProps {
  symbols: WatchlistSymbol[];
  ticks: Record<string, { bid: number; ask: number; timestamp: number }>;
  selectedSymbol: string;
  onSelect: (s: string) => void;
  onOpenSymbolSearch?: () => void;
  oneClick?: boolean;
  accountId?: string | null;
  isFeedConnected?: boolean;
}

export type ActiveTab = "watchlist" | "flagged" | "all";

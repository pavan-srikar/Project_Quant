export type SearchCategory = "all" | "crypto" | "watchlist";

export interface SymbolSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  initialQuery?: string;
  mode?: "switch" | "add_to_watchlist";
}

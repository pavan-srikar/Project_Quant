import type { CandlestickData, Time, IChartApi } from "lightweight-charts";
import type { IndicatorType } from "../../../lib/indicators.ts";
import type {
  JournalEntry,
  CreateJournalEntryInput,
  UpdateJournalEntryInput,
} from "../../../services/api/journal.ts";
import type { Account, Order, Position } from "../../../services/schemas.ts";

export type TradingActionError = {
  error?: { message?: string };
  message?: string;
};

export type AccountOption = Pick<Account, "id"> & { label?: string | null };

export { getErrorMessage } from "../../../lib/utils";

export type BottomPanelTab =
  | "positions"
  | "orders"
  | "history"
  | "journal"
  | "ai-trader"
  | "indicators";

export interface BottomPanelProps {
  tab: BottomPanelTab;
  onTabChange: (t: BottomPanelTab) => void;
  positions: Position[];
  orders: Order[];
  accountId: string | null;
  onModifyPosition?: (position: Position) => void;
  onModifyOrder?: (order: Order) => void;
  onSelectPositionSymbol?: (symbolName: string) => void;
  onSelectOrderSymbol?: (symbolName: string) => void;
  journalEntries: JournalEntry[];
  journalLoading: boolean;
  onCreateJournal: (data: CreateJournalEntryInput) => void;
  onUpdateJournal: (id: string, data: UpdateJournalEntryInput) => void;
  onDeleteJournal: (id: string) => void;
  aiTraderEnabled?: boolean;
  height?: number;
  isFeedConnected?: boolean;
  // Sub-chart indicators props
  candles?: CandlestickData<Time>[];
  activeIndicators?: IndicatorType[];
  onToggleIndicator?: (type: IndicatorType) => void;
  isDark?: boolean;
  timeframe?: string;
  mainChart?: IChartApi | null;
  // Collapsible support
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

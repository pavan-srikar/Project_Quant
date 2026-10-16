export const EMOTIONS = [
  "Calm",
  "Confident",
  "Anxious",
  "Greedy",
  "Fearful",
  "FOMO",
  "Revenge",
  "Bored",
] as const;

export type Emotion = (typeof EMOTIONS)[number];

export interface JournalEntry {
  id: string;
  accountId: string;
  positionId?: string | null;
  symbolName?: string | null;
  side?: string | null;
  entryPrice?: number | null;
  exitPrice?: number | null;
  pnl?: number | null;
  emotion?: string | null;
  rating?: number | null;
  tags: string[];
  notes: string;
  createdAt: string;
}

export interface TradeJournalPanelProps {
  entries: JournalEntry[];
  isLoading: boolean;
  accountId: string | null;
  onCreateEntry: (data: Partial<JournalEntry> & { notes: string; tags: string[] }) => void;
  onUpdateEntry: (
    id: string,
    data: Partial<JournalEntry> & { notes: string; tags: string[] },
  ) => void;
  onDeleteEntry: (id: string) => void;
}

import { useCallback } from "react";
import type {
  CreateJournalEntryInput,
  UpdateJournalEntryInput,
} from "../../services/api/journal.ts";
import {
  useCreateJournalEntry,
  useDeleteJournalEntry,
  useJournalEntries,
  useUpdateJournalEntry,
} from "../../services/queries.ts";
import { toast } from "../../services/toast.ts";
import { getErrorMessage } from "./types.ts";

export function useTradingJournal(activeAccountId: string | null) {
  const { data: journalData, isLoading: journalLoading } = useJournalEntries(activeAccountId);
  const createJournal = useCreateJournalEntry();
  const updateJournal = useUpdateJournalEntry();
  const deleteJournal = useDeleteJournalEntry();

  const handleCreateJournal = useCallback(
    (data: CreateJournalEntryInput) => {
      createJournal.mutate(data, {
        onSuccess: () => toast.success("Journal", "Entry saved"),
        onError: (err: unknown) =>
          toast.error("Journal", getErrorMessage(err) || "Failed to save"),
      });
    },
    [createJournal],
  );

  const handleUpdateJournal = useCallback(
    (id: string, data: UpdateJournalEntryInput) => {
      if (!activeAccountId) return;
      updateJournal.mutate(
        { id, accountId: activeAccountId, ...data },
        {
          onSuccess: () => toast.success("Journal", "Entry updated"),
          onError: (err: unknown) =>
            toast.error("Journal", getErrorMessage(err) || "Failed to update"),
        },
      );
    },
    [activeAccountId, updateJournal],
  );

  const handleDeleteJournal = useCallback(
    (id: string) => {
      if (!activeAccountId) return;
      deleteJournal.mutate(
        { id, accountId: activeAccountId },
        {
          onSuccess: () => toast.success("Journal", "Entry deleted"),
          onError: (err: unknown) =>
            toast.error("Journal", getErrorMessage(err) || "Failed to delete"),
        },
      );
    },
    [activeAccountId, deleteJournal],
  );

  return {
    journalEntries: (journalData as any)?.entries || [],
    journalLoading,
    handleCreateJournal,
    handleUpdateJournal,
    handleDeleteJournal,
  };
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import {
  type ChartTemplateContent,
  chartTemplatesApi,
} from "../../../services/api/chart-templates.ts";
import { toast } from "../../../services/toast.ts";
import { AUTOSAVE_DEBOUNCE_MS } from "./types";

export function useChartTemplates() {
  const queryClient = useQueryClient();
  const { data: templates = [] } = useQuery({
    queryKey: ["chart-templates"] as const,
    queryFn: () => chartTemplatesApi.list(),
    staleTime: 60_000,
    retry: 1,
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["chart-templates"] });
  const save = useMutation({
    mutationFn: (vars: { name: string; content: ChartTemplateContent }) =>
      chartTemplatesApi.save(vars.name, vars.content),
    onSuccess: invalidate,
    onError: () => toast.error("Templates", "Failed to save template"),
  });
  const remove = useMutation({
    mutationFn: (id: string) => chartTemplatesApi.remove(id),
    onSuccess: invalidate,
    onError: () => toast.error("Templates", "Failed to delete template"),
  });
  return { templates, save, remove };
}

/** Debounced autosave of the current settings into the active template. */
export function useTemplateAutosave(
  enabled: boolean,
  activeName: string,
  content: ChartTemplateContent,
  saveFn: (vars: { name: string; content: ChartTemplateContent }) => void,
): void {
  const timerRef = useRef<number | null>(null);
  // Serialise so the effect only fires on real changes, not object identity.
  const serialized = JSON.stringify(content);
  const skipFirstRef = useRef(true);

  useEffect(() => {
    if (!enabled || !activeName) return;
    if (skipFirstRef.current) {
      // Don't save the snapshot we just loaded.
      skipFirstRef.current = false;
      return;
    }
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      saveFn({ name: activeName, content: JSON.parse(serialized) as ChartTemplateContent });
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [enabled, activeName, serialized, saveFn]);

  // Re-arm the "skip first" guard whenever the active template changes.
  useEffect(() => {
    skipFirstRef.current = true;
  }, [activeName]);
}

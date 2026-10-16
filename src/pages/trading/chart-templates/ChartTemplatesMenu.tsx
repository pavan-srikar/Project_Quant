import { ChevronDown, CloudUpload, Save, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import {
  updateChartPreferences,
  useChartPreferences,
} from "../../../hooks/useChartPreferences.ts";
import type { IndicatorType } from "../../../lib/indicators.ts";
import { cn } from "@/lib/utils";
import type {
  ChartTemplate,
  ChartTemplateContent,
} from "../../../services/api/chart-templates.ts";
import { toast } from "../../../services/toast.ts";
import type { ChartTemplatesMenuProps } from "./types";
import { contentToPrefsPatch, snapshotContent } from "./templateSerializer";
import { useChartTemplates, useTemplateAutosave } from "./useChartTemplates";
import {
  AddTemplateRow,
  AutosaveRow,
  MenuRow,
  TemplateList,
} from "./TemplateList";

export function ChartTemplatesMenu(props: ChartTemplatesMenuProps) {
  const { activeIndicators, onSetIndicators, activePlugins, onSetPlugins } = props;
  const prefs = useChartPreferences();
  const { templates, save, remove } = useChartTemplates();
  const [open, setOpen] = useState(false);
  const [manageMode, setManageMode] = useState(false);

  const activeName = prefs.activeChartTemplate;
  const autosave = prefs.chartTemplateAutosave;
  const content = snapshotContent(prefs, activeIndicators, activePlugins);

  // react-query guarantees `mutate` identity is stable across renders.
  const { mutate: saveMutate } = save;
  const saveFn = useCallback(
    (vars: { name: string; content: ChartTemplateContent }) => saveMutate(vars),
    [saveMutate],
  );
  useTemplateAutosave(autosave, activeName, content, saveFn);

  const applyTemplate = (t: ChartTemplate) => {
    const c = t.panels[0];
    if (!c) return;
    updateChartPreferences({ ...contentToPrefsPatch(c), activeChartTemplate: t.name });
    onSetIndicators((c.indicators ?? []) as IndicatorType[]);
    onSetPlugins(c.plugins ?? []);
    setOpen(false);
    toast.info("Templates", `Loaded "${t.name}"`);
  };

  const addTemplate = (name: string) => {
    save.mutate({ name, content });
    updateChartPreferences({ activeChartTemplate: name });
    toast.success("Templates", `Saved "${name}"`);
  };

  const deleteTemplate = (t: ChartTemplate) => {
    remove.mutate(t.id);
    if (t.name === activeName) updateChartPreferences({ activeChartTemplate: "" });
  };

  return (
    <div className="relative hidden md:block">
      <button
        onClick={() => setOpen((v) => !v)}
        title="Chart layout templates"
        className={cn(
          "flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors",
          open ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <CloudUpload className="h-3.5 w-3.5" />
        <span className="hidden max-w-[110px] truncate lg:inline">{activeName || "Templates"}</span>
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-60 rounded-lg border border-border bg-card/95 py-1 shadow-2xl backdrop-blur-xl">
            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Layout templates
            </div>
            <AutosaveRow
              enabled={autosave}
              onToggle={() => updateChartPreferences({ chartTemplateAutosave: !autosave })}
            />
            <AddTemplateRow onAdd={addTemplate} />
            <MenuRow
              icon={<Save className="h-3.5 w-3.5" />}
              label={activeName ? `Save "${activeName}"` : "Save template"}
              disabled={!activeName || autosave}
              onClick={() => {
                save.mutate({ name: activeName, content });
                toast.success("Templates", `Saved "${activeName}"`);
              }}
            />
            <MenuRow
              icon={<Trash2 className="h-3.5 w-3.5" />}
              label={manageMode ? "Done managing" : "Manage templates…"}
              onClick={() => setManageMode((v) => !v)}
            />
            <div className="my-1 border-t border-border" />
            <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Recently used
            </div>
            <div className="max-h-48 overflow-y-auto">
              <TemplateList
                templates={templates}
                activeName={activeName}
                manageMode={manageMode}
                onApply={applyTemplate}
                onDelete={deleteTemplate}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
